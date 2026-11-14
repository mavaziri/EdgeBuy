'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Heart, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { signOut } from '@/actions/auth.actions';
import { useCurrentProfile } from '@/hooks/use-current-profile';

interface NavbarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  cartCount?: number;
}

export function Navbar({ user, cartCount = 0 }: NavbarProps) {
  const pathname = usePathname();
  const { data: profile } = useCurrentProfile(Boolean(user));

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center space-x-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              EdgeBuy
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary',
                pathname === '/' ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              Products
            </Link>
            {user && (
              <Link
                href="/orders"
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  pathname === '/orders'
                    ? 'text-primary'
                    : 'text-muted-foreground',
                )}
              >
                Orders
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                href="/profile"
                aria-label="Your profile"
                className="flex items-center gap-2"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={profile?.image ?? user.image ?? undefined}
                  />
                  <AvatarFallback>
                    {(profile?.name ??
                      user.name ??
                      user.email ??
                      'U')[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">
                  {profile?.name ?? user.name ?? 'Profile'}
                </span>
              </Link>
              <Link href="/wishlist">
                <Button variant="ghost" size="icon" className="relative">
                  <Heart className="h-5 w-5" />
                </Button>
              </Link>

              <Link href="/cart">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-xs text-primary-foreground flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </Link>

              <div className="flex items-center">
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/signin">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm">Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
