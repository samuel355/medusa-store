export type ProductReview = {
  id: string;
  rating: number;
  body: string;
  customer_name: string;
  created_at: string;
};

export type ProductReviewSummary = {
  reviews: ProductReview[];
  count: number;
  average: number | null;
};

export async function fetchProductReviews(productId: string): Promise<ProductReviewSummary> {
  try {
    const { medusaSdk } = await import("./sdk");
    const { reviews } = await medusaSdk.client.fetch<{ reviews: ProductReview[]; count: number }>("/store/reviews", {
      query: { product_id: productId },
    });
    const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null;
    return { reviews, count: reviews.length, average };
  } catch {
    return { reviews: [], count: 0, average: null };
  }
}

export async function submitReview(input: {
  productId: string;
  orderId: string;
  orderItemId: string;
  rating: number;
  reviewBody: string;
}): Promise<{ ok: boolean; error: string | null }> {
  try {
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: data.error ?? "Unable to submit review." };
    }
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
