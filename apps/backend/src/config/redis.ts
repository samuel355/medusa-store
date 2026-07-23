export function resolveRedisConfiguration(environment: NodeJS.ProcessEnv) {
  const enabled = environment.MEDUSA_REDIS_ENABLED?.trim().toLowerCase() === "true"
  const redisUrl = environment.REDIS_URL?.trim()

  if (enabled && !redisUrl) throw new Error("MEDUSA_REDIS_ENABLED=true requires REDIS_URL")

  return { enabled, redisUrl: enabled ? redisUrl : undefined }
}
