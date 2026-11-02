'use client';

import Image from 'next/image';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useActionState, useEffect } from 'react';
import { updateCartItemQuantity, removeFromCart } from '@/actions/cart.actions';
import { useToast } from '@/hooks/use-toast';

interface CartItem {
  id: string;
  productId: number;
  quantity: number;
  price: number;
  title: string;
  image: string;
  category: string;
}

interface CartItemsListProps {
  items: CartItem[];
}

export function CartItemsList({ items }: CartItemsListProps) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <CartItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function CartItemCard({ item }: { item: CartItem }) {
  const { toast } = useToast();
  const [updateState, updateAction, updatePending] = useActionState(
    updateCartItemQuantity,
    null
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeFromCart,
    null
  );

  useEffect(() => {
    if (updateState?.success === false) {
      toast({
        title: 'Error',
        description: updateState.message,
        variant: 'destructive',
      });
    }
  }, [updateState, toast]);

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

  const handleQuantityChange = async (newQuantity: number) => {
    const formData = new FormData();
    formData.append('productId', item.productId.toString());
    formData.append('quantity', newQuantity.toString());

    updateAction(formData);
  };

  // const handleRemove = async () => {
  //   const formData = new FormData();
  //   formData.append('productId', item.productId.toString());

  //   removeAction(formData);
  // };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="relative h-24 w-24 flex-shrink-0 bg-muted rounded-md overflow-hidden">
            <Image
              src={item.image}
              alt={item.title}
              fill
              className="object-contain p-2"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold line-clamp-2 mb-1">{item.title}</h3>
            <p className="text-sm text-muted-foreground capitalize mb-2">
              {item.category}
            </p>
            <p className="text-lg font-bold text-primary">
              ${item.price.toFixed(2)}
            </p>
          </div>

          <div className="flex flex-col items-end justify-between">
            <form action={removeAction}>
              <input type="hidden" name="productId" value={item.productId} />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                disabled={removePending}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  handleQuantityChange(Math.max(1, item.quantity - 1))
                }
                disabled={updatePending || item.quantity <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center font-medium">
                {item.quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleQuantityChange(item.quantity + 1)}
                disabled={updatePending}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <div className="text-sm font-semibold">
              ${(item.price * item.quantity).toFixed(2)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
