import { authenticate, defineMiddlewares } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/reviews",
      method: ["POST"],
      middlewares: [authenticate("customer", ["bearer"])],
    },
    {
      matcher: "/store/customers/me/active-cart",
      method: ["GET"],
      middlewares: [authenticate("customer", ["bearer"])],
    },
  ],
})
