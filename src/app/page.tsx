import { ProductCardList } from '@/components/products/product-card-list';
import { ProductProcessingPanel } from '@/components/products/product-processing-panel';

import { auth } from '@/auth';
import { WishlistServiceFactory } from '@/services/wishlist.service';

// Always render dynamically so wishlist is up-to-date for logged-in users
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await auth();

  const wishlistService = WishlistServiceFactory.getWishlistService();

  let initialWishlist: number[] = [];

  if (session?.user) {
    const wishlistObj = await wishlistService.getWishlist(session.user.id);
    initialWishlist = wishlistObj.items.map((item) => item.productId);
  }

  return (
    <div className="container py-8 px-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Discover Amazing Products</h1>
        <p className="text-muted-foreground">
          Browse our collection of quality products at great prices
        </p>
      </div>

      <div className="sticky top-16 z-40 mb-6">
        <ProductProcessingPanel />
      </div>
      <ProductCardList
        isAuthenticated={!!session?.user}
        initialWishlist={initialWishlist}
      />
    </div>
  );
}
