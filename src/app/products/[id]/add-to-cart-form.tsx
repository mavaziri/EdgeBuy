'use client';

import { useActionState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addToCart } from '@/actions/cart.actions';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/services/products.service';

interface AddToCartFormProps {
  product: Product;
  isAuthenticated: boolean;
}

export function AddToCartForm({
  product,
  isAuthenticated,
}: AddToCartFormProps) {
  const { toast } = useToast();
  const [state, action, pending] = useActionState(addToCart, null);

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
    <form action={action} className="flex-1">
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="quantity" value="1" />
      <input type="hidden" name="price" value={product.price} />
      <input type="hidden" name="title" value={product.title} />
      <input type="hidden" name="image" value={product.image} />
      <input type="hidden" name="category" value={product.category} />
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!isAuthenticated || pending}
      >
        <ShoppingCart className="mr-2 h-5 w-5" />
        {pending ? 'Adding...' : 'Add to Cart'}
      </Button>
    </form>
  );
}
