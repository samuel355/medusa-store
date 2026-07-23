import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Begnon — Style, Quality, Delivered",
  description: "A premium Ghana-ready fashion storefront with Mobile Money checkout and transactional order updates.",
  applicationName: "Begnon",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Begnon"
  }
};

export const viewport: Viewport = {
  themeColor: "#f4752c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
