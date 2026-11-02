'use server';

import { auth } from '@/auth';
import { CartServiceFactory } from '@/services/cart.service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/types/common.types';

const cartService = CartServiceFactory.getCartService();

const addToCartSchema = z.object({
  productId: z.number(),
  quantity: z.number().min(1),
  price: z.number(),
  title: z.string(),
  image: z.string(),
  category: z.string(),
});

const updateQuantitySchema = z.object({
  productId: z.number(),
  quantity: z.number().min(0),
});

export async function addToCart(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        message: 'You must be logged in to add items to cart',
      };
    }

    const rawData = {
      productId: Number(formData.get('productId')),
      quantity: Number(formData.get('quantity')),
      price: Number(formData.get('price')),
      title: String(formData.get('title')),
      image: String(formData.get('image')),
      category: String(formData.get('category')),
    };

    const validatedData = addToCartSchema.parse(rawData);

    await cartService.addItem(session.user.id, validatedData);

    revalidatePath('/cart');

    revalidatePath('/');

    return {
      success: true,
      message: 'Item added to cart successfully',
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: 'Invalid data provided',
      };
    }

    return {
      success: false,
      message: 'Failed to add item to cart',
    };
  }
}

export async function updateCartItemQuantity(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        message: 'You must be logged in',
      };
    }

    const rawData = {
      productId: Number(formData.get('productId')),
      quantity: Number(formData.get('quantity')),
    };

    const validatedData = updateQuantitySchema.parse(rawData);

    await cartService.updateItemQuantity(
      session.user.id,
      validatedData.productId,
      validatedData.quantity
    );

    revalidatePath('/cart');

    return {
      success: true,
      message: 'Cart updated successfully',
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: 'Invalid data provided',
      };
    }

    return {
      success: false,
      message: 'Failed to update cart',
    };
  }
}

export async function removeFromCart(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        message: 'You must be logged in',
      };
    }

    const productId = Number(formData.get('productId'));

    await cartService.removeItem(session.user.id, productId);

    revalidatePath('/cart');

    return {
      success: true,
      message: 'Item removed from cart',
    };
  } catch {
    return {
      success: false,
      message: 'Failed to remove item',
    };
  }
}

export async function clearCart(): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        message: 'You must be logged in',
      };
    }

    await cartService.clearCart(session.user.id);

    revalidatePath('/cart');

    return {
      success: true,
      message: 'Cart cleared successfully',
    };
  } catch {
    return {
      success: false,
      message: 'Failed to clear cart',
    };
  }
}
