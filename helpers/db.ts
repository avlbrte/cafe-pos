
// helpers/db.ts
// Extracted from original page.tsx (1:1 modularization)

export const STORAGE_KEY = "lean_cafe_order_app_v1";

export const defaultData = {
  products: [
    {
      id: crypto.randomUUID(),
      name: "Seasalt Latte",
      price: 59,
      stock: 20,
      lowStockAt: 5,
      active: true,
    },
    {
      id: crypto.randomUUID(),
      name: "Caramel Macchiato",
      price: 59,
      stock: 18,
      lowStockAt: 5,
      active: true,
    },
    {
      id: crypto.randomUUID(),
      name: "Matcha Latte",
      price: 59,
      stock: 15,
      lowStockAt: 5,
      active: true,
    },
    {
      id: crypto.randomUUID(),
      name: "Iced Black",
      price: 39,
      stock: 25,
      lowStockAt: 5,
      active: true,
    },
    {
      id: crypto.randomUUID(),
      name: "Strawberry Matcha",
      price: 79,
      stock: 10,
      lowStockAt: 3,
      active: true,
    },
  ],
  promos: [
    {
      id: crypto.randomUUID(),
      name: "2 for 99",
      enabled: true,
      requiredQty: 2,
      bundlePrice: 99,
      eligiblePrice: 59,
      description: "Applies when 2 selected drinks are priced at 59.",
    },
  ],
  orders: [],
};

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultData;
  } catch {
    return defaultData;
  }
}

export function saveData(data: any) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
