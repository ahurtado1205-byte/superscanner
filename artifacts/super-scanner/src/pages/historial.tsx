import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, ShoppingCart, Package, Search, Loader2, AlertCircle, FileDown } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import { useHistoryReport } from "@/hooks/use-shopping";
import { generateShoppingListPDF } from "@/lib/pdf-export";

interface ListSummary {
  id: number;
  name: string;
  createdAt: string;
  total: number;
  itemCount: number;
  itemsWithPrice: number;
}

interface PricePoint {
  listId: number;
  listName: string;
  date: string;
  price: number;
  units: number;
}

interface ItemPriceHistory {
  name: string;
  brand: string | null;
  points: PricePoint[];
}

// interface ReportData and fetchHistory removed because we now use useHistoryReport from hooks

function TrendBadge({ from, to }: { from: number; to: number }) {
  if (from === to) return <span className="text-xs text-muted-foreground flex items-center gap-1"><Minus className="w-3 h-3" /> Sin cambio</span>;
  const pct = Math.abs(((to - from) / from) * 100).toFixed(0);
  if (to > from) return (
    <span className="text-xs text-red-500 font-semibold flex items-center gap-1">
      <TrendingUp className="w-3 h-3" /> +{pct}%
    </span>
  );
  return (
    <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
      <TrendingDown className="w-3 h-3" /> -{pct}%
    </span>
  );
}

const CHART_COLOR = "#22c55e";

export default function Historial() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useHistoryReport();
  const error = !data && !isLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center">
        <div>
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error al cargar</h2>
          <p className="text-muted-foreground">No pudimos cargar el historial.</p>
        </div>
      </div>
    );
  }

  const listsWithTotal = data.lists.filter((l) => l.total > 0);

  const chartData = listsWithTotal.map((l) => ({
    name: l.name.length > 12 ? l.name.slice(0, 12) + "…" : l.name,
    fullName: l.name,
    total: l.total,
    fecha: format(new Date(l.createdAt), "d MMM", { locale: es }),
  }));

  const filteredItems = data.priceHistory.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.brand ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const itemsWithMultiplePoints = filteredItems.filter((i) => i.points.length > 1);
  const itemsWithOnePoint = filteredItems.filter((i) => i.points.length === 1);

  const totalSpent = data.lists.reduce((s, l) => s + l.total, 0);
  const avgPerList = listsWithTotal.length > 0 ? totalSpent / listsWithTotal.length : 0;

  // The lists are sorted by createdAt desc, so the first one is the most recent
  const lastOrder = data.lists.length > 0 ? data.lists[0] : null;
  const olderOrders = data.lists.length > 1 ? data.lists.slice(1) : [];

  return (
    <div className="min-h-screen pb-16 bg-background">
      <PageHeader title="Historial" backTo="/" />

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-8">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/50 rounded-2xl p-4 text-center shadow-sm"
          >
            <ShoppingCart className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{data.lists.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Compras</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-card border border-border/50 rounded-2xl p-4 text-center shadow-sm"
          >
            <Package className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{data.priceHistory.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Productos</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-primary/10 border border-primary/20 rounded-2xl p-4 text-center shadow-sm"
          >
            <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-primary">{formatPrice(avgPerList)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Promedio</p>
          </motion.div>
        </div>

        {/* ÚLTIMO PEDIDO DESTACADO */}
        {lastOrder && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="bg-primary/5 border border-primary/20 rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="bg-primary/10 px-5 py-4 border-b border-primary/20 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Tu Última Compra
                </h2>
                <p className="text-sm font-medium text-foreground mt-1">{lastOrder.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(lastOrder.createdAt), "d 'de' MMMM yyyy", { locale: es })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-primary">{formatPrice(lastOrder.total)}</p>
                <p className="text-xs text-muted-foreground">{lastOrder.itemCount} productos</p>
                <button
                  onClick={() => generateShoppingListPDF(lastOrder.fullList)}
                  className="mt-2 text-xs bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1.5 rounded-full font-bold transition-colors inline-flex items-center gap-1.5"
                >
                  <FileDown className="w-3.5 h-3.5" /> PDF
                </button>
              </div>
            </div>
            <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">Detalle de productos</p>
              {lastOrder.fullList.items.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center bg-card p-3 rounded-xl border border-border/40 shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-foreground truncate flex items-center gap-2">
                      {item.units > 1 && (
                        <span className="shrink-0 bg-muted text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                          x{item.units}
                        </span>
                      )}
                      {item.name}
                    </p>
                    {item.brand && <p className="text-xs text-muted-foreground truncate">{item.brand}</p>}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    {item.price ? (
                      <p className="font-bold text-sm">{formatPrice(item.price)}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">-</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Spending chart */}
        {chartData.length >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm"
          >
            <h2 className="text-base font-bold text-foreground mb-4">Gasto por compra</h2>
            {chartData.length === 1 ? (
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-semibold">{chartData[0].fullName}</p>
                  <p className="text-sm text-muted-foreground">{chartData[0].fecha}</p>
                </div>
                <p className="text-2xl font-bold text-primary">{formatPrice(chartData[0].total)}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(value: number) => [formatPrice(value), "Total"]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="total" fill={CHART_COLOR} radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        )}

        {/* List history */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-border/50">
            <h2 className="text-base font-bold text-foreground">Resumen por compra</h2>
          </div>
          {olderOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No hay compras anteriores registradas.</p>
          ) : (
            <div className="divide-y divide-border/40">
              {[...olderOrders].reverse().map((list, i) => (
                <div key={list.id} className="flex items-center justify-between px-5 py-3 gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold truncate text-sm">{list.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(list.createdAt), "d 'de' MMMM yyyy", { locale: es })} · {list.itemCount} {list.itemCount === 1 ? "producto" : "productos"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {list.total > 0 ? (
                      <div className="flex flex-col items-end">
                        <p className="font-bold text-primary">{formatPrice(list.total)}</p>
                        {i < olderOrders.length - 1 && (() => {
                          const prev = [...olderOrders].reverse()[i + 1];
                          return prev?.total > 0 ? <TrendBadge from={prev.total} to={list.total} /> : null;
                        })()}
                        <button
                          onClick={() => generateShoppingListPDF(list.fullList)}
                          className="mt-2 text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
                        >
                          <FileDown className="w-3 h-3" /> PDF
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Sin precios</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Item price tracker */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold flex-1">Evolución de precios</h2>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {filteredItems.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">
              {data.priceHistory.length === 0
                ? "Todavía no hay productos con precio registrado."
                : "No se encontraron productos con ese nombre."}
            </p>
          )}

          {/* Items tracked across multiple lists */}
          {itemsWithMultiplePoints.map((item) => {
            const sorted = [...item.points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const first = sorted[0];
            const last = sorted[sorted.length - 1];
            const lineData = sorted.map((p) => ({
              name: format(new Date(p.date), "d MMM", { locale: es }),
              fullName: p.listName,
              precio: p.price,
            }));

            return (
              <div key={item.name} className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-foreground">{item.name}</p>
                    {item.brand && <p className="text-xs text-muted-foreground">{item.brand}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary">{formatPrice(last.price)}</p>
                    <TrendBadge from={first.price} to={last.price} />
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={90}>
                  <LineChart data={lineData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      formatter={(value: number) => [formatPrice(value), "Precio"]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "10px",
                        fontSize: 12,
                      }}
                    />
                    <Line type="monotone" dataKey="precio" stroke={CHART_COLOR} strokeWidth={2} dot={{ r: 4, fill: CHART_COLOR }} />
                  </LineChart>
                </ResponsiveContainer>

                <div className="flex flex-wrap gap-2">
                  {sorted.map((p) => (
                    <span key={p.listId} className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                      {p.listName}: <span className="font-semibold text-foreground">{formatPrice(p.price)}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Items with only one price point */}
          {itemsWithOnePoint.length > 0 && (
            <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registrados una vez</p>
              </div>
              <div className="divide-y divide-border/40">
                {itemsWithOnePoint.map((item) => (
                  <div key={item.name} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      {item.brand && <p className="text-xs text-muted-foreground">{item.brand}</p>}
                    </div>
                    <p className="font-bold text-primary shrink-0">{formatPrice(item.points[0].price)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
