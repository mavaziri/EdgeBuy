export default function Loading() {
  return (
    <main className="container px-6 py-8" aria-busy="true">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">Discover Amazing Products</h1>
        <p className="text-muted-foreground" role="status" aria-live="polite">
          Loading products...
        </p>
      </div>
    </main>
  );
}
