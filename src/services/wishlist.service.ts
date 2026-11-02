import { db } from '@/lib/prisma';
import { eventBus, EVENTS } from '@/lib/events';
import type {
  WishlistItemAddedPayload,
  WishlistItemRemovedPayload,
} from '@/lib/events';

export interface WishlistItemData {
  productId: number;
  title: string;
  image: string;
  price: number;
  category: string;
}

export interface IWishlistService {
  getWishlist(userId: string): Promise<WishlistWithItems>;
  addItem(userId: string, item: WishlistItemData): Promise<void>;
  removeItem(userId: string, productId: number): Promise<void>;
  isInWishlist(userId: string, productId: number): Promise<boolean>;
}

export interface WishlistWithItems {
  id: string;
  userId: string;
  items: Array<{
    id: string;
    productId: number;
    title: string;
    image: string;
    price: number;
    category: string;
  }>;
}

class WishlistService implements IWishlistService {
  async getWishlist(userId: string): Promise<WishlistWithItems> {
    const wishlist = await db.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!wishlist) {
      const newWishlist = await db.wishlist.create({
        data: { userId },
        include: { items: true },
      });

      return newWishlist;
    }

    return wishlist;
  }

  async addItem(userId: string, item: WishlistItemData): Promise<void> {
    const wishlist = await db.wishlist.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    await db.wishlistItem.upsert({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId: item.productId,
        },
      },
      update: {},
      create: {
        wishlistId: wishlist.id,
        ...item,
      },
    });

    eventBus.emit<WishlistItemAddedPayload>(EVENTS.WISHLIST.ITEM_ADDED, {
      userId,
      productId: item.productId,
    });
  }

  async removeItem(userId: string, productId: number): Promise<void> {
    const wishlist = await db.wishlist.findUnique({
      where: { userId },
    });

    if (!wishlist) {
      return;
    }

    await db.wishlistItem.delete({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    eventBus.emit<WishlistItemRemovedPayload>(EVENTS.WISHLIST.ITEM_REMOVED, {
      userId,
      productId,
    });
  }

  async isInWishlist(userId: string, productId: number): Promise<boolean> {
    const wishlist = await db.wishlist.findUnique({
      where: { userId },
    });

    if (!wishlist) {
      return false;
    }

    const item = await db.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    return !!item;
  }
}

export class WishlistServiceFactory {
  private static instance: IWishlistService | null = null;

  static getWishlistService(): IWishlistService {
    if (!this.instance) {
      this.instance = new WishlistService();
    }
    return this.instance;
  }
}
