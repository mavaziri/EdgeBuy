'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Product } from '@/services/products.service';
import { useActionState, useEffect } from 'react';
import { addToCart } from '@/actions/cart.actions';
import { useToast } from '@/hooks/use-toast';

interface ProductCardProps {
  product: Product;
  isAuthenticated: boolean;
  isWished: boolean;
  onWishToggle: () => void;
}

export function ProductCard({
  product,
  isAuthenticated,
  isWished,
  onWishToggle,
}: ProductCardProps) {
  const { toast } = useToast();
  const [cartState, cartAction, cartPending] = useActionState(addToCart, null);

  useEffect(() => {
    if (cartState?.success) {
      toast({
        title: 'Success',
        description: cartState.message,
      });
    } else if (cartState?.success === false) {
      toast({
        title: 'Error',
        description: cartState.message,
        variant: 'destructive',
      });
    }
  }, [cartState, toast]);

  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg flex flex-col h-full">
      <Link href={`/products/${product.id}`}>
        <CardHeader className="p-0">
          <div className="relative aspect-square overflow-hidden bg-muted">
            <Image
              src={product.image}
              alt={product.title}
              fill
              className="object-contain p-4 transition-transform hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        </CardHeader>
      </Link>

      <CardContent className="p-4 flex-1">
        <div className="mb-2 text-xs text-muted-foreground capitalize">
          {product.category}
        </div>
        <CardTitle className="line-clamp-2 text-base mb-2 min-h-[3rem]">
          {product.title}
        </CardTitle>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">
            ${product.price.toFixed(2)}
          </span>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>⭐ {product.rating.rate}</span>
            <span>({product.rating.count})</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex gap-2">
        <form action={cartAction} className="flex-1">
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="quantity" value="1" />
          <input type="hidden" name="price" value={product.price} />
          <input type="hidden" name="title" value={product.title} />
          <input type="hidden" name="image" value={product.image} />
          <input type="hidden" name="category" value={product.category} />
          <Button
            type="submit"
            className="w-full"
            disabled={!isAuthenticated || cartPending}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {cartPending ? 'Adding...' : 'Add to Cart'}
          </Button>
        </form>

        <Button
          variant="outline"
          size="icon"
          disabled={!isAuthenticated}
          onClick={onWishToggle}
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              isWished
                ? 'text-pink-500 fill-pink-500 drop-shadow-[0_0_2px_rgba(255,0,128,0.4)]'
                : 'text-muted-foreground'
            }`}
            fill={isWished ? 'currentColor' : 'none'}
          />
        </Button>
      </CardFooter>
    </Card>
  );
}
