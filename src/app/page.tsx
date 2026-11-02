import { ApiServiceFactory } from '@/services/products.service';
import { ProductCardList } from '@/components/products/product-card-list';

import { auth } from '@/auth';
import { WishlistServiceFactory } from '@/services/wishlist.service';

// Always render dynamically so wishlist is up-to-date for logged-in users
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const productsService = ApiServiceFactory.getProductsService();
  const products = await productsService.getAllProducts();
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

      <ProductCardList
        products={products}
        isAuthenticated={!!session?.user}
        initialWishlist={initialWishlist}
      />
    </div>
  );
}
