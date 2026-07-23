import { createHmac } from "node:crypto"
import PaystackPaymentService, { PaystackProviderError } from "../service"

const secretKey = "sk_test_unit_only"
const response = (data: Record<string, unknown>) => Promise.resolve(new Response(JSON.stringify({ status: true, message: "ok", data }), { status: 200, headers: { "content-type": "application/json" } }))

describe("PaystackPaymentService", () => {
  test("fails fast without a backend secret", () => {
    expect(() => new PaystackPaymentService({}, { secretKey: "" })).toThrow(PaystackProviderError)
  })

  test("initializes in minor units and stores the Medusa session mapping", async () => {
    const fetcher = jest.fn().mockImplementation(() => response({ reference: "ref_1", status: "pending", access_code: "access" }))
    const service = new PaystackPaymentService({}, { secretKey }, fetcher)
    const result = await service.initiatePayment({ amount: 125.5, currency_code: "ghs", data: { email: "buyer@example.com" }, context: { idempotency_key: "payses_1" } })
    expect(result).toMatchObject({ id: "ref_1", status: "pending" })
    const body = JSON.parse(fetcher.mock.calls[0][1].body)
    expect(body).toMatchObject({ amount: 12550, currency: "GHS", metadata: { medusa_session_id: "payses_1" } })
  })

  test("deduplicates repeated initialization for the same Medusa idempotency key", async () => {
    const fetcher = jest.fn().mockImplementation(() => response({ reference: "ref_once", status: "pending" }))
    const service = new PaystackPaymentService({}, { secretKey }, fetcher)
    const input = { amount: 10, currency_code: "ghs", data: { email: "buyer@example.com" }, context: { idempotency_key: "payses_once" } }
    const [first, second] = await Promise.all([service.initiatePayment(input), service.initiatePayment(input)])
    expect(first.id).toBe(second.id)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  test("maps a signed charge.success webhook and rejects bad signatures", async () => {
    const service = new PaystackPaymentService({}, { secretKey }, jest.fn())
    const rawData = JSON.stringify({ event: "charge.success" })
    const data = { event: "charge.success", data: { amount: 4200, metadata: { medusa_session_id: "payses_2" } } }
    const signature = createHmac("sha512", secretKey).update(rawData).digest("hex")
    await expect(service.getWebhookActionAndData({ rawData, data, headers: { "x-paystack-signature": signature } })).resolves.toEqual({ action: "captured", data: { session_id: "payses_2", amount: 42 } })
    await expect(service.getWebhookActionAndData({ rawData, data, headers: { "x-paystack-signature": signature } })).resolves.toEqual({ action: "captured", data: { session_id: "payses_2", amount: 42 } })
    await expect(service.getWebhookActionAndData({ rawData, data, headers: { "x-paystack-signature": "bad" } })).rejects.toThrow(PaystackProviderError)
  })

  test("maps signed failures and ignores unrelated events", async () => {
    const service = new PaystackPaymentService({}, { secretKey }, jest.fn())
    for (const [event, action] of [["charge.failed", "failed"], ["customeridentification.success", "not_supported"]]) {
      const rawData = JSON.stringify({ event })
      const data = { event, data: { amount: 1000, metadata: { medusa_session_id: "payses_3" } } }
      const signature = createHmac("sha512", secretKey).update(rawData).digest("hex")
      await expect(service.getWebhookActionAndData({ rawData, data, headers: { "x-paystack-signature": signature } })).resolves.toHaveProperty("action", action)
    }
  })

  test("retrieves, authorizes, captures, cancels and deletes without creating parallel records", async () => {
    const fetcher = jest.fn().mockImplementation(() => response({ reference: "ref_2", status: "pending", amount: 1000 }))
    const service = new PaystackPaymentService({}, { secretKey }, fetcher)
    const input = { data: { reference: "ref_2" } }
    await expect(service.retrievePayment(input)).resolves.toHaveProperty("data.reference", "ref_2")
    await expect(service.authorizePayment(input)).resolves.toHaveProperty("status", "pending")
    await expect(service.cancelPayment(input)).resolves.toHaveProperty("data.status", "abandoned")
    await expect(service.deletePayment(input)).resolves.toEqual({ data: { deleted: true } })
    await expect(service.capturePayment(input)).rejects.toThrow("not successful")
  })

  test("uses Paystack refund endpoint with minor units", async () => {
    const fetcher = jest.fn().mockImplementation(() => response({ id: 1, status: "pending" }))
    const service = new PaystackPaymentService({}, { secretKey }, fetcher)
    await service.refundPayment({ amount: 12.34, data: { reference: "ref_3" } })
    expect(fetcher.mock.calls[0][0]).toContain("/refund")
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ transaction: "ref_3", amount: 1234 })
  })

  test("captures and updates successful transactions", async () => {
    const service = new PaystackPaymentService({}, { secretKey }, jest.fn().mockImplementation(() => response({ reference: "ref_ok", status: "success", amount: 1000 })))
    await expect(service.capturePayment({ data: { reference: "ref_ok" } })).resolves.toHaveProperty("data.status", "success")
    await expect(service.updatePayment({ amount: 10, currency_code: "ghs", data: { reference: "ref_ok", email: "buyer@example.com" }, context: { idempotency_key: "payses_ok" } })).resolves.toHaveProperty("status", "captured")
  })

  test("wraps provider API failures with operation and cause", async () => {
    const fetcher = jest.fn().mockResolvedValue(new Response(JSON.stringify({ status: false, message: "upstream unavailable", data: null }), { status: 503 }))
    const service = new PaystackPaymentService({}, { secretKey }, fetcher)
    await expect(service.retrievePayment({ data: { reference: "ref_bad" } })).rejects.toMatchObject({ operation: "retrieve" })
  })
})
