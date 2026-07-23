import { resolveRedisConfiguration } from "../redis"

describe("Redis module configuration", () => {
  it("uses Medusa defaults unless Redis is explicitly enabled", () => {
    expect(resolveRedisConfiguration({})).toEqual({ enabled: false, redisUrl: undefined })
    expect(resolveRedisConfiguration({ MEDUSA_REDIS_ENABLED: "false", REDIS_URL: "redis://stale" })).toEqual({ enabled: false, redisUrl: undefined })
  })

  it("accepts an explicitly enabled Redis URL", () => {
    expect(resolveRedisConfiguration({ MEDUSA_REDIS_ENABLED: " TRUE ", REDIS_URL: " redis://redis:6379 " })).toEqual({ enabled: true, redisUrl: "redis://redis:6379" })
  })

  it("fails fast when explicit activation has no URL", () => {
    expect(() => resolveRedisConfiguration({ MEDUSA_REDIS_ENABLED: "true" })).toThrow("MEDUSA_REDIS_ENABLED=true requires REDIS_URL")
  })
})
