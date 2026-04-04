"use client";

// @ts-nocheck

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

/* -----------------------------
   SIMPLE SINGLE‑TABLET CAFE POS 
------------------------------*/

const STORAGE_KEY = "lean_cafe_order_app_v1";

const defaultData = {
  products: [
    { id: crypto.randomUUID(), name: "Seasalt Latte", price: 59, stock: 20, lowStockAt: 5, active: true },
    { id: crypto.randomUUID(), name: "Caramel Macchiato", price: 59, stock: 18, lowStockAt: 5, active: true },
    { id: crypto.randomUUID(), name: "Matcha Latte", price: 59, stock: 15, lowStockAt: 5, active: true },
    { id: crypto.randomUUID(), name: "Iced Black", price: 39, stock: 25, lowStockAt: 5, active: true },
    { id: crypto.randomUUID(), name: "Strawberry Matcha", price: 79, stock: 10, lowStockAt: 3, active: true },
  ],

  promos: [
    {
      id: crypto.randomUUID(),
      name: "2 for 99",
      enabled: true,
      requiredQty: 2,
      bundlePrice: 99,
      eligiblePrice: 59,
    },
  ],

  payments: [
    { id: crypto.randomUUID(), name: "Cash", type: "cash", active: true },
    { id: crypto.randomUUID(), name: "GCash", type: "digital", active: true },
    { id: crypto.randomUUID(), name: "Maya", type: "digital", active: true },
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
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(n || 0));
}

function flattenCart(cart) {
  const items = [];
  cart.forEach((line) => {
    for (let i = 0; i < line.qty; i++) items.push(line.product);
  });
  return items;
}

function applyPromo(cart, promos) {
  const subtotal = cart.reduce((sum, line) => sum + line.product.price * line.qty, 0);
  let best = { promoName: null, discount: 0, total: subtotal };

  const flat = flattenCart(cart);

  promos.filter((p) => p.enabled).forEach((promo) => {
    const eligible = flat.filter((item) => Number(item.price) === Number(promo.eligiblePrice));
    const bundles = Math.floor(eligible.length / Number(promo.requiredQty));

    if (bundles > 0) {
      const normal = bundles * promo.requiredQty * promo.eligiblePrice;
      const discounted = bundles * promo.bundlePrice;
      const discount = normal - discounted;

      if (subtotal - discount < best.total) {
        best = {
          promoName: promo.name,
          discount,
          total: subtotal - discount,
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
  const [paymentId, setPaymentId] = useState("");
  const [tendered, setTendered] = useState("");

  const [newProduct, setNewProduct] = useState({ name: "", price: "", stock: "", lowStockAt: "5" });
  const [newPayment, setNewPayment] = useState({ name: "", type: "cash", active: true });
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

  function updateDb(fn) {
    setDb((prev) => (typeof fn === "function" ? fn(prev) : fn));
  }

  const products = db.products.filter(
    (p) => p.active && p.name.toLowerCase().includes(search.toLowerCase())
  );
  const promoResult = useMemo(() => applyPromo(cart, db.promos), [cart, db.promos]);
  const subtotal = cart.reduce((sum, line) => sum + line.product.price * line.qty, 0);
  const total = promoResult.total;
  const selectedPayment = db.payments.find((p) => p.id === paymentId);
  const change =
    selectedPayment?.type === "cash"
      ? Math.max(Number(tendered) - Number(total), 0)
      : 0;

  const pendingOrders = db.orders.filter((o) => o.status === "pending");
  const completedOrders = db.orders.filter((o) => o.status === "completed");
  const lowStock = db.products.filter(
    (p) => p.active && Number(p.stock) <= Number(p.lowStockAt)
  );

  function addToCart(product) {
    setCart((prev) => {
      const found = prev.find((line) => line.product.id === product.id);

      if (found) {
        if (found.qty >= product.stock) return prev;
        return prev.map((line) =>
          line.product.id === product.id ? { ...line, qty: line.qty + 1 } : line
        );
      }

      if (product.stock <= 0) return prev;
      return [...prev, { product, qty: 1 }];
    });
  }

  function setQty(productId, qty) {
    const product = db.products.find((p) => p.id === productId);
    const safeQty = Math.max(0, Math.min(Number(qty), Number(product?.stock)));

    setCart((prev) =>
      safeQty === 0
        ? prev.filter((line) => line.product.id !== productId)
        : prev.map((line) =>
            line.product.id === productId ? { ...line, qty: safeQty } : line
          )
    );
  }

  function placeOrder() {
    if (!cart.length || !selectedPayment) return;
    if (selectedPayment.type === "cash" && Number(tendered) < total) return;

    const order = {
      id: crypto.randomUUID(),
      orderNo: `ORD-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      status: "pending",
      items: cart.map((l) => ({
        name: l.product.name,
        qty: l.qty,
        price: l.product.price,
      })),
      subtotal,
      promoName: promoResult.promoName,
      discount: promoResult.discount,
      total,
      paymentName: selectedPayment.name,
      tendered: selectedPayment.type === "cash" ? Number(tendered) : null,
      change: selectedPayment.type === "cash" ? change : null,
    };

    updateDb((prev) => ({
      ...prev,
      products: prev.products.map((p) => {
        const found = cart.find((line) => line.product.id === p.id);
        return found ? { ...p, stock: p.stock - found.qty } : p;
      }),
      orders: [order, ...prev.orders],
    }));

    setCart([]);
    setPaymentId("");
    setTendered("");
    setActiveTab("pending");
  }

  function completeOrder(id) {
    updateDb((prev) => ({
      ...prev,
      orders: prev.orders.map((o) =>
        o.id === id ? { ...o, status: "completed", completedAt: new Date().toISOString() } : o
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
          stock: Number(newProduct.stock ?? 0),
          lowStockAt: Number(newProduct.lowStockAt ?? 5),
          active: true,
        },
        ...prev.products,
      ],
    }));

    setNewProduct({ name: "", price: "", stock: "", lowStockAt: "5" });
  }

  function addPayment() {
    if (!newPayment.name) return;
    updateDb((prev) => ({
      ...prev,
      payments: [...prev.payments, { id: crypto.randomUUID(), ...newPayment }],
    }));
    setNewPayment({ name: "", type: "cash", active: true });
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
        },
      ],
    }));
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ✅ FIXED HEADER (missing </p> bug solved) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Cafe Order App
            </h1>

            {/* ✅ This <p> was missing a closing tag — fixed */}
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

        {/* TABS */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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

          {/* ORDER TAB */}
          <TabsContent value="order" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">

              {/* LEFT – PRODUCTS */}
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" /> Choose Drinks
                  </CardTitle>
                  <CardDescription>
                    Tap once to add. Adjust quantity only when needed.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Input
                    placeholder="Search product..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="rounded-xl"
                  />

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {products.map((product) => {
                      const inCart = cart.find((c) => c.product.id === product.id);

                      return (
                        <Button
                          key={product.id}
                          variant="outline"
                          className="h-auto justify-between rounded-2xl p-4 text-left"
                          onClick={() => addToCart(product)}
                          disabled={product.stock <= 0}
                        >
                          <div>
                            <div className="font-semibold">{product.name}</div>
                            <div className="mt-2 text-sm font-medium">{peso(product.price)}</div>
                          </div>

