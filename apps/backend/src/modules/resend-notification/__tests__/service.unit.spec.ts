import ResendNotificationService, { ResendProviderError } from "../service"

const apiKey = "re_test_only"
const from = "Begnon <orders@begnon.com>"
const ok = (data: Record<string, unknown>) => Promise.resolve(new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } }))

describe("ResendNotificationService", () => {
  test("fails fast without an api key", () => {
    expect(() => new ResendNotificationService({}, { apiKey: "", from })).toThrow(ResendProviderError)
  })

  test("fails fast without a from address", () => {
    expect(() => new ResendNotificationService({}, { apiKey, from: "" })).toThrow(ResendProviderError)
  })

  test("sends the subject and html from notification.content", async () => {
    const fetcher = jest.fn().mockImplementation(() => ok({ id: "email_1" }))
    const service = new ResendNotificationService({}, { apiKey, from }, fetcher)
    const result = await service.send({
      to: "customer@example.com",
      channel: "email",
      template: "order-placed-customer",
      content: { subject: "Order confirmed", html: "<p>Thanks!</p>" },
    })
    expect(result).toEqual({ id: "email_1" })
    const [url, init] = fetcher.mock.calls[0]
    expect(url).toBe("https://api.resend.com/emails")
    expect(init.headers.Authorization).toBe(`Bearer ${apiKey}`)
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({ from, to: ["customer@example.com"], subject: "Order confirmed", html: "<p>Thanks!</p>" })
  })

  test("raises a typed error on a non-2xx response", async () => {
    const fetcher = jest.fn().mockImplementation(() => Promise.resolve(new Response("bad request", { status: 400 })))
    const service = new ResendNotificationService({}, { apiKey, from }, fetcher)
    await expect(service.send({ to: "customer@example.com", channel: "email", template: "t", content: { subject: "s", html: "h" } })).rejects.toThrow(ResendProviderError)
  })
})
