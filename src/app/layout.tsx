import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ReactQueryProvider } from '@/components/providers/react-query-provider';
import { Toaster } from '@/components/ui/toaster';
import { Navbar } from '@/components/layout/navbar';
import { auth } from '@/auth';
import { CartServiceFactory } from '@/services/cart.service';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EdgeBuy - Modern E-commerce',
  description: 'Shop the best products online',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const cartService = CartServiceFactory.getCartService();

  let cartCount = 0;
  if (session?.user) {
    cartCount = await cartService.getCartItemsCount(session.user.id);
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <ReactQueryProvider>
          <Navbar user={session?.user} cartCount={cartCount} />
          <main className="min-h-screen">{children}</main>
          <Toaster />
        </ReactQueryProvider>
      </body>
    </html>
  );
}
