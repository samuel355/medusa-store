import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { useEffect, useLayoutEffect } from "react";

const BegnonAdminTheme = () => {
  useLayoutEffect(() => {
    const path = window.location.pathname.replace(/\/$/, "");
    if (path === "/app") {
      window.location.replace("/app/dashboard");
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
