
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  ClipboardList,
  Package,
  Plus,
  ShoppingCart,
  CheckCircle2,
  Settings2,
} from "lucide-react";
import { motion } from "framer-motion";

const STORAGE_KEY = "lean_cafe_order_app_v1";

const defaultData = {
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

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultData;
  } catch {
    return defaultData;
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function peso(n) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(n || 0));
}

function flattenCart(cart) {
  const items = [];
  cart.forEach((line) => {
    for (let i = 0; i < line.qty; i += 1) items.push(line.product);
  });
  return items;
}

function applyPromo(cart, promos) {
  const baseSubtotal = cart.reduce(
    (sum, line) => sum + line.product.price * line.qty,
    0
  );
  let best = { promoName: null, discount: 0, total: baseSubtotal };
  const flat = flattenCart(cart);

  promos
    .filter((p) => p.enabled)
    .forEach((promo) => {
      const eligible = flat.filter(
        (item) => Number(item.price) === Number(promo.eligiblePrice)
      );
      const bundles = Math.floor(
        eligible.length / Number(promo.requiredQty || 2)
      );

      if (bundles > 0) {
        const normal =
          bundles *
          Number(promo.requiredQty) *
          Number(promo.eligiblePrice);
        const discounted = bundles * Number(promo.bundlePrice);
        const discount = normal - discounted;
        const total = baseSubtotal - discount;

        if (total < best.total) {
          best = {
            promoName: promo.name,
            discount,
            total,
          };
        }
      }
    });

  return best;
}

export default function LeanCafeOrderApp() {
  const [db, setDb] = useState(loadData());
  const [activeTab, setActiveTab] = useState("order");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [paymentId, setPaymentId] = useState(""); // "cash" or "gcash"
  const [tendered, setTendered] = useState("");

  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    stock: "",
    lowStockAt: "5",
  });

  const [newPromo, setNewPromo] = useState({
    name: "2 for 99",
    requiredQty: "2",
    bundlePrice: "99",
    eligiblePrice: "59",
    enabled: true,
  });

  useEffect(() => {
    saveData(db);
  }, [db]);

  function updateDb(updater) {
    setDb((prev) =>
      typeof updater === "function" ? updater(prev) : updater
    );
  }

  const products = db.products.filter(
    (p) =>
      p.active &&
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  const promoResult = useMemo(
    () => applyPromo(cart, db.promos),
    [cart, db.promos]
  );

  const subtotal = cart.reduce(
    (sum, line) => sum + line.product.price * line.qty,
    0
  );
  const total = promoResult.total;

  const change =
    paymentId === "cash"
      ? Math.max(Number(tendered || 0) - Number(total || 0), 0)
      : 0;

  const pendingOrders = db.orders.filter(
    (o) => o.status === "pending"
  );
  const completedOrders = db.orders.filter(
    (o) => o.status === "completed"
  );
  const lowStock = db.products.filter(
    (p) => p.active && Number(p.stock) <= Number(p.lowStockAt)
  );

  function addToCart(product) {
    setCart((prev) => {
      const found = prev.find(
        (line) => line.product.id === product.id
      );

      if (found) {
        if (found.qty >= product.stock) return prev;
        return prev.map((line) =>
          line.product.id === product.id
            ? { ...line, qty: line.qty + 1 }
            : line
        );
      }

      if (product.stock <= 0) return prev;

      return [...prev, { product, qty: 1 }];
    });
  }

  function setQty(productId, qty) {
    const product = db.products.find((p) => p.id === productId);
    const safeQty = Math.max(
      0,
      Math.min(Number(qty || 0), Number(product?.stock || 0))
    );

    setCart((prev) =>
      safeQty === 0
        ? prev.filter((line) => line.product.id !== productId)
        : prev.map((line) =>
            line.product.id === productId
              ? { ...line, qty: safeQty }
              : line
          )
    );
  }

  function resetOrder() {
    setCart([]);
    setPaymentId("");
    setTendered("");
  }

  function placeOrder() {
    if (cart.length === 0 || !paymentId) return;

    if (paymentId === "cash" && Number(tendered || 0) < Number(total))
      return;

    const order = {
      id: crypto.randomUUID(),
      orderNo: `ORD-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      status: "pending",
      items: cart.map((line) => ({
        name: line.product.name,
        qty: line.qty,
        price: line.product.price,
      })),
      subtotal,
      promoName: promoResult.promoName,
      discount: promoResult.discount,
      total,
      paymentName: paymentId === "cash" ? "Cash" : "GCash",
      tendered: paymentId === "cash" ? Number(tendered || 0) : null,
      change: paymentId === "cash" ? change : null,
    };

    updateDb((prev) => ({
      ...prev,
      products: prev.products.map((product) => {
        const ordered = cart.find(
          (line) => line.product.id === product.id
        );
        return ordered
          ? {
              ...product,
              stock:
                Number(product.stock) - Number(ordered.qty),
            }
          : product;
      }),
      orders: [order, ...prev.orders],
    }));

    resetOrder();
    setActiveTab("pending");
  }

  function completeOrder(orderId) {
    updateDb((prev) => ({
      ...prev,
      orders: prev.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: "completed",
              completedAt: new Date().toISOString(),
            }
          : o
      ),
    }));
  }

  function addProduct() {
    if (!newProduct.name || !newProduct.price) return;

    updateDb((prev) => ({
      ...prev,
      products: [
        {
          id: crypto.randomUUID(),
          name: newProduct.name,
          price: Number(newProduct.price),
          stock: Number(newProduct.stock || 0),
          lowStockAt: Number(newProduct.lowStockAt || 5),
          active: true,
        },
        ...prev.products,
      ],
    }));

    setNewProduct({
      name: "",
      price: "",
      stock: "",
      lowStockAt: "5",
    });
  }

  function savePromo() {
    updateDb((prev) => ({
      ...prev,
      promos: [
        {
          id: crypto.randomUUID(),
          name: newPromo.name,
          requiredQty: Number(newPromo.requiredQty),
          bundlePrice: Number(newPromo.bundlePrice),
          eligiblePrice: Number(newPromo.eligiblePrice),
          enabled: newPromo.enabled,
          description: `Applies when ${newPromo.requiredQty} drinks priced ${newPromo.eligiblePrice} are selected.`,
        },
      ],
    }));
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-0 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cafe Order App</h1>
            <p className="text-sm text-neutral-500">
              Simple one-tablet order flow for a small cafe.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Pending: {pendingOrders.length}
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Completed: {completedOrders.length}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Low Stock: {lowStock.length}
            </Badge>
          </div>
        </motion.div>

        {/* Low Stock Warning */}
        {lowStock.length > 0 && (
          <Card className="rounded-2xl border-amber-200 bg-amber-50 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4 text-sm">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <span className="font-semibold">Low stock warning:</span>{" "}
                {lowStock.map((p) => `${p.name} (${p.stock})`).join(", ")}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* TABS HEADER */}
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-transparent p-0 md:grid-cols-4">
            <TabsTrigger value="order" className="rounded-2xl border bg-white py-3">
              Take Order
            </TabsTrigger>
            <TabsTrigger value="pending" className="rounded-2xl border bg-white py-3">
              Pending
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-2xl border bg-white py-3">
              Completed
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-2xl border bg-white py-3">
              Settings
            </TabsTrigger>
          </TabsList>

          {/* ============ ORDER TAB ============ */}
          <TabsContent value="order" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              {/* PRODUCT LIST */}
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" /> Choose Drinks
                  </CardTitle>
                  <CardDescription>Tap once to add. Adjust quantity only when needed.</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Input
                    placeholder="Search product..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="rounded-xl"
                  />

                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {products.map((product) => {
                      const inCart = cart.find((c) => c.product.id === product.id);

                      return (
                        <Button
                          key={product.id}
                          variant="outline"
                          className="h-auto justify-between rounded-2xl p-4 text-left cursor-pointer touch-manipulation"
                          onClick={() => addToCart(product)}
                          disabled={product.stock <= 0}
                        >
                          <div>
                            <div className="font-semibold">{product.name}</div>
                            <div className="mt-2 text-sm font-medium">{peso(product.price)}</div>
                          </div>

                          <div className="text-right text-xs text-neutral-500">
                            <div>Stock: {product.stock}</div>
                            {inCart ? (
                              <div className="mt-1 font-semibold text-neutral-900">x{inCart.qty}</div>
                            ) : null}
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* CURRENT ORDER */}
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Current Order</CardTitle>
                  <CardDescription>Promo applies automatically.</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* ORDER ITEMS */}
                  <ScrollArea className="max-h-[40vh] pr-3 overflow-scroll touch-auto">
                    <div className="space-y-3">
                      {cart.length === 0 ? (
                        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-neutral-500">
                          No items yet.
                        </div>
                      ) : (
                        cart.map((line) => (
                          <div key={line.product.id} className="rounded-2xl border p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-medium">{line.product.name}</div>
                                <div className="text-sm text-neutral-500">
                                  {peso(line.product.price)} each
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl"
                                  onClick={() => setQty(line.product.id, line.qty - 1)}
                                >
                                  -
                                </Button>

                                <Input
                                  type="number"
                                  value={line.qty}
                                  onChange={(e) => setQty(line.product.id, e.target.value)}
                                  className="w-16 rounded-xl text-center"
                                />

                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl"
                                  onClick={() => setQty(line.product.id, line.qty + 1)}
                                >
                                  +
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>

                  <Separator />

                  {/* TOTALS */}
                  <div className="space-y-2 rounded-2xl bg-neutral-50 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{peso(subtotal)}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span>Promo</span>
                      <span>
                        {promoResult.promoName
                          ? `${promoResult.promoName} (-${peso(promoResult.discount)})`
                          : "None"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{peso(total)}</span>
                    </div>
                  </div>

                  {/* PAYMENT BUTTONS */}
                  <div className="space-y-2">
                    <Label>Payment</Label>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        className={`rounded-2xl py-3 ${
                          paymentId === "cash" ? "bg-blue-600 text-white" : ""
                        }`}
                        variant={paymentId === "cash" ? "default" : "outline"}
                        onClick={() => {
                          setPaymentId("cash");
                          setTendered("");
                        }}
                      >
                        Cash
                      </Button>

                      <Button
                        className={`rounded-2xl py-3 ${
                          paymentId === "gcash" ? "bg-blue-600 text-white" : ""
                        }`}
                        variant={paymentId === "gcash" ? "default" : "outline"}
                        onClick={() => {
                          setPaymentId("gcash");
                          setTendered("");
                        }}
                      >
                        GCash
                      </Button>
                    </div>
                  </div>

                  {/* CASH FIELDS */}
                  {paymentId === "cash" && (
                    <div className="space-y-2">
                      <Label>Tendered Amount</Label>
                      <Input
                        type="number"
                        value={tendered}
                        onChange={(e) => setTendered(e.target.value)}
                        placeholder="Enter cash received"
                        className="rounded-xl"
                      />
                      <div className="rounded-2xl bg-neutral-50 p-3 text-sm">
                        Change: <span className="font-semibold">{peso(change)}</span>
                      </div>
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  <div className="flex gap-2">
                    <Button className="flex-1 rounded-2xl" onClick={placeOrder}>
                      Place Order
                    </Button>

                    <Button variant="outline" className="rounded-2xl" onClick={resetOrder}>
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ============ PENDING TAB ============ */}
          <TabsContent value="pending" className="space-y-4">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" /> Pending Orders
                </CardTitle>
                <CardDescription>
                  Kitchen prepares, cashier serves, then tap complete.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {pendingOrders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-neutral-500">
                    No pending orders.
                  </div>
                ) : (
                  pendingOrders.map((order) => (
                    <div key={order.id} className="rounded-2xl border p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{order.orderNo}</div>
                          <div className="text-xs text-neutral-500">
                            {new Date(order.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <Badge>Pending</Badge>
                      </div>

                      <div className="space-y-1 text-sm">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span>{item.name}</span>
                            <span>x{item.qty}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 text-sm text-neutral-600">
                        Payment: {order.paymentName} • Total: {peso(order.total)}
                      </div>

                      <Button
                        className="mt-4 w-full rounded-2xl"
                        onClick={() => completeOrder(order.id)}
                      >
                        Mark Complete
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ COMPLETED TAB ============ */}
          <TabsContent value="completed" className="space-y-4">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" /> Completed Orders
                </CardTitle>
                <CardDescription>Recent served orders.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {completedOrders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-neutral-500">
                    No completed orders yet.
                  </div>
                ) : (
                  completedOrders.map((order) => (
                    <div key={order.id} className="rounded-2xl border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{order.orderNo}</div>
                          <div className="text-xs text-neutral-500">
                            {new Date(order.completedAt || order.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <Badge variant="secondary">Completed</Badge>
                      </div>

                      <div className="mt-2 text-sm text-neutral-600">
                        {order.items
                          .map((i) => `${i.name} x${i.qty}`)
                          .join(" • ")}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ SETTINGS TAB ============ */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* PRODUCTS */}
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" /> Products
                  </CardTitle>
                  <CardDescription>Add drinks and track stock.</CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="grid gap-2 md:grid-cols-2">
                    <Input
                      placeholder="Product name"
                      value={newProduct.name}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, name: e.target.value })
                      }
                      className="rounded-xl"
                    />

                    <Input
                      type="number"
                      placeholder="Price"
                      value={newProduct.price}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, price: e.target.value })
                      }
                      className="rounded-xl"
                    />

                    <Input
                      type="number"
                      placeholder="Stock"
                      value={newProduct.stock}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, stock: e.target.value })
                      }
                      className="rounded-xl"
                    />

                    <Input
                      type="number"
                      placeholder="Low stock at"
                      value={newProduct.lowStockAt}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          lowStockAt: e.target.value,
                        })
                      }
                      className="rounded-xl"
                    />
                  </div>

                  <Button className="w-full rounded-2xl" onClick={addProduct}>
                    <Plus className="mr-2 h-4 w-4" /> Add Product
                  </Button>

                  <Separator />

                  <div className="space-y-2">
                    {db.products.map((product) => (
                      <div
                        key={product.id}
                        className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <div className="font-semibold">{product.name}</div>
                          <div className="text-sm text-neutral-500">
                            {peso(product.price)} • Stock {product.stock}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {Number(product.stock) <= Number(product.lowStockAt) ? (
                            <Badge>Low Stock</Badge>
                          ) : null}

                          <Button
                            variant="outline"
                            className="rounded-xl"
                            onClick={() =>
                              updateDb((prev) => ({
                                ...prev,
                                products: prev.products.map((p) =>
                                  p.id === product.id
                                    ? {
                                        ...p,
                                        stock: Number(p.stock) + 1,
                                      }
                                    : p
                                ),
                              }))
                            }
                          >
                            +1
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* PROMO */}
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5" /> Promo
                  </CardTitle>
                  <CardDescription>Automatic discount settings.</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Promo Name</Label>
                    <Input
                      value={newPromo.name}
                      onChange={(e) =>
                        setNewPromo({ ...newPromo, name: e.target.value })
                      }
                      className="rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={newPromo.requiredQty}
                      onChange={(e) =>
                        setNewPromo({
                          ...newPromo,
                          requiredQty: e.target.value,
                        })
                      }
                      className="rounded-xl"
                    />
                    <Input
                      type="number"
                      placeholder="Bundle price"
                      value={newPromo.bundlePrice}
                      onChange={(e) =>
                        setNewPromo({
                          ...newPromo,
                          bundlePrice: e.target.value,
                        })
                      }
                      className="rounded-xl"
                    />
                    <Input
                      type="number"
                      placeholder="Eligible price"
                      value={newPromo.eligiblePrice}
                      onChange={(e) =>
                        setNewPromo({
                          ...newPromo,
                          eligiblePrice: e.target.value,
                        })
                      }
                      className="rounded-xl"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border p-3">
                    <Label>Promo Enabled</Label>
                    <Switch
                      checked={newPromo.enabled}
                      onCheckedChange={(v) =>
                        setNewPromo({ ...newPromo, enabled: v })
                      }
                    />
                  </div>

                  <Button className="w-full rounded-2xl" onClick={savePromo}>
                    Save Promo
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
