import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { useEffect, useLayoutEffect } from "react";

const FAVICON_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAQKADAAQAAAABAAAAQAAAAABGUUKwAAAIDElEQVR4Ae1bXWwUVRQ+987szu6ypd0usoiIxoARCkXSSHhTH0zEJx9M9MXERING4wNRBDSaJTH4/6KJGhJ98A1rTNT4phEfjDFogi3BIA1E/EEjClhaujsz9/idKTvd3e62q9yWdtuTlNmZe+fec7577vm7A9EiLSKwiMBCRkC1IjwXb0tdPH82P0zGa6X/le7TodhPa/23enVgZDpepgTg4hObr9OJ8GEmviswtNowJQk30w16JduVJlKsQseh3yDcF7h/y9s3cKQZT00BKO3ZeDexeiPhqFXlkCmE9POJHKUIvFNg+DyT2p168fu3G/HfEICRXRu3uVp9wIYy/jwTvF5IBxrhKuwJ4keWvDi4v759EgD/7Lkpr8Pk1wlNa2Xl24GwmLJvz+kEbU09P3CsWibgU0tJ492TdlXbCC/SYRtQylVdQZm310pLNAmAkM2d81zr62WM7n1os1bqdn59TY0nqwGAH1/jwXasDrk9VL8aCXgxYuaVF053LK1+XgPA2UxnCgB0taH8kffGsnaYgLuaAmDKw9nQUM60JwKExU2mXdPdFIBU0utWTJn22wBQf0jtkHKN4eYAOIrziJwSczvWq16///bbgTsMmJdVv1VjA4JQ512ldTtqgAgN+fGnC00BIEUFiZzalaJtoGh5tXw14roO16BT3bEtfgMBBEU1ALjVgiGLWs6TguPqHq3/lvAzIToXG5QoMaFKbpFEoiIJy0Q7kQRg4q9nKg6RRBbxUM0i1wAQhlwYZ6p1QRv1FGMDYY74xnyF5PSSlhkYYLUZbVvkHbjbz40yQ1E7khWI75JRK4FJb8pRK30BwnJIKsNhYXKob7iqeDAQPmIAuFjUY6MfLrMRAyQBQNmYz9IvDe6QSSo0uqv3Saz8FgkzEJq+jfYPKm2VKz+9oeCzvhdD7HEdtaJkMSETAKBzXWdG/TTmG5Y5q2zAJync5azFQBput44U/HD8iOFuG5Dad+SP5AsDr0Nv7ghZHZWtYotENmhVLjTDAkBEMQC//jmSRoc5EwVKFUdzeA/swWnXEgZG7JGibCah4nA4BiDbkejEZJ3oMmfIe/nID2Bwr2NLC0R+pZIpPRENxgAkyMnjxrO2BaaDUcfuYcqeXto54If0k3iVyyVZXGDp+uUGACBV7Ea+nJgtDTCGkpJ+n3zg+hQX8YfCXSMBVfHwOTiJQ268VI16tf5MgAyNuaryRjxsGIZXjfvtStPMXUvwgRDqlYvpzA+FwtKjY2NLj5We7n3/+LbaYkWFA036FBancntZVxnFTThxMBRb5YRLBUtzTMugMAGX9Bf+/R2VZ425JQD65fy1nfD+DUix00RBGnSe+pFoOJRgMgB4XJgt9U8i4RgLaG/HK98fmJrd8VaAdQO2aCtdp++DYcJgAoB4C7DEyJbmmJ4Lyc05nnuq/hd29qyA8LdITc8GSTiMkWINiJlgVtAAO5PYYLQyhqP1Qx4iQkvyR/mGdhDwbe+LArEIALnBURKCoMq0c+cKc2mVLRlMMefOdF1IiZQRANENU7fVmSxhyI55p2z4tLVYCADA4OZSxovC4XENYHeJFENt2ZnWZFeNLX7dy1nkBkjTD8k5nw2SbY5ocAksUE7Gi9xgp1K5kCgTxco2ZplmjDLQhvR7h3dufAwKqUU4HMgczpxN7lD7v/PrX4fbOgGm8fjy96gsMop+SU9TVByNADDKyePUwLMwfj3vDe9FDNQdOjQ2I1YExQCGrVN5WjnWcJk17EDDhoajT/1Q5kZQ5ZYDntAA1AC6EWo6IdRgNshDHFAqh7tPnuID63uIhv4qqbVvDJWazR0QXyclE1uE02IqUxi5wkgDQsUFT8Mc2PI1LXCqXe339A+UqX/qzj/v6OmWOCCwpgOSESLr0zoCIDKCOAqvqZNNzZKlVvi3Vkbq9pz7YCNWywmvLZKRWKkJALARCy1xY4uDFsdBgrRBMz8X2NZMIABXOAEA9n5hdl3g9AiUn+3ZhC9U+mGwCjMgvzAwbgO4SPriqLJSDK0Ry9Akkwprj0rsJV1TNMndyfujz2y6Rod0Hz5m2A3vuGwmvlKRwi/scBcXe5Lqt+19me6cj/I13Vyp2dcI8j9upCwOYY/CwHxj1HhZHKqMGgj1ojDaFw3J/CWM0Qlp1/CELGVxpqvh7zegaFGQ5GemzgcuVZeOX+BSn5vOhEkEQAgK7FkBqedjkvUwrutj/CCtHHpUQEa191as8K1Ru0QCmF+2oRi7sUDM1MyRzGPY5Ew5kXHZ85ca1p3RZ0QW5xRBROBmNBOq3Wyu+ucCNw5J08szqlNniXJY+9TMYl7PwpW9Fw1ASujh07mcDpEHwNLKF6ALhkRUCYf9gPO6HNAq7EWbkea8AFIiQHwssQb2mnot2r95IbwwKVqAnGATkjDVh+x0wVHkYpXa7CIo6F1I+7+y0hKUwBusgwJUHi3MK5Jg9fFsnQjNJYjHS2z8qUZt6k3ELOWFpAmi9BKnOaxe05lTg4exFz7K2Dp9nEvL3ISXNGJ0hP+ffvNt/pBW/YRYyHmqzPxjegGAgP8KIPnIiUCZJ28/eDCITWDpqQ3rUC59F0nMVklmJI6XmLkdSISUDDD6UtSYQz7Tg9mXBgdFthgAueFHe7J+p3M/MtF7IftaAJEFBDV9pN98IjDPsPQjcHfHYfD7h1Mj7+WLQ/9UZGgonAg9/MSN+ZCcJZSw9eVgZcpZvvqK3aQ/mt03dAaGvj1UepYhXJxuEYF2RuBfCyn9OtPDdHEAAAAASUVORK5CYII=";

const BegnonAdminTheme = () => {
  useLayoutEffect(() => {
    const path = window.location.pathname.replace(/\/$/, "");
    if (path === "/app") {
      window.location.replace("/app/dashboard");
    }
  }, []);

  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.type = "image/png";
    link.href = FAVICON_DATA_URL;

    if (!document.title || /medusa/i.test(document.title)) {
      document.title = "Begnon Admin";
    }
  }, []);

  useEffect(() => {
    function findDashboardEntry(anchor: HTMLAnchorElement) {
      let current: HTMLElement | null = anchor;

      while (current?.parentElement) {
        const parent = current.parentElement;
        const parentHasMultipleNavItems = parent.children.length > 2;
        const parentHasOrders = Boolean(parent.querySelector('a[href="/orders"]'));
        const parentHasProducts = Boolean(parent.querySelector('a[href="/products"]'));

        if (parentHasMultipleNavItems && parentHasOrders && parentHasProducts) {
          return current;
        }

        current = parent;
      }

      return anchor.parentElement;
    }

    function moveDashboardToTop() {
      const dashboardLink = document.querySelector<HTMLAnchorElement>(
        'nav a[href="/dashboard"], nav a[href$="/dashboard"]'
      );

      if (!dashboardLink) return;

      const dashboardEntry = findDashboardEntry(dashboardLink);
      const sidebarList = dashboardEntry?.parentElement;
      if (!dashboardEntry || !sidebarList) return;

      const searchEntry = Array.from(sidebarList.children).find((child) =>
        child.querySelector('button, [role="search"]')
      );
      const target = searchEntry?.nextElementSibling ?? sidebarList.firstElementChild;

      if (target && dashboardEntry !== target) {
        sidebarList.insertBefore(dashboardEntry, target);
      }
    }

    moveDashboardToTop();

    const observer = new MutationObserver(moveDashboardToTop);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return (
    <style>{`
      :root {
        --begnon-orange: #f4752c;
        --begnon-orange-dark: #b84a16;
        --begnon-orange-strong: #7a2f0d;
        --begnon-orange-soft: #fff7ed;
        --begnon-orange-soft-2: #ffedd5;
        --begnon-ink: #1c1917;
        --begnon-muted: #78716c;
        --begnon-border: #f5c9a8;

        --bg-base: #ffffff;
        --bg-base-hover: #fff7ed;
        --bg-base-pressed: #ffedd5;
        --bg-subtle: #fffaf5;
        --bg-subtle-hover: #fff7ed;
        --bg-subtle-pressed: #ffedd5;
        --bg-component: #ffffff;
        --bg-component-hover: #fff7ed;
        --bg-component-pressed: #ffedd5;
        --bg-field: #ffffff;
        --bg-field-hover: #fff7ed;
        --bg-field-component: #ffffff;
        --bg-field-component-hover: #fff7ed;
        --bg-highlight: #fff7ed;
        --bg-highlight-hover: #ffedd5;
        --bg-interactive: #f4752c;
        --border-base: #f5c9a8;
        --border-strong: #f89a5c;
        --border-interactive: #f4752c;
        --fg-base: #1c1917;
        --fg-subtle: #57534e;
        --fg-muted: #78716c;
        --fg-interactive: #f4752c;
        --fg-interactive-hover: #b84a16;
        --fg-on-color: #ffffff;
        --fg-on-inverted: #ffffff;
        --button-inverted: #f4752c;
        --button-inverted-hover: #b84a16;
        --button-inverted-pressed: #7a2f0d;
        --button-neutral: #fff7ed;
        --button-neutral-hover: #ffedd5;
        --button-neutral-pressed: #f5c9a8;
        color-scheme: light;
      }

      html,
      .dark,
      [data-theme="dark"] {
        --bg-base: #ffffff;
        --bg-base-hover: #fff7ed;
        --bg-base-pressed: #ffedd5;
        --bg-subtle: #fffaf5;
        --bg-subtle-hover: #fff7ed;
        --bg-subtle-pressed: #ffedd5;
        --bg-component: #ffffff;
        --bg-component-hover: #fff7ed;
        --bg-component-pressed: #ffedd5;
        --bg-field: #ffffff;
        --bg-field-hover: #fff7ed;
        --bg-field-component: #ffffff;
        --bg-field-component-hover: #fff7ed;
        --bg-highlight: #fff7ed;
        --bg-highlight-hover: #ffedd5;
        --bg-interactive: #f4752c;
        --border-base: #f5c9a8;
        --border-strong: #f89a5c;
        --border-interactive: #f4752c;
        --fg-base: #1c1917;
        --fg-subtle: #57534e;
        --fg-muted: #78716c;
        --fg-interactive: #f4752c;
        --fg-interactive-hover: #b84a16;
        --fg-on-color: #ffffff;
        --fg-on-inverted: #ffffff;
        --button-inverted: #f4752c;
        --button-inverted-hover: #b84a16;
        --button-inverted-pressed: #7a2f0d;
        --button-neutral: #fff7ed;
        --button-neutral-hover: #ffedd5;
        --button-neutral-pressed: #f5c9a8;
        color-scheme: light;
      }

      body,
      .bg-ui-bg-subtle,
      .bg-ui-bg-base {
        background-color: var(--bg-subtle) !important;
      }

      .bg-ui-bg-base,
      .\\!bg-ui-bg-base,
      .bg-ui-bg-component,
      .bg-ui-bg-field,
      .bg-ui-bg-field-component,
      [role="dialog"],
      [data-radix-popper-content-wrapper] .bg-ui-bg-base {
        background-color: #ffffff !important;
      }

      .bg-ui-bg-base-hover,
      .hover\\:bg-ui-bg-base-hover:hover,
      .hover\\:bg-ui-bg-subtle-hover:hover,
      .focus-visible\\:bg-ui-bg-base-hover:focus-visible,
      .aria-selected\\:bg-ui-bg-base-hover[aria-selected="true"],
      .data-\\[state\\=open\\]\\:bg-ui-bg-subtle-hover[data-state="open"] {
        background-color: var(--begnon-orange-soft) !important;
      }

      .bg-ui-bg-base-pressed,
      .hover\\:bg-ui-bg-base-pressed:hover,
      .active\\:bg-ui-bg-base-pressed:active,
      .active\\:bg-ui-bg-subtle-pressed:active,
      .focus-visible\\:bg-ui-bg-base-pressed:focus-visible,
      .aria-selected\\:bg-ui-bg-base-pressed[aria-selected="true"] {
        background-color: var(--begnon-orange-soft-2) !important;
      }

      .border-ui-border-base,
      .border-r-ui-border-base,
      .shadow-borders-base,
      .ring-ui-border-base {
        border-color: var(--begnon-border) !important;
        --tw-ring-color: var(--begnon-border) !important;
        --tw-shadow-color: var(--begnon-border) !important;
      }

      .text-ui-fg-base {
        color: var(--begnon-ink) !important;
      }

      .text-ui-fg-subtle,
      .text-ui-fg-muted {
        color: var(--begnon-muted) !important;
      }

      .text-ui-fg-interactive,
      .text-ui-fg-interactive-hover,
      .hover\\:text-ui-fg-interactive-hover:hover,
      .focus-visible\\:text-ui-fg-interactive-hover:focus-visible,
      .group[data-state="open"] .group-data-\\[state\\=open\\]\\:text-ui-fg-interactive,
      .group\\/trigger[data-state="active"] .group-data-\\[state\\=active\\]\\/trigger\\:text-ui-fg-interactive {
        color: var(--begnon-orange) !important;
      }

      .bg-ui-button-inverted,
      .hover\\:bg-ui-button-inverted-hover:hover,
      .active\\:bg-ui-button-inverted-pressed:active,
      .bg-ui-bg-interactive,
      .bg-ui-fg-interactive {
        background-color: var(--begnon-orange) !important;
        color: #ffffff !important;
      }

      .bg-ui-button-neutral,
      .hover\\:enabled\\:bg-ui-bg-base-hover:enabled:hover {
        background-color: var(--begnon-orange-soft) !important;
        color: var(--begnon-orange-dark) !important;
      }

      .fill-ui-button-inverted {
        fill: #ffffff !important;
      }

      .shadow-elevation-card-rest,
      .shadow-elevation-flyout,
      .shadow-elevation-modal {
        box-shadow: 0 12px 30px rgba(122, 47, 13, 0.08), 0 1px 0 rgba(248, 154, 92, 0.18) !important;
      }

      aside,
      nav,
      header,
      [class*="sticky top-0"],
      [class*="sticky bottom-0"] {
        border-color: var(--begnon-border) !important;
      }

      a[href="/app/dashboard"][aria-current="page"],
      a[href="/app/shop"][aria-current="page"],
      a[href$="/dashboard"][aria-current="page"],
      a[href$="/shop"][aria-current="page"],
      a[aria-current="page"],
      a[data-state="active"],
      [role="link"][aria-current="page"] {
        background: var(--begnon-orange-soft) !important;
        color: var(--begnon-orange-dark) !important;
        box-shadow: inset 3px 0 0 var(--begnon-orange), 0 6px 18px rgba(244, 117, 44, 0.10) !important;
      }

      a[href="/app/dashboard"],
      a[href="/dashboard"],
      a[href$="/dashboard"] {
        order: -9999 !important;
      }

      nav .flex.flex-col > div:has(a[href="/dashboard"]),
      nav .flex.flex-col > div:has(a[href$="/dashboard"]) {
        order: -9999 !important;
      }

      a[href="/app/dashboard"]:hover,
      a[href="/dashboard"]:hover,
      a[href="/app/shop"]:hover,
      a[href$="/dashboard"]:hover,
      a[href$="/shop"]:hover,
      a[href="/app/orders"]:hover,
      a[href="/app/products"]:hover,
      a[href="/app/customers"]:hover,
      a[href="/app/inventory"]:hover,
      a[href="/app/promotions"]:hover,
      a[href="/app/settings"]:hover {
        background: var(--begnon-orange-soft) !important;
        color: var(--begnon-orange-dark) !important;
      }

      input:focus,
      textarea:focus,
      button:focus-visible,
      a:focus-visible {
        outline-color: var(--begnon-orange) !important;
        box-shadow: 0 0 0 2px rgba(244, 117, 44, 0.16) !important;
      }

      table thead,
      .\\[\\&_tr\\]\\:bg-ui-bg-subtle tr {
        background-color: #fff7ed !important;
      }

      .begnon-admin-accent {
        color: var(--begnon-orange);
      }
    `}</style>
  );
};

export const config = defineWidgetConfig({
  zone: ["login.before", "topbar"],
});

export default BegnonAdminTheme;
