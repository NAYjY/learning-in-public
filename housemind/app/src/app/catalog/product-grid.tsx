"use client";

import { useState, useEffect } from "react";

type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  image_url: string | null;
  status: "reference" | "available";
  price_tier: string | null;
  availability_requests: number;
};

const CATEGORIES = ["all", "tiles", "fixtures", "lighting", "cladding"] as const;

export function ProductGrid() {
  const [category, setCategory] = useState<string>("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const params = category !== "all" ? `?category=${category}` : "";
    fetch(`/api/products${params}`)
      .then((r) => r.json())
      .then((data) => {
        setProducts(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [category]);

  async function requestAvailability(productId: string) {
    await fetch(`/api/products/${productId}/request`, { method: "POST" });
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, availability_requests: p.availability_requests + 1 }
          : p
      )
    );
  }

  return (
    <div>
      {/* Category filters */}
      <div className="flex gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setCategory(cat);
            }}
            className={`px-4 py-2 rounded-full text-sm capitalize ${
              category === cat
                ? "bg-black text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="border rounded-lg overflow-hidden hover:shadow-md transition"
          >
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400">
                No image
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    product.status === "available"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {product.status === "available" ? "Available" : "Reference"}
                </span>
                {product.price_tier && (
                  <span className="text-xs text-gray-500">{product.price_tier}</span>
                )}
              </div>
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{product.description}</p>
              <p className="text-xs text-gray-400 mt-1 capitalize">{product.category}</p>

              {product.status === "reference" && (
                <button
                  onClick={() => requestAvailability(product.id)}
                  className="mt-3 w-full text-sm px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Request Availability ({product.availability_requests})
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {loaded && products.length === 0 && (
        <p className="text-gray-500 text-center py-12">No products found.</p>
      )}
    </div>
  );
}
