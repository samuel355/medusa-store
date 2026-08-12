import { Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ensureOrderNumber } from "../order-number"

const SAFE_CODE_PATTERN = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/

function containerWith(orderModuleService: {
  retrieveOrder: jest.Mock
  listOrders: jest.Mock
  updateOrders: jest.Mock
}): MedusaContainer {
  return {
    resolve: (key: string) => {
      if (key === Modules.ORDER) return orderModuleService
      throw new Error(`unexpected resolve: ${key}`)
    },
  } as unknown as MedusaContainer
}

describe("ensureOrderNumber", () => {
  test("returns the existing code without generating or persisting a new one", async () => {
    const retrieveOrder = jest.fn().mockResolvedValue({ id: "order_1", custom_display_id: "AB3XQP7K" })
    const listOrders = jest.fn()
    const updateOrders = jest.fn()

    const result = await ensureOrderNumber("order_1", containerWith({ retrieveOrder, listOrders, updateOrders }))

    expect(result).toBe("AB3XQP7K")
    expect(listOrders).not.toHaveBeenCalled()
    expect(updateOrders).not.toHaveBeenCalled()
  })

  test("generates and persists an 8-character code from the ambiguity-free alphabet when none exists", async () => {
    const retrieveOrder = jest.fn().mockResolvedValue({ id: "order_1", custom_display_id: null })
    const listOrders = jest.fn().mockResolvedValue([])
    const updateOrders = jest.fn().mockResolvedValue(undefined)

    const result = await ensureOrderNumber("order_1", containerWith({ retrieveOrder, listOrders, updateOrders }))

    expect(result).toMatch(SAFE_CODE_PATTERN)
    expect(updateOrders).toHaveBeenCalledWith("order_1", { custom_display_id: result })
  })

  test("retries on a collision instead of persisting a duplicate code", async () => {
    const retrieveOrder = jest.fn().mockResolvedValue({ id: "order_1", custom_display_id: null })
    const listOrders = jest.fn()
      .mockResolvedValueOnce([{ id: "order_other" }]) // first generated code already taken
      .mockResolvedValueOnce([]) // retry is free
    const updateOrders = jest.fn().mockResolvedValue(undefined)

    const result = await ensureOrderNumber("order_1", containerWith({ retrieveOrder, listOrders, updateOrders }))

    expect(listOrders).toHaveBeenCalledTimes(2)
    expect(result).toMatch(SAFE_CODE_PATTERN)
    expect(updateOrders).toHaveBeenCalledWith("order_1", { custom_display_id: result })
  })
})
