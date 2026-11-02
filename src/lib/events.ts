// Event-driven system types and infrastructure
export type EventCallback<T = unknown> = (data: T) => void | Promise<void>;

export interface IEventBus {
  emit<T = unknown>(eventName: string, data: T): void;
  on<T = unknown>(eventName: string, callback: EventCallback<T>): () => void;
  off(eventName: string, callback: EventCallback): void;
}

class EventEmitter implements IEventBus {
  private listeners: Map<string, Set<EventCallback>>;

  constructor() {
    this.listeners = new Map();
  }

  emit<T = unknown>(eventName: string, data: T): void {
    const eventListeners = this.listeners.get(eventName);
    if (!eventListeners) {
      return;
    }

    eventListeners.forEach((callback) => {
      try {
        void callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${eventName}:`, error);
      }
    });
  }

  on<T = unknown>(eventName: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }

    const eventListeners = this.listeners.get(eventName);
    eventListeners?.add(callback as EventCallback);

    return () => this.off(eventName, callback as EventCallback);
  }

  off(eventName: string, callback: EventCallback): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventName);
      }
    }
  }
}

export const eventBus = new EventEmitter();

// Domain Events
export const EVENTS = {
  CART: {
    ITEM_ADDED: 'cart:item:added',
    ITEM_REMOVED: 'cart:item:removed',
    ITEM_UPDATED: 'cart:item:updated',
    CLEARED: 'cart:cleared',
  },
  WISHLIST: {
    ITEM_ADDED: 'wishlist:item:added',
    ITEM_REMOVED: 'wishlist:item:removed',
  },
  ORDER: {
    CREATED: 'order:created',
    STATUS_CHANGED: 'order:status:changed',
  },
  USER: {
    SIGNED_IN: 'user:signed:in',
    SIGNED_OUT: 'user:signed:out',
  },
} as const;

// Event payload types
export interface CartItemAddedPayload {
  userId: string;
  productId: number;
  quantity: number;
}

export interface CartItemRemovedPayload {
  userId: string;
  productId: number;
}

export interface CartItemUpdatedPayload {
  userId: string;
  productId: number;
  quantity: number;
}

export interface CartClearedPayload {
  userId: string;
}

export interface WishlistItemAddedPayload {
  userId: string;
  productId: number;
}

export interface WishlistItemRemovedPayload {
  userId: string;
  productId: number;
}

export interface OrderCreatedPayload {
  orderId: string;
  userId: string;
  total: number;
}

export interface OrderStatusChangedPayload {
  orderId: string;
  oldStatus: string;
  newStatus: string;
}
