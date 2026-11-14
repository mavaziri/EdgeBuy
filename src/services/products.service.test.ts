import assert from 'node:assert/strict';
import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios';
import { z } from 'zod';
import { afterEach, test } from 'vitest';
import { apiClient } from '@/lib/api-client';
import {
  ApiError,
  ApiServiceFactory,
  getNextProductOffset,
  type ProductBatch,
} from './products.service';
import { iterateProductBatchInsights } from './product-processing.service';

const originalAdapter = apiClient.defaults.adapter;
const PaginationParamsSchema = z.object({
  skip: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
});

function makeApiProduct(id: number) {
  return {
    id,
    title: `Product ${id}`,
    price: id * 10,
    description: `Description ${id}`,
    category: 'test-category',
    rating: id % 2 === 0 ? 4.8 : 3.5,
    reviews: [{ rating: 5 }],
    thumbnail: `https://cdn.dummyjson.com/products/images/${id}/thumbnail.png`,
  };
}

function makePage(skip: number, limit: number, total: number) {
  const returnedLimit = Math.min(limit, Math.max(total - skip, 0));
  return {
    products: Array.from({ length: returnedLimit }, (_, index) =>
      makeApiProduct(skip + index + 1),
    ),
    total,
    skip,
    limit: returnedLimit,
  };
}

function setAdapter(
  handler: (
    config: InternalAxiosRequestConfig,
  ) =>
    | Promise<{ data: unknown; status?: number }>
    | { data: unknown; status?: number },
): void {
  const adapter: AxiosAdapter = async (config) => {
    const result = await handler(config);
    const status = result.status ?? 200;
    const response = {
      data: result.data,
      status,
      statusText: status === 200 ? 'OK' : 'Unavailable',
      headers: new AxiosHeaders(),
      config,
    };

    if (status >= 400) {
      throw new AxiosError(
        'Request failed',
        AxiosError.ERR_BAD_RESPONSE,
        config,
        undefined,
        response,
      );
    }

    return response;
  };

  apiClient.defaults.adapter = adapter;
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  ApiServiceFactory.resetInstance();
});

test('calculates the next offset from actual page metadata', () => {
  const firstPage: ProductBatch = {
    products: Array.from({ length: 5 }, (_, index) => ({
      id: index + 1,
      title: 'Product',
      price: 10,
      description: '',
      category: 'test',
      image: 'https://example.com/product.png',
      rating: { rate: 4, count: 1 },
    })),
    total: 12,
    skip: 0,
    limit: 5,
  };
  const finalPage: ProductBatch = {
    ...firstPage,
    products: firstPage.products.slice(0, 2),
    skip: 10,
    limit: 2,
  };

  assert.equal(getNextProductOffset(firstPage), 5);
  assert.equal(getNextProductOffset(finalPage), undefined);
  assert.equal(
    getNextProductOffset({ ...firstPage, products: [], skip: 5 }),
    undefined,
  );
});

test('yields each processed batch before requesting the following page', async () => {
  const requestedOffsets: number[] = [];
  setAdapter((config) => {
    const { skip, limit } = PaginationParamsSchema.parse(config.params);
    requestedOffsets.push(skip);
    return { data: makePage(skip, limit, 12) };
  });

  const batches = iterateProductBatchInsights(5);
  const first = await batches.next();
  assert.equal(first.done, false);
  if (first.done) assert.fail('Expected first analysis batch');
  assert.equal(first.value.skip, 0);
  assert.equal(first.value.processedCount, 5);
  assert.equal(first.value.averagePrice, 30);
  assert.equal(first.value.underFiftyCount, 4);
  assert.equal(first.value.highlyRatedCount, 2);
  assert.deepEqual(requestedOffsets, [0]);

  const second = await batches.next();
  assert.equal(second.done, false);
  if (second.done) assert.fail('Expected second analysis batch');
  assert.equal(second.value.skip, 5);
  assert.equal(second.value.processedCount, 5);
  assert.deepEqual(requestedOffsets, [0, 5]);

  const last = await batches.next();
  assert.equal(last.done, false);
  if (last.done) assert.fail('Expected final partial analysis batch');
  assert.equal(last.value.skip, 10);
  assert.equal(last.value.processedCount, 2);
  assert.equal(last.value.total, 12);
  assert.deepEqual(requestedOffsets, [0, 5, 10]);
  assert.equal(await batches.next().then((result) => result.done), true);
});

test('stops cleanly when the API returns an empty page', async () => {
  const requestedOffsets: number[] = [];
  setAdapter((config) => {
    const { skip } = PaginationParamsSchema.parse(config.params);
    requestedOffsets.push(skip);
    return { data: { products: [], total: 12, skip, limit: 0 } };
  });

  const batches = iterateProductBatchInsights(5);
  assert.equal((await batches.next()).done, true);
  assert.deepEqual(requestedOffsets, [0]);
});

test('early return prevents subsequent page requests', async () => {
  const requestedOffsets: number[] = [];
  setAdapter((config) => {
    const { skip, limit } = PaginationParamsSchema.parse(config.params);
    requestedOffsets.push(skip);
    return { data: makePage(skip, limit, 12) };
  });

  const batches = iterateProductBatchInsights(5);
  const first = await batches.next();
  assert.equal(first.done, false);
  await batches.return();
  assert.deepEqual(requestedOffsets, [0]);
});

test('propagates a later request failure after yielding prior results', async () => {
  setAdapter((config) => {
    const { skip, limit } = PaginationParamsSchema.parse(config.params);
    return {
      data: makePage(skip, limit, 12),
      status: skip === 5 ? 503 : 200,
    };
  });

  const batches = iterateProductBatchInsights(5);
  const first = await batches.next();
  assert.equal(first.done, false);
  if (first.done) assert.fail('Expected first analysis batch');
  assert.equal(first.value.processedCount, 5);

  await assert.rejects(batches.next(), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.statusCode, 503);
    return true;
  });
});

test('cancellation stops an in-flight Axios request', async () => {
  const controller = new AbortController();
  let observedSignal: AbortSignal | undefined;
  const adapter: AxiosAdapter = (config) => {
    if (config.signal instanceof AbortSignal) {
      observedSignal = config.signal;
    }
    return new Promise((resolve) => {
      observedSignal?.addEventListener(
        'abort',
        () =>
          resolve({
            data: makePage(0, 5, 10),
            status: 200,
            statusText: 'OK',
            headers: new AxiosHeaders(),
            config,
          }),
        { once: true },
      );
    });
  };
  apiClient.defaults.adapter = adapter;

  const batches = iterateProductBatchInsights(5, controller.signal);
  const pendingBatch = batches.next();
  assert.equal(observedSignal, controller.signal);
  controller.abort();
  await assert.rejects(pendingBatch, (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal(error.name, 'CanceledError');
    return true;
  });
});
