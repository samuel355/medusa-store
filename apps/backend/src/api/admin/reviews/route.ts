import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEWS_MODULE } from "../../../modules/reviews"
import type ReviewModuleService from "../../../modules/reviews/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const status = req.query.status as string | undefined
  const reviewModuleService: ReviewModuleService = req.scope.resolve(REVIEWS_MODULE)

  const [reviews, count] = await reviewModuleService.listAndCountReviews(
    status ? { status } : {},
    { order: { created_at: "DESC" }, take: 100 },
  )

  res.status(200).json({ reviews, count })
}
