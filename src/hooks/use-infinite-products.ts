'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import {
  ApiServiceFactory,
  getNextProductOffset,
  PRODUCTS_PER_PAGE,
} from '@/services/products.service';

export const infiniteProductsQueryKey = ['products', 'infinite'] as const;

export function useInfiniteProducts() {
  const productsService = ApiServiceFactory.getProductsService();

  return useInfiniteQuery({
    queryKey: infiniteProductsQueryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      productsService.getProductsPage(pageParam, PRODUCTS_PER_PAGE, signal),
    getNextPageParam: getNextProductOffset,
    staleTime: 5 * 60 * 1000,
  });
}
