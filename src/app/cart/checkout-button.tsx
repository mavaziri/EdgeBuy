'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createOrderFromCart } from '@/actions/order.actions';
import { useToast } from '@/hooks/use-toast';

export function CheckoutButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [state, action, pending] = useActionState(createOrderFromCart, null);

  useEffect(() => {
    if (state?.success && state.data) {
      toast({
        title: 'Success',
        description: state.message,
      });
      router.push(`/orders/${state.data.orderId}`);
    } else if (state?.success === false) {
      toast({
        title: 'Error',
        description: state.message,
        variant: 'destructive',
      });
    }
  }, [state, toast, router]);

  return (
    <form action={action}>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Processing...' : 'Proceed to Checkout'}
      </Button>
    </form>
  );
}
