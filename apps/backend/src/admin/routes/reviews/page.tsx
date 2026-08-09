import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Star } from "@medusajs/icons";
import { Badge, Button, Container, Heading, Text } from "@medusajs/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

type ReviewStatus = "pending" | "approved" | "hidden";
type Review = {
  id: string;
  rating: number;
  body: string;
  status: ReviewStatus;
  product_id: string;
  customer_name: string;
  order_id: string;
  created_at: string;
};

const STATUS_TABS: { value: ReviewStatus | "all"; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "hidden", label: "Hidden" },
  { value: "all", label: "All" },
];

const STATUS_BADGE_COLOR: Record<ReviewStatus, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  hidden: "bg-stone-100 text-stone-600 border-stone-200",
};

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "include", ...init });
  if (!response.ok) throw new Error(`Request to ${path} failed with ${response.status}`);
  return response.json() as Promise<T>;
}

function useReviews(status: ReviewStatus | "all") {
  return useQuery({
    queryKey: ["begnon-admin-reviews", status],
    queryFn: async () => {
      const params = status === "all" ? "" : `?status=${status}`;
      const data = await fetchJson<{ reviews: Review[] }>(`/admin/reviews${params}`);
      return data.reviews;
    },
  });
}

const ReviewsRoute = () => {
  const [status, setStatus] = useState<ReviewStatus | "all">("pending");
  const { data: reviews = [], isLoading, isError } = useReviews(status);
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function updateStatus(id: string, nextStatus: ReviewStatus) {
    setPendingId(id);
    try {
      await fetchJson(`/admin/reviews/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await queryClient.invalidateQueries({ queryKey: ["begnon-admin-reviews"] });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#fffaf5]">
      <Container className="border-ui-border-base bg-white p-0 shadow-sm">
        <div className="border-b border-orange-100 bg-white px-6 py-6 md:px-8">
          <Badge className="mb-3 border-orange-200 bg-orange-50 text-orange-700">Begnon admin</Badge>
          <Heading level="h1" className="text-2xl font-semibold text-stone-950">
            Product reviews
          </Heading>
          <Text className="mt-2 max-w-[620px] text-stone-600">
            Reviews from verified buyers on delivered orders. Approve to show on the product page, or hide.
          </Text>
        </div>

        <div className="flex gap-2 border-b border-orange-100 px-6 py-3 md:px-8">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.value}
              size="small"
              variant={status === tab.value ? "primary" : "secondary"}
              className={status === tab.value ? "bg-orange-600 text-white hover:bg-orange-700" : ""}
              onClick={() => setStatus(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="p-4 md:p-6">
          {isError ? <Text className="text-rose-700">Couldn&apos;t load reviews. Try refreshing.</Text> : null}
          {isLoading ? <Text className="text-stone-500">Loading reviews...</Text> : null}
          {!isLoading && !reviews.length ? (
            <Text className="text-stone-500">No {status === "all" ? "" : status} reviews.</Text>
          ) : null}

          <div className="grid gap-3">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-orange-100 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5 text-orange-500">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star key={index} className={index < review.rating ? "opacity-100" : "opacity-20"} />
                        ))}
                      </div>
                      <Badge className={STATUS_BADGE_COLOR[review.status]}>{review.status}</Badge>
                    </div>
                    <Text className="mt-2 text-stone-900">{review.body}</Text>
                    <Text className="mt-2 text-xs text-stone-500">
                      {review.customer_name} &middot; product {review.product_id} &middot; order {review.order_id} &middot;{" "}
                      {new Date(review.created_at).toLocaleDateString()}
                    </Text>
                  </div>
                  <div className="flex gap-2">
                    {review.status !== "approved" ? (
                      <Button
                        size="small"
                        disabled={pendingId === review.id}
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => updateStatus(review.id, "approved")}
                      >
                        Approve
                      </Button>
                    ) : null}
                    {review.status !== "hidden" ? (
                      <Button size="small" variant="secondary" disabled={pendingId === review.id} onClick={() => updateStatus(review.id, "hidden")}>
                        Hide
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
};

export const config = defineRouteConfig({
  label: "Reviews",
  icon: Star,
  rank: -900,
});

export default ReviewsRoute;
