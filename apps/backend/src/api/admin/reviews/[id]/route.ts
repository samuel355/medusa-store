import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEWS_MODULE } from "../../../../modules/reviews"
import type ReviewModuleService from "../../../../modules/reviews/service"

type ReviewStatus = "pending" | "approved" | "hidden"
const VALID_STATUSES: ReviewStatus[] = ["pending", "approved", "hidden"]

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { status } = req.body as { status?: ReviewStatus }

  if (!status || !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: "status must be one of pending, approved, hidden." })
    return
  }

  const reviewModuleService: ReviewModuleService = req.scope.resolve(REVIEWS_MODULE)
  const review = await reviewModuleService.updateReviews({ id: req.params.id, status })

  res.status(200).json({ review })
}
