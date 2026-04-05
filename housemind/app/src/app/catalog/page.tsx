import { ProductGrid } from "./product-grid";

export default function CatalogPage() {
  return (
    <main className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Product Catalog</h1>
      <p className="text-gray-600 mb-8">
        Browse building materials. Reference products show what&apos;s possible — request
        availability to connect with suppliers.
      </p>
      <ProductGrid />
    </main>
  );
}
