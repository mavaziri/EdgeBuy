import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { WishlistServiceFactory } from '@/services/wishlist.service';
import { WishlistItemsList } from './wishlist-items-list';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Force dynamic rendering - wishlist data is user-specific and real-time
export const dynamic = 'force-dynamic';

export default async function WishlistPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  const wishlistService = WishlistServiceFactory.getWishlistService();
  const wishlist = await wishlistService.getWishlist(session.user.id);

  if (wishlist.items.length === 0) {
    return (
      <div className="container py-16">
        <div className="max-w-2xl mx-auto text-center">
          <Heart className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-3xl font-bold mb-2">Your wishlist is empty</h1>
          <p className="text-muted-foreground mb-6">
            Save your favorite items for later
          </p>
          <Link href="/">
            <Button size="lg">Browse Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">My Wishlist</h1>
      <WishlistItemsList items={wishlist.items} />
    </div>
  );
}
