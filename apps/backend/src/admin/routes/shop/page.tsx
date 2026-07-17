import { defineRouteConfig } from "@medusajs/admin-sdk";
import { BuildingStorefront } from "@medusajs/icons";
import { Button, Container, Heading, Text } from "@medusajs/ui";
import { useEffect } from "react";

function getShopUrl() {
  if (window.location.hostname === "localhost") {
    return "http://localhost:3000/shop";
  }

  return `${window.location.protocol}//${window.location.hostname}/shop`;
}

const ShopRoute = () => {
  const shopUrl = getShopUrl();

  useEffect(() => {
    window.location.assign(shopUrl);
  }, []);

  return (
    <Container className="flex min-h-[420px] items-center justify-center border-orange-100 bg-[#fffaf5] p-8">
      <div className="flex max-w-[380px] flex-col items-center gap-y-4 rounded-2xl border border-orange-100 bg-white p-8 text-center shadow-sm">
        <div className="flex size-12 items-center justify-center rounded-full bg-orange-50 text-orange-600">
          <BuildingStorefront />
        </div>
        <Heading level="h1" className="text-stone-950">
          Opening storefront
        </Heading>
        <Text className="text-stone-600">
          You are being redirected to the customer shop.
        </Text>
        <Button asChild className="bg-orange-600 text-white hover:bg-orange-700">
          <a href={shopUrl}>Open shop</a>
        </Button>
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Shop",
  icon: BuildingStorefront,
  rank: 999,
});

export default ShopRoute;
