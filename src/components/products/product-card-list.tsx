'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductCard } from './product-card';
import type { Product } from '@/services/products.service';
import { addToWishlist, removeFromWishlist } from '@/actions/wishlist.actions';

interface ProductCardListProps {
  products: Product[];
  isAuthenticated: boolean;
  initialWishlist: number[];
}

export function ProductCardList({
  products,
  isAuthenticated,
  initialWishlist,
}: ProductCardListProps) {
  const [wishlist, setWishlist] = useState<number[]>(initialWishlist);
  const router = useRouter();

  const handleWishToggle = async (productId: number): Promise<void> => {
    const product = products.find((product) => product.id === productId);
    if (!product) {
      return;
    }

    if (wishlist.includes(productId)) {
      const formData = new FormData();
      formData.append('productId', String(productId));

      await removeFromWishlist(null, formData);

      setWishlist((prev) => prev.filter((id) => id !== productId));

      router.refresh();
    } else {
      const formData = new FormData();
      formData.append('productId', String(productId));
      formData.append('title', product.title);
      formData.append('image', product.image);
      formData.append('price', String(product.price));
      formData.append('category', product.category);

      await addToWishlist(null, formData);

      setWishlist((prev) => [...prev, productId]);

      router.refresh();
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isAuthenticated={isAuthenticated}
          isWished={wishlist.includes(product.id)}
          onWishToggle={() => handleWishToggle(product.id)}
        />
      ))}
    </div>
  );
}
