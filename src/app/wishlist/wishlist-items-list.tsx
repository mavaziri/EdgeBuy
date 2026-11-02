'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Trash2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useActionState, useEffect } from 'react';
import { removeFromWishlist } from '@/actions/wishlist.actions';
import { addToCart } from '@/actions/cart.actions';
import { useToast } from '@/hooks/use-toast';

interface WishlistItem {
  id: string;
  productId: number;
  title: string;
  image: string;
  price: number;
  category: string;
}

interface WishlistItemsListProps {
  items: WishlistItem[];
}

export function WishlistItemsList({ items }: WishlistItemsListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <WishlistItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function WishlistItemCard({ item }: { item: WishlistItem }) {
  const { toast } = useToast();
  const [removeState, removeAction, removePending] = useActionState(
    removeFromWishlist,
    null
  );
  const [cartState, cartAction, cartPending] = useActionState(addToCart, null);

  useEffect(() => {
    if (removeState?.success) {
      toast({
        title: 'Success',
        description: removeState.message,
      });
    } else if (removeState?.success === false) {
      toast({
        title: 'Error',
        description: removeState.message,
        variant: 'destructive',
      });
    }
  }, [removeState, toast]);

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
    <Card className="overflow-hidden">
      <Link href={`/products/${item.productId}`}>
        <div className="relative aspect-square bg-muted">
          <Image
            src={item.image}
            alt={item.title}
            fill
            className="object-contain p-4"
          />
        </div>
      </Link>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground capitalize mb-2">
          {item.category}
        </p>
        <h3 className="font-semibold line-clamp-2 mb-2">{item.title}</h3>
        <p className="text-xl font-bold text-primary mb-4">
          ${item.price.toFixed(2)}
        </p>

        <div className="flex gap-2">
          <form action={cartAction} className="flex-1">
            <input type="hidden" name="productId" value={item.productId} />
            <input type="hidden" name="quantity" value="1" />
            <input type="hidden" name="price" value={item.price} />
            <input type="hidden" name="title" value={item.title} />
            <input type="hidden" name="image" value={item.image} />
            <input type="hidden" name="category" value={item.category} />
            <Button
              type="submit"
              className="w-full"
              size="sm"
              disabled={cartPending}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {cartPending ? 'Adding...' : 'Add to Cart'}
            </Button>
          </form>

          <form action={removeAction}>
            <input type="hidden" name="productId" value={item.productId} />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={removePending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
