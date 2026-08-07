import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

const FAVICON_DATA_URL =
  "data:image/png;base64,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";

function storeUrl() {
  return process.env.PLUGIN_STORE_URL || "http://localhost:3000";
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const shopUrl = `${storeUrl()}/shop`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Begnon Commerce API</title>
<link rel="icon" type="image/png" href="${FAVICON_DATA_URL}" />
<style>
  :root {
    color-scheme: light;
    --orange: #f4752c;
    --orange-dark: #b84a16;
    --ink: #1c1917;
    --muted: #78716c;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background:
      radial-gradient(circle at 15% 15%, rgba(244, 117, 44, 0.16), transparent 40%),
      radial-gradient(circle at 85% 85%, rgba(184, 74, 22, 0.14), transparent 45%),
      #fffaf5;
    color: var(--ink);
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .card {
    width: min(560px, 100%);
    background: #ffffff;
    border: 1px solid rgba(244, 117, 44, 0.18);
    border-radius: 20px;
    padding: 2.75rem 2.5rem;
    box-shadow: 0 24px 60px rgba(122, 47, 13, 0.12);
    text-align: center;
  }
  .mark {
    width: 56px;
    height: 56px;
    margin: 0 auto 1.25rem;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 8px 20px rgba(244, 117, 44, 0.28);
  }
  .mark img { width: 100%; height: 100%; display: block; }
  .pulse {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0 0 1rem;
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    background: rgba(34, 197, 94, 0.12);
    color: #15803d;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: #22c55e;
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6);
    animation: dotpulse 1.8s ease-out infinite;
  }
  @keyframes dotpulse {
    0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.55); }
    70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
    100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
  }
  h1 {
    margin: 0 0 0.5rem;
    font-size: 1.7rem;
    letter-spacing: -0.01em;
  }
  p.lede {
    margin: 0 0 2rem;
    color: var(--muted);
    font-size: 0.96rem;
    line-height: 1.5;
  }
  .actions {
    display: grid;
    gap: 0.65rem;
  }
  a.btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.85rem 1rem;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.92rem;
    text-decoration: none;
    transition: transform 120ms ease, box-shadow 120ms ease;
  }
  a.btn:hover { transform: translateY(-1px); }
  a.primary {
    background: linear-gradient(135deg, #f89a5c, var(--orange) 55%, #7a2f0d);
    color: #fffaf1;
    box-shadow: 0 14px 30px rgba(244, 117, 44, 0.3);
  }
  a.secondary {
    background: #fff7ed;
    color: var(--orange-dark);
    border: 1px solid rgba(244, 117, 44, 0.25);
  }
  a.ghost {
    color: var(--muted);
    font-weight: 600;
  }
  footer {
    margin-top: 1.75rem;
    color: #a8a29e;
    font-size: 0.76rem;
  }
</style>
</head>
<body>
  <main class="card">
    <div class="mark"><img src="${FAVICON_DATA_URL}" alt="Begnon" /></div>
    <div class="pulse"><span class="dot"></span> API online</div>
    <h1>Begnon Commerce API</h1>
    <p class="lede">This is the Medusa engine room — order data, inventory, and checkout logic live here. There's nothing to browse on this URL itself; pick where you want to go.</p>
    <div class="actions">
      <a class="btn primary" href="/app">Open Admin Dashboard →</a>
      <a class="btn secondary" href="${shopUrl}">Visit the Storefront →</a>
      <a class="btn ghost" href="/health">Check API health</a>
    </div>
    <footer>Begnon · Style · Quality · Delivered</footer>
  </main>
</body>
</html>`;

  res.type("html").send(html);
}
