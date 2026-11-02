// FakeStore API types and service
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

export interface Category {
  name: string;
  slug: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    override cause?: unknown
  ) {
    super(message);

    this.name = 'ApiError';
  }
}

export interface IProductsService {
  getAllProducts(): Promise<Product[]>;
  getProductById(id: number): Promise<Product>;
  getProductsByCategory(category: string): Promise<Product[]>;
  getCategories(): Promise<string[]>;
}

class FakeStoreApiService implements IProductsService {
  private readonly baseUrl = 'https://fakestoreapi.com';

  private async fetch<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        next: { revalidate: 3600 }, // Cache for 1 hour
      });

      if (!response.ok) {
        throw new ApiError(`Failed to fetch ${endpoint}`, response.status);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(`Network error fetching ${endpoint}`, 500, error);
    }
  }

  async getAllProducts(): Promise<Product[]> {
    return this.fetch<Product[]>('/products');
  }

  async getProductById(id: number): Promise<Product> {
    return this.fetch<Product>(`/products/${id}`);
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return this.fetch<Product[]>(`/products/category/${category}`);
  }

  async getCategories(): Promise<string[]> {
    return this.fetch<string[]>('/products/categories');
  }
}

// Factory pattern for API service
export class ApiServiceFactory {
  private static instance: IProductsService | null = null;

  static getProductsService(): IProductsService {
    if (!this.instance) {
      this.instance = new FakeStoreApiService();
    }

    return this.instance;
  }

  static resetInstance(): void {
    this.instance = null;
  }
}
