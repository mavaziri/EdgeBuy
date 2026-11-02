'use server';

import { auth } from '@/auth';
import { OrderServiceFactory } from '@/services/order.service';
import { CartServiceFactory } from '@/services/cart.service';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ActionResult } from '@/types/common.types';

const orderService = OrderServiceFactory.getOrderService();
const cartService = CartServiceFactory.getCartService();

export async function createOrderFromCart(): Promise<
  ActionResult<{ orderId: string }>
> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        message: 'You must be logged in to place an order',
      };
    }

    const cart = await cartService.getCart(session.user.id);

    if (cart.items.length === 0) {
      return {
        success: false,
        message: 'Your cart is empty',
      };
    }

    const order = await orderService.createOrder({
      userId: session.user.id,
      items: cart.items,
      total: cart.total,
    });

    await cartService.clearCart(session.user.id);

    revalidatePath('/cart');
    revalidatePath('/orders');

    return {
      success: true,
      message: 'Order placed successfully',
      data: { orderId: order.id },
    };
  } catch {
    return {
      success: false,
      message: 'Failed to create order',
    };
  }
}

export async function createOrderAndRedirect(): Promise<void> {
  const result = await createOrderFromCart();

  if (result.success && result.data) {
    redirect(`/orders/${result.data.orderId}`);
  }
}
