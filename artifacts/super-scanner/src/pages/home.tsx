import { useState } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ChevronRight, Plus, Calendar, Loader2, Trash2, BarChart2, ClipboardList, ShoppingCart } from "lucide-react";
import { useShoppingLists, useCreateShoppingList, useDeleteShoppingList } from "@/hooks/use-shopping";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";

interface ListSummary {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  shareToken?: string | null;
  itemCount: number;
  pendingCount: number;
  checkedCount: number;
  total: number;
  pendingTotal: number;
  checkedTotal: number;
}

function ListCard({ list, onDelete }: { list: ListSummary; onDelete: (e: React.MouseEvent, id: string) => void }) {
  const isPrecompra = list.type === "precompra";
  const progress = list.itemCount > 0 ? Math.round((list.checkedCount / list.itemCount) * 100) : 0;

  return (
    <Link href={`/list/${list.id}`}>
      <div className="group relative bg-card p-5 rounded-2xl shadow-sm border border-border/50 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-start gap-4 min-w-0">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isPrecompra ? "bg-violet-100 text-violet-600" : "bg-primary/10 text-primary"}`}>
              {isPrecompra ? <ClipboardList className="w-6 h-6" /> : <ShoppingBag className="w-6 h-6" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-foreground mb-0.5 group-hover:text-primary transition-colors truncate">{list.name}</h3>
              <div className="flex items-center text-xs text-muted-foreground gap-2">
                <Calendar className="w-3 h-3" />
                {format(list.createdAt?.toDate ? list.createdAt.toDate() : new Date(list.createdAt || Date.now()), "d 'de' MMMM", { locale: es })}
                {(list.itemCount || 0) > 0 && (
                  <span>· {list.pendingCount} pendientes</span>
                )}
              </div>

              {/* Totals */}
              {list.total > 0 && (
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-base font-bold text-primary">{formatPrice(list.total)}</span>
                  {list.checkedTotal > 0 && (
                    <span className="text-xs text-muted-foreground line-through">{formatPrice(list.checkedTotal)} en carrito</span>
                  )}
                </div>
              )}

              {/* Progress bar for precompra */}
              {isPrecompra && list.itemCount > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{list.checkedCount}/{list.itemCount} listos</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden w-40">
                    <div
                      className="h-full bg-violet-500 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => onDelete(e, list.id)}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/50 text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: lists, isLoading, error } = useShoppingLists();
  const { mutate: createList, isPending: isCreating } = useCreateShoppingList();
  const { mutate: deleteList } = useDeleteShoppingList();

  const [isNewListOpen, setIsNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListType, setNewListType] = useState<"compra" | "precompra">("compra");

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    createList({ data: { name: newListName, type: newListType } as { name: string }, }, {
      onSuccess: (id) => {
        setIsNewListOpen(false);
        setNewListName("");
        setNewListType("compra");
        setLocation(`/list/${id}`);
      }
    });
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("¿Eliminar esta lista?")) deleteList({ id });
  };

  const openNew = (type: "compra" | "precompra") => {
    setNewListType(type);
    setIsNewListOpen(true);
  };

  const allLists = (lists ?? []) as ListSummary[];
  const precompraLists = allLists.filter((l) => l.type === "precompra");
  const compraLists = allLists.filter((l) => l.type !== "precompra");

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        title="Super Scanner"
        className="bg-transparent backdrop-blur-none border-none py-6"
        action={
          <div className="flex items-center gap-2">
            {allLists.length > 0 && (
              <Link href="/historial">
                <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground">
                  <BarChart2 className="w-5 h-5" />
                </button>
              </Link>
            )}
            <img src={`${import.meta.env.BASE_URL}images/logo-icon.png`} alt="Logo" className="w-10 h-10 object-contain" />
          </div>
        }
      />

      <main className="max-w-3xl mx-auto px-4 md:px-6 space-y-8">

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary" />
            <p>Cargando tus listas...</p>
          </div>
        ) : error ? (
          <div className="bg-destructive/10 text-destructive p-6 rounded-2xl border border-destructive/20 text-center">
            <p className="font-semibold">Error al cargar las listas.</p>
          </div>
        ) : allLists.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center py-12 px-4"
          >
            <div className="w-64 h-64 mb-6 relative">
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl" />
              <img src={`${import.meta.env.BASE_URL}images/empty-cart.png`} alt="Carrito vacío" className="w-full h-full object-contain relative z-10" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Ninguna lista todavía</h3>
            <p className="text-muted-foreground max-w-xs mb-8">
              Creá una lista de compras para ir al súper, o una pre-compra para que la familia agregue lo que necesita.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button size="lg" className="rounded-full gap-2" onClick={() => openNew("compra")}>
                <ShoppingCart className="w-5 h-5" /> Lista de Compras
              </Button>
              <Button size="lg" variant="outline" className="rounded-full gap-2" onClick={() => openNew("precompra")}>
                <ClipboardList className="w-5 h-5" /> Pre-compra
              </Button>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Pre-compra section */}
            <AnimatePresence>
              {precompraLists.length > 0 && (
                <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-violet-600" />
                      <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Pre-compras</h2>
                    </div>
                    <button onClick={() => openNew("precompra")} className="text-xs text-primary font-semibold hover:underline">+ Nueva</button>
                  </div>
                  <div className="grid gap-3">
                    {precompraLists.map((list, i) => (
                      <motion.div key={list.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                        <ListCard list={list} onDelete={handleDelete} />
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Compras section */}
            <AnimatePresence>
              {compraLists.length > 0 && (
                <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-primary" />
                      <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Compras</h2>
                    </div>
                    <button onClick={() => openNew("compra")} className="text-xs text-primary font-semibold hover:underline">+ Nueva</button>
                  </div>
                  <div className="grid gap-3">
                    {compraLists.map((list, i) => (
                      <motion.div key={list.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                        <ListCard list={list} onDelete={handleDelete} />
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </>
        )}
      </main>

      {/* FABs */}
      {allLists.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <button
              onClick={() => openNew("precompra")}
              className="flex items-center gap-2 bg-violet-600 text-white px-4 h-12 rounded-full shadow-lg hover:bg-violet-700 active:scale-95 transition-all text-sm font-semibold"
            >
              <ClipboardList className="w-4 h-4" /> Pre-compra
            </button>
          </motion.div>
          <Button size="fab" className="shadow-2xl hover:scale-105 active:scale-95" onClick={() => openNew("compra")}>
            <Plus className="w-8 h-8" />
          </Button>
        </div>
      )}

      {/* Create List Dialog */}
      <Dialog open={isNewListOpen} onOpenChange={setIsNewListOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{newListType === "precompra" ? "Nueva Pre-compra" : "Nueva Lista de Compras"}</DialogTitle>
            <DialogDescription>
              {newListType === "precompra"
                ? "La familia puede agregar lo que necesita antes de ir al súper."
                : "Escaneá productos en el súper y llevá el control de tu compra."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateList} className="space-y-5 pt-4">
            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewListType("compra")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-semibold ${newListType === "compra" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}
              >
                <ShoppingCart className="w-5 h-5" />
                Compras
              </button>
              <button
                type="button"
                onClick={() => setNewListType("precompra")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-semibold ${newListType === "precompra" ? "border-violet-500 bg-violet-50 text-violet-700" : "border-border text-muted-foreground"}`}
              >
                <ClipboardList className="w-5 h-5" />
                Pre-compra
              </button>
            </div>
            <Input
              placeholder="Nombre de la lista..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              autoFocus
              className="text-lg py-6"
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsNewListOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={!newListName.trim() || isCreating}>
                {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
