import CustomerModule from "@medusajs/medusa/customer"
import ReviewModule from "../modules/reviews"
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(CustomerModule.linkable.customer, ReviewModule.linkable.review)
