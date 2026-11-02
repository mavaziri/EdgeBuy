'use server';

import { auth } from '@/auth';
import { WishlistServiceFactory } from '@/services/wishlist.service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionResult } from '@/types/common.types';

const wishlistService = WishlistServiceFactory.getWishlistService();

const wishlistItemSchema = z.object({
  productId: z.number(),
  title: z.string(),
  image: z.string(),
  price: z.number(),
  category: z.string(),
});

export async function addToWishlist(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        message: 'You must be logged in to add items to wishlist',
      };
    }

    const rawData = {
      productId: Number(formData.get('productId')),
      title: String(formData.get('title')),
      image: String(formData.get('image')),
      price: Number(formData.get('price')),
      category: String(formData.get('category')),
    };

    const validatedData = wishlistItemSchema.parse(rawData);

    await wishlistService.addItem(session.user.id, validatedData);

    revalidatePath('/wishlist');

    revalidatePath('/');

    return {
      success: true,
      message: 'Item added to wishlist successfully',
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
      message: 'Failed to add item to wishlist',
    };
  }
}

export async function removeFromWishlist(
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

    await wishlistService.removeItem(session.user.id, productId);

    revalidatePath('/wishlist');

    revalidatePath('/');

    return {
      success: true,
      message: 'Item removed from wishlist',
    };
  } catch {
    return {
      success: false,
      message: 'Failed to remove item',
    };
  }
}
