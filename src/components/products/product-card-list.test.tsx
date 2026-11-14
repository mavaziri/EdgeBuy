import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { ProductCardList } from './product-card-list';

const { addToWishlist, removeFromWishlist, refresh } = vi.hoisted(() => ({
  addToWishlist: vi.fn(),
  removeFromWishlist: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock('@/actions/wishlist.actions', () => ({
  addToWishlist,
  removeFromWishlist,
}));

vi.mock('./product-card', () => ({
  ProductCard: ({ product }: { product: { title: string } }) => (
    <article>{product.title}</article>
  ),
}));

const originalAdapter = apiClient.defaults.adapter;
const PageParamsSchema = z.object({
  skip: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
});

function makeApiProduct(id: number) {
  return {
    id,
    title: `Catalog Product ${id}`,
    price: id * 12,
    description: `Description ${id}`,
    category: 'test-category',
    rating: 4.6,
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

function makeResponse(config: InternalAxiosRequestConfig, data: unknown) {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders(),
    config,
  };
}

function setPageAdapter(
  respond: (
    skip: number,
    limit: number,
    config: InternalAxiosRequestConfig,
  ) => unknown,
  onRequest?: (skip: number) => void,
): void {
  const adapter: AxiosAdapter = async (config) => {
    const { skip, limit } = PageParamsSchema.parse(config.params);
    onRequest?.(skip);
    const result = await respond(skip, limit, config);
    if (result instanceof Error) {
      throw result;
    }
    if (
      typeof result === 'object' &&
      result !== null &&
      'status' in result &&
      'data' in result &&
      typeof result.status === 'number' &&
      result.status >= 400
    ) {
      throw new AxiosError(
        'Request failed',
        AxiosError.ERR_BAD_RESPONSE,
        config,
        undefined,
        {
          ...makeResponse(config, result.data),
          status: result.status,
          statusText: 'Unavailable',
        },
      );
    }
    return makeResponse(config, result);
  };
  apiClient.defaults.adapter = adapter;
}

class MockIntersectionObserver implements IntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  readonly root: Element | Document | null = null;
  readonly rootMargin = '0px';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(private readonly callback: IntersectionObserverCallback) {
    MockIntersectionObserver.instances.push(this);
  }

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  trigger(isIntersecting = true): void {
    const target = document.createElement('div');
    const rect = target.getBoundingClientRect();
    const entry: IntersectionObserverEntry = {
      time: 0,
      target,
      rootBounds: null,
      boundingClientRect: rect,
      intersectionRect: isIntersecting ? rect : new DOMRectReadOnly(),
      isIntersecting,
      intersectionRatio: isIntersecting ? 1 : 0,
    };
    this.callback([entry], this);
  }
}

function renderProductList() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProductCardList isAuthenticated={false} initialWishlist={[]} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('product infinite scroll', () => {
  it('loads the initial page and appends the next page when the sentinel intersects', async () => {
    const offsets: number[] = [];
    setPageAdapter(
      (skip, limit) => makePage(skip, limit, 10),
      (skip) => offsets.push(skip),
    );
    renderProductList();

    expect(screen.getByRole('status')).toHaveTextContent('Loading products');
    expect(await screen.findByText('Catalog Product 1')).toBeInTheDocument();
    expect(screen.getByText('Catalog Product 5')).toBeInTheDocument();
    expect(screen.queryByText('Catalog Product 6')).not.toBeInTheDocument();
    expect(offsets).toEqual([0]);

    act(() => MockIntersectionObserver.instances.at(-1)?.trigger());

    expect(await screen.findByText('Catalog Product 6')).toBeInTheDocument();
    expect(screen.getByText('Catalog Product 10')).toBeInTheDocument();
    expect(offsets).toEqual([0, 5]);
  });

  it('prevents duplicate next-page requests while one request is pending', async () => {
    const offsets: number[] = [];
    let resolveSecondPage: (() => void) | undefined;
    setPageAdapter(
      (skip, limit) => {
        if (skip === 5) {
          return new Promise((resolve) => {
            resolveSecondPage = () => resolve(makePage(skip, limit, 10));
          });
        }
        return makePage(skip, limit, 10);
      },
      (skip) => offsets.push(skip),
    );

    renderProductList();
    expect(await screen.findByText('Catalog Product 1')).toBeInTheDocument();

    act(() => {
      const observer = MockIntersectionObserver.instances.at(-1);
      observer?.trigger();
      observer?.trigger();
    });

    await waitFor(() =>
      expect(offsets.filter((skip) => skip === 5)).toHaveLength(1),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading more products',
    );

    await act(async () => {
      resolveSecondPage?.();
    });
    expect(await screen.findByText('Catalog Product 6')).toBeInTheDocument();
    expect(offsets.filter((skip) => skip === 5)).toHaveLength(1);
  });

  it('shows the empty state when the API returns no products', async () => {
    setPageAdapter((skip, limit) => makePage(skip, limit, 0));
    renderProductList();

    expect(
      await screen.findByText('No products are available.'),
    ).toBeInTheDocument();
  });

  it('loads a partial final page and makes no requests after it', async () => {
    const offsets: number[] = [];
    setPageAdapter(
      (skip, limit) => makePage(skip, limit, 12),
      (skip) => offsets.push(skip),
    );
    renderProductList();

    expect(await screen.findByText('Catalog Product 5')).toBeInTheDocument();
    act(() => MockIntersectionObserver.instances.at(-1)?.trigger());
    expect(await screen.findByText('Catalog Product 10')).toBeInTheDocument();
    act(() => MockIntersectionObserver.instances.at(-1)?.trigger());
    expect(await screen.findByText('Catalog Product 12')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      "You've reached the end of the catalog",
    );
    expect(offsets).toEqual([0, 5, 10]);
  });

  it('preserves loaded products and exposes retry after a next-page error', async () => {
    const offsets: number[] = [];
    setPageAdapter(
      (skip, limit) => {
        if (skip === 5) {
          return { status: 503, data: { message: 'Unavailable' } };
        }
        return makePage(skip, limit, 10);
      },
      (skip) => offsets.push(skip),
    );
    renderProductList();

    expect(await screen.findByText('Catalog Product 1')).toBeInTheDocument();
    act(() => MockIntersectionObserver.instances.at(-1)?.trigger());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load more products',
    );
    expect(screen.getByText('Catalog Product 1')).toBeInTheDocument();
    expect(offsets.filter((skip) => skip === 5)).toHaveLength(1);
  });

  it('cancels the active query when the list unmounts', async () => {
    let pageSignal: InternalAxiosRequestConfig['signal'];
    setPageAdapter((skip, limit, config) => {
      if (skip === 5) {
        pageSignal = config.signal;
        return new Promise(() => undefined);
      }
      return makePage(skip, limit, 10);
    });
    const { unmount } = renderProductList();
    expect(await screen.findByText('Catalog Product 1')).toBeInTheDocument();
    act(() => MockIntersectionObserver.instances.at(-1)?.trigger());
    await waitFor(() => expect(pageSignal).toBeDefined());

    unmount();
    await waitFor(() => expect(pageSignal?.aborted).toBe(true));
  });
});
