import path from "node:path"
import { resolveEnvironmentDirectory } from "../environment"

describe("Medusa environment directory", () => {
  it("uses the explicit source directory after production start changes cwd", () => {
    expect(resolveEnvironmentDirectory({ MEDUSA_ENV_DIR: "/srv/shop/apps/backend" }, "/srv/shop/apps/backend/.medusa/server"))
      .toBe(path.resolve("/srv/shop/apps/backend"))
  })

  it("uses cwd for a standalone packaged server", () => {
    expect(resolveEnvironmentDirectory({}, "/app")).toBe(path.resolve("/app"))
  })
})
