import path from "node:path"

export function resolveEnvironmentDirectory(environment: NodeJS.ProcessEnv, currentDirectory: string) {
  const configured = environment.MEDUSA_ENV_DIR?.trim()
  return configured ? path.resolve(configured) : path.resolve(currentDirectory)
}
