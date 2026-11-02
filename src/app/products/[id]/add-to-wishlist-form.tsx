'use client';

import { useActionState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addToWishlist } from '@/actions/wishlist.actions';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/services/products.service';

interface AddToWishlistFormProps {
  product: Product;
  isAuthenticated: boolean;
}

export function AddToWishlistForm({
  product,
  isAuthenticated,
}: AddToWishlistFormProps) {
  const { toast } = useToast();
  const [state, action, pending] = useActionState(addToWishlist, null);

  useEffect(() => {
    if (state?.success) {
      toast({
        title: 'Success',
        description: state.message,
      });
    } else if (state?.success === false) {
      toast({
        title: 'Error',
        description: state.message,
        variant: 'destructive',
      });
    }
  }, [state, toast]);

  return (
    <form action={action}>
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="title" value={product.title} />
      <input type="hidden" name="image" value={product.image} />
      <input type="hidden" name="price" value={product.price} />
      <input type="hidden" name="category" value={product.category} />
      <Button
        type="submit"
        variant="outline"
        size="lg"
        disabled={!isAuthenticated || pending}
      >
        <Heart className="mr-2 h-5 w-5" />
        {pending ? 'Adding...' : 'Wishlist'}
      </Button>
    </form>
  );
}
