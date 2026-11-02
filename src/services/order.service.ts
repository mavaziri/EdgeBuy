import { db } from '@/lib/prisma';
import { eventBus, EVENTS } from '@/lib/events';
import { OrderStatus } from '@prisma/client';
import type {
  OrderCreatedPayload,
  OrderStatusChangedPayload,
} from '@/lib/events';

export interface OrderItemData {
  productId: number;
  quantity: number;
  price: number;
  title: string;
  image: string;
  category: string;
}

export interface CreateOrderData {
  userId: string;
  items: OrderItemData[];
  total: number;
}

export interface OrderWithItems {
  id: string;
  userId: string;
  status: OrderStatus;
  total: number;
  createdAt: Date;
  items: Array<{
    id: string;
    productId: number;
    quantity: number;
    price: number;
    title: string;
    image: string;
    category: string;
  }>;
}

export interface OrderService {
  createOrder(data: CreateOrderData): Promise<OrderWithItems>;
  getOrder(orderId: string): Promise<OrderWithItems | null>;
  getUserOrders(userId: string): Promise<OrderWithItems[]>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<void>;
}

class OrderManagementService implements OrderService {
  async createOrder(data: CreateOrderData): Promise<OrderWithItems> {
    const order = await db.order.create({
      data: {
        userId: data.userId,
        total: data.total,
        status: OrderStatus.PENDING,
        items: {
          create: data.items,
        },
      },
      include: {
        items: true,
      },
    });

    eventBus.emit<OrderCreatedPayload>(EVENTS.ORDER.CREATED, {
      orderId: order.id,
      userId: data.userId,
      total: data.total,
    });

    return order;
  }

  async getOrder(orderId: string): Promise<OrderWithItems | null> {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    return order;
  }

  async getUserOrders(userId: string): Promise<OrderWithItems[]> {
    const orders = await db.order.findMany({
      where: { userId },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orders;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    await db.order.update({
      where: { id: orderId },
      data: { status },
    });

    eventBus.emit<OrderStatusChangedPayload>(EVENTS.ORDER.STATUS_CHANGED, {
      orderId,
      oldStatus: order.status,
      newStatus: status,
    });
  }
}

export class OrderServiceFactory {
  private static instance: OrderService | null = null;

  static getOrderService(): OrderService {
    if (!this.instance) {
      this.instance = new OrderManagementService();
    }
    return this.instance;
  }
}
