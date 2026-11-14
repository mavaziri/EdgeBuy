'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductCard } from './product-card';
import { Button } from '@/components/ui/button';
import { useInfiniteProducts } from '@/hooks/use-infinite-products';
import { addToWishlist, removeFromWishlist } from '@/actions/wishlist.actions';

interface ProductCardListProps {
  isAuthenticated: boolean;
  initialWishlist: number[];
}

export function ProductCardList({
  isAuthenticated,
  initialWishlist,
}: ProductCardListProps) {
  const [wishlist, setWishlist] = useState<number[]>(initialWishlist);

  const router = useRouter();

  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchingNextPageRef = useRef(false);

  const productsQuery = useInfiniteProducts();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    productsQuery;

  const products = data?.pages.flatMap((page) => page.products) ?? [];

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((entry) => entry.isIntersecting) &&
          hasNextPage &&
          !isFetchingNextPage &&
          !fetchingNextPageRef.current
        ) {
          fetchingNextPageRef.current = true;
          void fetchNextPage({ cancelRefetch: false }).then(
            () => {
              fetchingNextPageRef.current = false;
            },
            () => {
              fetchingNextPageRef.current = false;
            },
          );
        }
      },
      { rootMargin: '400px 0px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleWishToggle = async (productId: number): Promise<void> => {
    const product = products.find((item) => item.id === productId);
    if (!product) {
      return;
    }

    const formData = new FormData();
    formData.append('productId', String(productId));

    if (wishlist.includes(productId)) {
      await removeFromWishlist(null, formData);

      setWishlist((current) => current.filter((id) => id !== productId));

      router.refresh();
    } else {
      formData.append('title', product.title);
      formData.append('image', product.image);
      formData.append('price', String(product.price));
      formData.append('category', product.category);

      await addToWishlist(null, formData);

      setWishlist((current) => [...current, productId]);

      router.refresh();
    }
  };

  if (productsQuery.isPending) {
    return (
      <p className="text-muted-foreground" role="status" aria-live="polite">
        Loading products...
      </p>
    );
  }

  if (productsQuery.isError && !productsQuery.data) {
    return (
      <div className="space-y-3" role="alert">
        <p className="text-destructive">Unable to load products.</p>
        <Button
          variant="outline"
          onClick={() => void productsQuery.refetch()}
          disabled={productsQuery.isFetching}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <p className="text-muted-foreground" role="status">
        No products are available.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {productsQuery.isFetchNextPageError && (
        <div
          className="flex flex-wrap items-center justify-between gap-3"
          role="alert"
        >
          <p className="text-destructive">
            Could not load more products. Loaded products remain available.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              void productsQuery.fetchNextPage({ cancelRefetch: false })
            }
          >
            Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isAuthenticated={isAuthenticated}
            isWished={wishlist.includes(product.id)}
            onWishToggle={() => void handleWishToggle(product.id)}
          />
        ))}
      </div>

      {productsQuery.hasNextPage ? (
        <div
          ref={sentinelRef}
          className="flex min-h-12 items-center justify-center"
        >
          {productsQuery.isFetchingNextPage && (
            <p
              className="text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              Loading more products...
            </p>
          )}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground" role="status">
          You&apos;ve reached the end of the catalog.
        </p>
      )}
    </div>
  );
}
