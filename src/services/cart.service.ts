import { db } from '@/lib/prisma';
import { eventBus, EVENTS } from '@/lib/events';
import type {
  CartItemAddedPayload,
  CartItemRemovedPayload,
  CartItemUpdatedPayload,
} from '@/lib/events';

export interface CartItemData {
  productId: number;
  quantity: number;
  price: number;
  title: string;
  image: string;
  category: string;
}

export interface IShoppingCartService {
  getCart(userId: string): Promise<Cart>;
  addItem(userId: string, item: CartItemData): Promise<void>;
  updateItemQuantity(
    userId: string,
    productId: number,
    quantity: number
  ): Promise<void>;
  removeItem(userId: string, productId: number): Promise<void>;
  clearCart(userId: string): Promise<void>;
  getCartItemsCount(userId: string): Promise<number>;
}

export interface Items {
  id: string;
  productId: number;
  quantity: number;
  price: number;
  title: string;
  image: string;
  category: string;
}

export interface Cart {
  id: string;
  userId: string;
  items: Items[];
  total: number;
}

class ShoppingCartService implements IShoppingCartService {
  async getCart(userId: string): Promise<Cart> {
    const cart = await db.cart.findUnique({
      where: { userId },
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cart) {
      const newCart = await db.cart.create({
        data: {
          userId,
        },
        include: {
          items: true,
        },
      });

      return {
        ...newCart,
        total: 0,
      };
    }

    const total = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    return {
      ...cart,
      total,
    };
  }

  async addItem(userId: string, item: CartItemData): Promise<void> {
    const cart = await db.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    await db.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: item.productId,
        },
      },
      update: {
        quantity: { increment: item.quantity },
      },
      create: {
        cartId: cart.id,
        ...item,
      },
    });

    eventBus.emit<CartItemAddedPayload>(EVENTS.CART.ITEM_ADDED, {
      userId,
      productId: item.productId,
      quantity: item.quantity,
    });
  }

  async updateItemQuantity(
    userId: string,
    productId: number,
    quantity: number
  ): Promise<void> {
    const cart = await db.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      return;
    }

    if (quantity <= 0) {
      await this.removeItem(userId, productId);

      return;
    }

    await db.cartItem.update({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      data: { quantity },
    });

    eventBus.emit<CartItemUpdatedPayload>(EVENTS.CART.ITEM_UPDATED, {
      userId,
      productId,
      quantity,
    });
  }

  async removeItem(userId: string, productId: number): Promise<void> {
    const cart = await db.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      return;
    }

    await db.cartItem.delete({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    eventBus.emit<CartItemRemovedPayload>(EVENTS.CART.ITEM_REMOVED, {
      userId,
      productId,
    });
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await db.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      return;
    }

    await db.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    eventBus.emit(EVENTS.CART.CLEARED, { userId });
  }

  async getCartItemsCount(userId: string): Promise<number> {
    const cart = await db.cart.findUnique({
      where: { userId },
      include: {
        items: true,
      },
    });

    return cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  }
}

export class CartServiceFactory {
  private static instance: IShoppingCartService | null = null;

  static getCartService(): IShoppingCartService {
    if (!this.instance) {
      this.instance = new ShoppingCartService();
    }

    return this.instance;
  }
}
