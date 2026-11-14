import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { ApiServiceFactory } from '@/services/products.service';
import { ProductProcessingPanel } from './product-processing-panel';

const originalAdapter = apiClient.defaults.adapter;
const PageParamsSchema = z.object({
  skip: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
});

function makeProduct(id: number) {
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
      makeProduct(skip + index + 1),
    ),
    total,
    skip,
    limit: returnedLimit,
  };
}

function successResponse(config: InternalAxiosRequestConfig, data: unknown) {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders(),
    config,
  };
}

function renderPanel() {
  return render(<ProductProcessingPanel />);
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  ApiServiceFactory.resetInstance();
});

describe('product batch processing panel', () => {
  it('shows progress from a completed batch and cancels the outstanding request', async () => {
    let nextPageSignal: InternalAxiosRequestConfig['signal'];
    const requestedOffsets: number[] = [];
    const adapter: AxiosAdapter = async (config) => {
      const { skip, limit } = PageParamsSchema.parse(config.params);
      requestedOffsets.push(skip);
      if (skip === 25) {
        nextPageSignal = config.signal;
        return new Promise(() => undefined);
      }
      return successResponse(config, makePage(skip, limit, 40));
    };
    apiClient.defaults.adapter = adapter;

    renderPanel();
    await act(async () => {
      screen.getByRole('button', { name: 'Analyze catalog' }).click();
    });

    expect(
      await screen.findByText(/Processed 25 of 40 products/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Batch 1: 25 products/)).toBeInTheDocument();
    expect(requestedOffsets).toEqual([0, 25]);

    act(() => screen.getByRole('button', { name: 'Cancel' }).click());

    expect(screen.getByRole('status')).toHaveTextContent(
      'Analysis cancelled after 25 products',
    );
    await waitFor(() => expect(nextPageSignal?.aborted).toBe(true));
    expect(screen.getByText(/Batch 1: 25 products/)).toBeInTheDocument();
  });

  it('retains completed summaries when a later batch fails', async () => {
    const adapter: AxiosAdapter = async (config) => {
      const { skip, limit } = PageParamsSchema.parse(config.params);
      if (skip === 25) {
        throw new AxiosError(
          'Service unavailable',
          AxiosError.ERR_BAD_RESPONSE,
          config,
          undefined,
          {
            data: { message: 'Unavailable' },
            status: 503,
            statusText: 'Unavailable',
            headers: new AxiosHeaders(),
            config,
          },
        );
      }
      return successResponse(config, makePage(skip, limit, 40));
    };
    apiClient.defaults.adapter = adapter;

    renderPanel();
    act(() => screen.getByRole('button', { name: 'Analyze catalog' }).click());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Completed batch results are retained',
    );
    expect(screen.getByText(/Batch 1: 25 products/)).toBeInTheDocument();
  });

  it('shows completion when the dataset fits in one page', async () => {
    const adapter: AxiosAdapter = async (config) => {
      const { skip, limit } = PageParamsSchema.parse(config.params);
      return successResponse(config, makePage(skip, limit, 10));
    };
    apiClient.defaults.adapter = adapter;

    renderPanel();
    act(() => screen.getByRole('button', { name: 'Analyze catalog' }).click());

    expect(
      await screen.findByText(
        'Analysis complete: 10 of 10 products processed.',
      ),
    ).toBeInTheDocument();
  });
});
