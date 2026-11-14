import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { appApiClient } from '@/lib/api-client';
import {
  CURRENT_PROFILE_STALE_TIME,
  currentProfileQueryKey,
  useCurrentProfile,
} from '@/hooks/use-current-profile';
import { CurrentProfile } from './current-profile';

const originalAdapter = appApiClient.defaults.adapter;

const profile = {
  id: 'user-1',
  name: 'Taylor Shopper',
  email: 'taylor@example.com',
  image: null,
  createdAt: '2025-01-02T03:04:05.000Z',
  updatedAt: '2025-02-03T04:05:06.000Z',
};

function makeResponse(
  config: InternalAxiosRequestConfig,
  data: unknown,
): AxiosResponse<unknown> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders(),
    config,
  };
}

function renderWithQueryClient(children: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  );
  return { ...result, queryClient };
}

function ProfileEmailConsumer() {
  const { data } = useCurrentProfile();
  return <p>{data?.email ?? 'Waiting for shared profile'}</p>;
}

afterEach(() => {
  appApiClient.defaults.adapter = originalAdapter;
});

describe('current profile query', () => {
  it('shows loading and then shares one fetched profile across consumers', async () => {
    let resolveResponse:
      | ((response: AxiosResponse<unknown>) => void)
      | undefined;
    let requestConfig: InternalAxiosRequestConfig | undefined;
    let requestCount = 0;
    const adapter: AxiosAdapter = (config) => {
      requestCount += 1;
      requestConfig = config;
      return new Promise<AxiosResponse<unknown>>((resolve) => {
        resolveResponse = resolve;
      });
    };
    appApiClient.defaults.adapter = adapter;

    renderWithQueryClient(
      <>
        <CurrentProfile />
        <ProfileEmailConsumer />
      </>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading your profile',
    );

    await act(async () => {
      if (!resolveResponse || !requestConfig) {
        throw new Error('Profile request did not start');
      }
      resolveResponse(makeResponse(requestConfig, profile));
    });

    expect(await screen.findAllByText('Taylor Shopper')).toHaveLength(2);
    expect(screen.getAllByText('taylor@example.com')).toHaveLength(3);
    expect(requestCount).toBe(1);
  });

  it('renders an error state and allows a retry', async () => {
    let requestCount = 0;
    const adapter: AxiosAdapter = (config) => {
      requestCount += 1;
      if (requestCount === 1) {
        return Promise.reject(
          new AxiosError('Profile unavailable', undefined, config),
        );
      }
      return Promise.resolve(makeResponse(config, profile));
    };
    appApiClient.defaults.adapter = adapter;

    renderWithQueryClient(<CurrentProfile />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load your profile',
    );
    await act(async () => {
      screen.getByRole('button', { name: 'Retry' }).click();
    });

    expect(await screen.findAllByText('Taylor Shopper')).toHaveLength(2);
    expect(requestCount).toBe(2);
  });

  it('uses the stable profile key and a five-minute stale window', () => {
    expect(currentProfileQueryKey).toEqual(['profile', 'current']);
    expect(CURRENT_PROFILE_STALE_TIME).toBe(5 * 60 * 1000);
  });
});
