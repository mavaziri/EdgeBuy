# EdgeBuy - Modern E-commerce Application

A full-featured e-commerce application built with Next.js 15, TypeScript, Prisma, and NextAuth.

## Features

- 🛍️ **Product Browsing**: Browse paginated products from DummyJSON
- 🛒 **Shopping Cart**: Persistent cart with Prisma
- ❤️ **Wishlist**: Save favorite products
- 📦 **Order Management**: Track order history and status
- 🔐 **Authentication**: Secure auth with NextAuth.js
- 🎨 **Beautiful UI**: Modern design with shadcn/ui + Tailwind CSS
- 🔄 **Event-Driven**: Event bus for decoupled architecture
- 🎯 **Type-Safe**: Strict TypeScript with no 'any' types
- ⚡ **Performance**: Server Components + React Query

## Tech Stack

| Concern       | Tool                            |
| ------------- | ------------------------------- |
| Framework     | Next.js 15                      |
| Language      | TypeScript (strict mode)        |
| Database      | Prisma + SQLite                 |
| Auth          | NextAuth.js v5                  |
| UI Components | shadcn/ui                       |
| Styling       | Tailwind CSS                    |
| Product API   | DummyJSON                       |
| State (Read)  | React Query                     |
| State (Write) | useActionState + Server Actions |
| Events        | Custom Event Bus                |

## Architecture

### Design Patterns

- **Factory Pattern**: Service instantiation
- **Event-Driven**: Decoupled domain events
- **Repository Pattern**: Data access abstraction
- **Server Actions**: Form mutations

### Project Structure

```
src/
├── actions/          # Server Actions for mutations
├── app/              # Next.js App Router pages
├── components/       # React components
│   ├── ui/          # shadcn/ui components
│   ├── layout/      # Layout components
│   ├── products/    # Product-related components
│   └── providers/   # Context providers
├── lib/              # Utilities and shared code
├── services/         # Business logic services
└── types/            # TypeScript type definitions
```

## Getting Started

### Prerequisites

- Node.js 20+
- Yarn 1.x

### Installation

1. Clone the repository
2. Install dependencies:

```bash
yarn install
```

3. Create `.env` file:

```bash
cp .env.example .env
```

4. Update `.env` with your values:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

5. Initialize the database:

```bash
yarn db:push
```

6. Start the development server:

```bash
yarn dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn lint` - Run ESLint
- `yarn test` - Run service tests
- `yarn db:push` - Push Prisma schema to database
- `yarn db:studio` - Open Prisma Studio

## Features Detail

### Catalog Analysis

The sticky Analyze catalog control starts a fresh, independent pass through the
catalog. Each batch is fetched and summarized by an async generator, then
displayed before the next page is requested. Progress and completed batches
remain visible if the analysis is cancelled or a request fails.

### Authentication

- Email/password authentication
- Session management with JWT
- Protected routes with middleware
- User profile management

### Shopping Cart

- Add/remove items
- Update quantities
- Persistent storage
- Real-time updates

### Wishlist

- Save favorite products
- Move to cart
- Remove items

### Orders

- Create orders from cart
- Order history
- Order status tracking
- Order details view

### Event System

- Cart events (add, remove, update)
- Wishlist events
- Order events
- User events

## Type Safety

This project uses strict TypeScript configuration:

- No implicit any
- Strict null checks
- Strict function types
- No unchecked indexed access
- Unknown type for uncertain values

## Contributing

Contributions are welcome! Please follow the code style and ensure all TypeScript checks pass.

## License

MIT
