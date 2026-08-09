import type { AuthenticatedMedusaRequest, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { IOrderModuleService, OrderDetailDTO } from "@medusajs/framework/types"
import { REVIEWS_MODULE } from "../../../modules/reviews"
import type ReviewModuleService from "../../../modules/reviews/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.query.product_id as string | undefined
  if (!productId) {
    res.status(400).json({ error: "product_id is required." })
    return
  }

  const reviewModuleService: ReviewModuleService = req.scope.resolve(REVIEWS_MODULE)
  const [reviews, count] = await reviewModuleService.listAndCountReviews(
    { product_id: productId, status: "approved" },
    { order: { created_at: "DESC" }, take: 50 },
  )

  res.status(200).json({ reviews, count })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id

  const body = req.body as {
    productId?: string
    orderId?: string
    orderItemId?: string
    rating?: number
    reviewBody?: string
    customerName?: string
  }

  const { productId, orderId, orderItemId, rating, reviewBody, customerName } = body

  if (!productId || !orderId || !orderItemId || !rating || !reviewBody?.trim()) {
    res.status(400).json({ error: "productId, orderId, orderItemId, rating, and reviewBody are required." })
    return
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    res.status(400).json({ error: "rating must be an integer between 1 and 5." })
    return
  }

  const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER)
  // retrieveOrder's return type doesn't widen based on `relations`, even
  // though the fulfillments relation is genuinely present at runtime here.
  const order = (await orderModuleService
    .retrieveOrder(orderId, { relations: ["items", "fulfillments"] })
    .catch(() => null)) as OrderDetailDTO | null

  const ownsOrder = order?.customer_id === customerId
  const isDelivered = Boolean(order?.fulfillments?.some((fulfillment) => fulfillment.delivered_at))
  const matchingItem = order?.items?.find((item) => item.id === orderItemId && item.product_id === productId)

  if (!order || !ownsOrder || !isDelivered || !matchingItem) {
    res.status(403).json({ error: "This item isn't eligible for a review yet." })
    return
  }

  const reviewModuleService: ReviewModuleService = req.scope.resolve(REVIEWS_MODULE)
  const [existing] = await reviewModuleService.listReviews({ order_item_id: orderItemId, customer_id: customerId })
  if (existing) {
    res.status(409).json({ error: "You've already reviewed this item." })
    return
  }

  const review = await reviewModuleService.createReviews({
    rating,
    body: reviewBody.trim(),
    status: "pending",
    product_id: productId,
    customer_id: customerId,
    customer_name: customerName?.trim() || "Verified buyer",
    order_id: orderId,
    order_item_id: orderItemId,
  })

  res.status(201).json({ review })
}
