import ArkeselNotificationService, { ArkeselProviderError } from "../service"

const apiKey = "ak_test_only"
const ok = () => Promise.resolve(new Response(JSON.stringify({ status: "success" }), { status: 200, headers: { "content-type": "application/json" } }))

describe("ArkeselNotificationService", () => {
  test("fails fast without an api key", () => {
    expect(() => new ArkeselNotificationService({}, { apiKey: "" })).toThrow(ArkeselProviderError)
  })

  test("sends data.message to the recipient with the configured sender", async () => {
    const fetcher = jest.fn().mockImplementation(() => ok())
    const service = new ArkeselNotificationService({}, { apiKey, sender: "Begnon" }, fetcher)
    await service.send({ to: "+233240000000", channel: "sms", template: "order-placed-customer", data: { message: "Your order is confirmed." } })
    const [url, init] = fetcher.mock.calls[0]
    expect(url).toBe("https://sms.arkesel.com/api/v2/sms/send")
    expect(init.headers["api-key"]).toBe(apiKey)
    const body = JSON.parse(init.body)
    expect(body).toEqual({ sender: "Begnon", message: "Your order is confirmed.", recipients: ["+233240000000"] })
  })

  test("prefers content.text over data.message when both are present", async () => {
    const fetcher = jest.fn().mockImplementation(() => ok())
    const service = new ArkeselNotificationService({}, { apiKey }, fetcher)
    await service.send({ to: "+233240000000", channel: "sms", template: "t", data: { message: "from data" }, content: { text: "from content" } })
    const body = JSON.parse(fetcher.mock.calls[0][1].body)
    expect(body.message).toBe("from content")
  })

  test("rejects when there is no message text at all", async () => {
    const service = new ArkeselNotificationService({}, { apiKey }, jest.fn())
    await expect(service.send({ to: "+233240000000", channel: "sms", template: "t" })).rejects.toThrow(ArkeselProviderError)
  })

  test("raises a typed error on a non-2xx response", async () => {
    const fetcher = jest.fn().mockImplementation(() => Promise.resolve(new Response("bad request", { status: 400 })))
    const service = new ArkeselNotificationService({}, { apiKey }, fetcher)
    await expect(service.send({ to: "+233240000000", channel: "sms", template: "t", data: { message: "hi" } })).rejects.toThrow(ArkeselProviderError)
  })
})
