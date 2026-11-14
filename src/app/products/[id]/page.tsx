import { ApiServiceFactory } from '@/services/products.service';
import Image from 'next/image';

import { Separator } from '@/components/ui/separator';
import { auth } from '@/auth';
import { AddToCartForm } from './add-to-cart-form';
import { AddToWishlistForm } from './add-to-wishlist-form';
import { notFound } from 'next/navigation';

// ISR: Revalidate product pages every 1 hour
export const revalidate = 3600;

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

// SSG: Generate static pages for the first 20 products at build time
export async function generateStaticParams() {
  const productsService = ApiServiceFactory.getProductsService();
  const page = await productsService.getProductsPage(0, 20);

  // Generate paths for the first 20 products (adjust as needed)
  return page.products.map((product) => ({
    id: product.id.toString(),
  }));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = await params;
  const productId = parseInt(resolvedParams.id);

  if (isNaN(productId)) {
    notFound();
  }

  const productsService = ApiServiceFactory.getProductsService();
  const session = await auth();

  try {
    const product = await productsService.getProductById(productId);

    return (
      <div className="container py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
            <Image
              src={product.image}
              alt={product.title}
              fill
              className="object-contain p-8"
              priority
            />
          </div>

          <div className="flex flex-col">
            <div className="mb-2 text-sm text-muted-foreground capitalize">
              {product.category}
            </div>
            <h1 className="text-3xl font-bold mb-4">{product.title}</h1>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-1">
                <span className="text-2xl">⭐</span>
                <span className="text-lg font-semibold">
                  {product.rating.rate}
                </span>
                <span className="text-muted-foreground">
                  ({product.rating.count} reviews)
                </span>
              </div>
            </div>

            <div className="text-4xl font-bold text-primary mb-6">
              ${product.price.toFixed(2)}
            </div>

            <Separator className="mb-6" />

            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </div>

            <div className="mt-auto flex gap-4">
              <AddToCartForm
                product={product}
                isAuthenticated={!!session?.user}
              />
              <AddToWishlistForm
                product={product}
                isAuthenticated={!!session?.user}
              />
            </div>
          </div>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
