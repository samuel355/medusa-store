export const customerProfile = {
  name: "Ama Mensah",
  phone: "+233 24 000 0000",
  email: "ama@example.com",
  tier: "Gold customer",
  location: "East Legon, Accra",
  joined: "July 2026"
};

export const customerStats = [
  { label: "Total orders", value: "18" },
  { label: "Active deliveries", value: "2" },
  { label: "Wishlist items", value: "24" },
  { label: "Reward points", value: "8,420" }
];

export const orders = [
  {
    id: "EMB-24071",
    date: "Jul 16, 2026",
    status: "Out for delivery",
    payment: "Paid with Paystack",
    total: "GH₵2,840",
    items: "Astra Ember Jacket, Oro Runner",
    eta: "Today, 4:30 PM"
  },
  {
    id: "EMB-24062",
    date: "Jul 12, 2026",
    status: "Processing",
    payment: "Mobile money pending",
    total: "GH₵620",
    items: "Signal Knit Set",
    eta: "Tomorrow"
  },
  {
    id: "EMB-23988",
    date: "Jul 02, 2026",
    status: "Delivered",
    payment: "Paid with card",
    total: "GH₵940",
    items: "Molten Weekender",
    eta: "Delivered"
  }
];

export const trackingEvents = [
  {
    title: "Order confirmed",
    description: "Payment verified and order created.",
    time: "9:12 AM",
    state: "complete"
  },
  {
    title: "Fulfillment queued",
    description: "BullMQ worker assigned the order for packing.",
    time: "9:14 AM",
    state: "complete"
  },
  {
    title: "Packed and ready",
    description: "Package scanned at the Accra dispatch desk.",
    time: "11:05 AM",
    state: "complete"
  },
  {
    title: "Out for delivery",
    description: "Courier is heading to East Legon.",
    time: "2:20 PM",
    state: "active"
  },
  {
    title: "Delivered",
    description: "Customer confirmation pending.",
    time: "ETA 4:30 PM",
    state: "pending"
  }
];

export const settingsGroups = [
  {
    title: "Account access",
    items: ["Phone OTP enabled", "Email/password enabled", "Google sign-in connected"]
  },
  {
    title: "Notifications",
    items: ["SMS order updates via Arkesel", "Email receipts", "Back-in-stock alerts"]
  },
  {
    title: "Checkout preferences",
    items: ["Paystack cards", "Mobile money", "Default delivery: East Legon"]
  }
];

export const confirmations = [
  {
    title: "Payment confirmed",
    reference: "PSK-84A19F",
    description: "Paystack webhook verified and matched to order EMB-24071.",
    status: "Successful"
  },
  {
    title: "SMS sent",
    reference: "ARK-22019",
    description: "Customer received the order confirmation message.",
    status: "Delivered"
  },
  {
    title: "Fulfillment queued",
    reference: "BMQ-77821",
    description: "Order handoff created for packing and dispatch.",
    status: "Queued"
  }
];
