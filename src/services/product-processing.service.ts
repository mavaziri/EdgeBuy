import { ApiServiceFactory, type Product } from '@/services/products.service';

export interface ProductBatchInsight {
  skip: number;
  processedCount: number;
  total: number;
  averagePrice: number;
  underFiftyCount: number;
  highlyRatedCount: number;
}

function summarizeBatch(
  products: Product[],
  skip: number,
  total: number,
): ProductBatchInsight {
  const totalPrice = products.reduce((sum, product) => sum + product.price, 0);

  return {
    skip,
    processedCount: products.length,
    total,
    averagePrice: totalPrice / products.length,
    underFiftyCount: products.filter((product) => product.price < 50).length,
    highlyRatedCount: products.filter((product) => product.rating.rate >= 4.5)
      .length,
  };
}

/** Fetches, summarizes, and yields each product batch before requesting the next. */
export async function* iterateProductBatchInsights(
  pageSize = 25,
  signal?: AbortSignal,
): AsyncGenerator<ProductBatchInsight, void, unknown> {
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new RangeError('Page size must be a positive integer');
  }

  const productsService = ApiServiceFactory.getProductsService();
  let skip = 0;
  let total = Number.POSITIVE_INFINITY;

  while (skip < total) {
    if (signal?.aborted) {
      return;
    }

    const batch = await productsService.getProductsPage(skip, pageSize, signal);
    if (signal?.aborted) {
      return;
    }

    if (batch.skip !== skip || batch.limit !== batch.products.length) {
      throw new Error('Product API returned an unexpected batch offset');
    }

    if (batch.products.length === 0) {
      return;
    }

    yield summarizeBatch(batch.products, skip, batch.total);

    skip += batch.limit;
    total = batch.total;
  }
}
