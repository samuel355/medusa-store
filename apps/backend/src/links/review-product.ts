import ProductModule from "@medusajs/medusa/product"
import ReviewModule from "../modules/reviews"
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(ProductModule.linkable.product, ReviewModule.linkable.review)
