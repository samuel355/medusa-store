import { model } from "@medusajs/framework/utils"

// order_id/order_item_id are stored as plain columns rather than module
// links (Medusa's Order module doesn't expose a top-level linkable line
// item the way product/customer do) - they exist purely so one purchased
// item can only be reviewed once, checked at submission time.
const Review = model.define("review", {
  id: model.id({ prefix: "review" }).primaryKey(),
  rating: model.number(),
  body: model.text(),
  status: model.enum(["pending", "approved", "hidden"]).default("pending"),
  product_id: model.text().searchable(),
  customer_id: model.text().searchable(),
  customer_name: model.text(),
  order_id: model.text(),
  order_item_id: model.text(),
})

export default Review
