import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { z } from 'zod';
import { apiClient, legacyApiClient } from '@/lib/api-client';

const LEGACY_PRODUCT_ID_OFFSET = 1_000_000;

export const PRODUCTS_PER_PAGE = 5;

export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: {
    rate: number;
    count: number;
  };
}
export interface ProductBatch {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
}

export function getNextProductOffset(page: ProductBatch): number | undefined {
  if (page.limit === 0 || page.products.length === 0) {
    return undefined;
  }

  const nextOffset = page.skip + page.limit;
  return nextOffset < page.total ? nextOffset : undefined;
}

export interface Category {
  name: string;
  slug: string;
}

const DummyJsonProductSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  price: z.number().nonnegative(),
  description: z.string(),
  category: z.string(),
  rating: z.number().min(0).max(5),
  reviews: z.array(z.object({ rating: z.number() })).default([]),
  thumbnail: z.string().url(),
});

const DummyJsonProductBatchSchema = z.object({
  products: z.array(DummyJsonProductSchema),
  total: z.number().int().nonnegative(),
  skip: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
});

const LegacyFakeStoreProductSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  price: z.number().nonnegative(),
  description: z.string(),
  category: z.string(),
  image: z.string().url(),
  rating: z
    .object({
      rate: z.number(),
      count: z.number().int().nonnegative(),
    })
    .optional(),
});

type DummyJsonProduct = z.input<typeof DummyJsonProductSchema>;

function mapDummyJsonProduct(product: DummyJsonProduct): Product {
  return {
    id: product.id + LEGACY_PRODUCT_ID_OFFSET,
    title: product.title,
    price: product.price,
    description: product.description,
    category: product.category,
    image: product.thumbnail,
    rating: {
      rate: product.rating,
      count: product.reviews?.length ?? 0,
    },
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    override cause?: unknown,
  ) {
    super(message);

    this.name = 'ApiError';
  }
}

export interface IProductsService {
  getProductsPage(
    skip: number,
    limit: number,
    signal?: AbortSignal,
  ): Promise<ProductBatch>;
  getProductById(id: number): Promise<Product>;
  getProductsByCategory(category: string): Promise<Product[]>;
  getCategories(): Promise<string[]>;
}

class DummyJsonApiService implements IProductsService {
  private async getValidatedJson<T>(
    client: AxiosInstance,
    path: string,
    schema: z.ZodType<T>,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    let payload: unknown;

    try {
      const response = await client.get<unknown>(path, config);
      payload = response.data;
    } catch (error) {
      if (axios.isCancel(error)) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        throw new ApiError(
          `Failed to fetch ${path}`,
          error.response?.status ?? 500,
          error,
        );
      }

      throw new ApiError(`Network error fetching ${path}`, 500, error);
    }

    const result = schema.safeParse(payload);
    if (!result.success) {
      throw new ApiError(
        `Invalid API response from ${path}`,
        502,
        result.error,
      );
    }

    return result.data;
  }

  async getProductsPage(
    skip: number,
    limit: number,
    signal?: AbortSignal,
  ): Promise<ProductBatch> {
    if (!Number.isInteger(skip) || skip < 0) {
      throw new RangeError('Skip must be a non-negative integer');
    }

    if (!Number.isInteger(limit) || limit <= 0) {
      throw new RangeError('Limit must be a positive integer');
    }

    const page = await this.getValidatedJson(
      apiClient,
      '/products',
      DummyJsonProductBatchSchema,
      { params: { limit, skip }, signal },
    );

    if (
      page.skip !== skip ||
      page.limit > limit ||
      page.products.length !== page.limit ||
      skip + page.limit > page.total
    ) {
      throw new ApiError('Product API returned an unexpected page', 502);
    }

    const currentPageProducts = {
      ...page,
      products: page.products.map(mapDummyJsonProduct),
    };

    return currentPageProducts;
  }

  async getProductById(id: number): Promise<Product> {
    if (id >= LEGACY_PRODUCT_ID_OFFSET) {
      const product = await this.getValidatedJson(
        apiClient,
        `/products/${id - LEGACY_PRODUCT_ID_OFFSET}`,
        DummyJsonProductSchema,
      );

      return mapDummyJsonProduct(product);
    }

    const product = await this.getValidatedJson(
      legacyApiClient,
      `/products/${id}`,
      LegacyFakeStoreProductSchema,
    );

    return {
      ...product,
      rating: product.rating ?? { rate: 0, count: 0 },
    };
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    const page = await this.getValidatedJson(
      apiClient,
      `/products/category/${encodeURIComponent(category)}`,
      DummyJsonProductBatchSchema,
      { params: { limit: 0 } },
    );

    return page.products.map(mapDummyJsonProduct);
  }

  async getCategories(): Promise<string[]> {
    return this.getValidatedJson(
      apiClient,
      '/products/category-list',
      z.array(z.string()),
    );
  }
}

// Factory pattern for API service
export class ApiServiceFactory {
  private static instance: IProductsService | null = null;

  static getProductsService(): IProductsService {
    if (!this.instance) {
      this.instance = new DummyJsonApiService();
    }

    return this.instance;
  }

  static resetInstance(): void {
    this.instance = null;
  }
}
