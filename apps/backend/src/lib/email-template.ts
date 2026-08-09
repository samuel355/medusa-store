import { money } from "./notify-helpers"

const ORANGE = "#f4752c"
const INK = "#17130f"
const MUTED = "#6b7280"
const LINE = "#f0e2d7"
const PANEL = "#fff7ed"

function storeUrl() {
  return (process.env.PLUGIN_STORE_URL || "http://localhost:3000").replace(/\/$/, "")
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export type EmailLineItem = {
  title: string
  quantity: number
  unitPrice: number
  total: number
  thumbnail?: string | null
}

export function renderItemsTable(items: EmailLineItem[], currencyCode: string): string {
  const rows = items
    .map((item) => {
      const image = item.thumbnail
        ? `<img src="${escapeHtml(item.thumbnail)}" width="48" height="48" alt="" style="display:block;width:48px;height:48px;border-radius:8px;object-fit:cover;border:1px solid ${LINE};" />`
        : `<div style="width:48px;height:48px;border-radius:8px;background:${PANEL};border:1px solid ${LINE};"></div>`

      return `
        <tr>
          <td width="48" style="padding:14px 0;border-bottom:1px solid ${LINE};">${image}</td>
          <td style="padding:14px 0 14px 14px;border-bottom:1px solid ${LINE};">
            <div style="font-size:14px;font-weight:600;color:${INK};line-height:1.3;">${escapeHtml(item.title)}</div>
            <div style="margin-top:2px;font-size:13px;color:${MUTED};">Qty ${item.quantity} &times; ${money(item.unitPrice, currencyCode)}</div>
          </td>
          <td style="padding:14px 0;border-bottom:1px solid ${LINE};text-align:right;white-space:nowrap;font-size:14px;font-weight:700;color:${INK};">${money(item.total, currencyCode)}</td>
        </tr>`
    })
    .join("")

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;">
      <tr>
        <td colspan="2" style="padding:0 0 10px;border-bottom:2px solid ${LINE};font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${MUTED};">Item</td>
        <td style="padding:0 0 10px;border-bottom:2px solid ${LINE};font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${MUTED};text-align:right;">Total</td>
      </tr>
      ${rows}
    </table>`
}

export function renderOrderSummary(
  totals: { subtotal: number; shipping: number; total: number },
  currencyCode: string,
): string {
  function row(label: string, amount: number, emphasize = false) {
    return `
      <tr>
        <td style="padding:${emphasize ? "10px 0 0" : "3px 0"};font-size:${emphasize ? "15px" : "13px"};font-weight:${emphasize ? "800" : "500"};color:${emphasize ? INK : MUTED};">${label}</td>
        <td style="padding:${emphasize ? "10px 0 0" : "3px 0"};text-align:right;font-size:${emphasize ? "15px" : "13px"};font-weight:${emphasize ? "800" : "600"};color:${INK};">${money(amount, currencyCode)}</td>
      </tr>`
  }

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 24px;">
      ${row("Subtotal", totals.subtotal)}
      ${row("Delivery", totals.shipping)}
      <tr><td colspan="2" style="padding-top:8px;border-top:1px solid ${LINE};"></td></tr>
      ${row("Total", totals.total, true)}
    </table>`
}

export function renderCtaButton(label: string, href: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 4px;">
      <tr>
        <td style="border-radius:9px;background:${ORANGE};">
          <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>`
}

export function renderEmailShell(options: {
  preheader: string
  heading: string
  intro: string
  bodyHtml?: string
}): string {
  const logoUrl = `${storeUrl()}/icons/icon-192.png`

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${escapeHtml(options.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${PANEL};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(options.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PANEL};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${LINE};border-radius:16px;overflow:hidden;">
          <tr><td style="height:5px;background:${ORANGE};line-height:5px;font-size:0;">&nbsp;</td></tr>
          <tr>
            <td align="center" style="padding:28px 32px 20px;">
              <img src="${logoUrl}" width="44" height="44" alt="Begnon" style="display:block;width:44px;height:44px;border-radius:11px;margin:0 auto 10px;" />
              <div style="font-size:18px;font-weight:800;color:${INK};letter-spacing:0.01em;">Begnon</div>
            </td>
          </tr>
          <tr>
            <td style="padding:4px 32px 32px;">
              <h1 style="margin:0 0 8px;font-size:21px;line-height:1.3;color:${INK};">${escapeHtml(options.heading)}</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:${MUTED};">${escapeHtml(options.intro)}</p>
              ${options.bodyHtml ?? ""}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:${PANEL};border-top:1px solid ${LINE};text-align:center;">
              <p style="margin:0;font-size:13px;color:${MUTED};">Begnon &middot; East Legon, Accra, Ghana</p>
              <p style="margin:6px 0 0;font-size:13px;color:${MUTED};">Questions? <a href="mailto:support@begnon.com" style="color:${ORANGE};font-weight:600;text-decoration:none;">support@begnon.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
