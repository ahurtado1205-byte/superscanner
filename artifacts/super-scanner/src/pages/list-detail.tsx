import { useState } from "react";
import { useRoute } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Loader2, Sparkles, AlertCircle, Pencil, Share2, Copy, Check, History } from "lucide-react";
import { useShoppingList, useAddListItem, useUpdateListItem, useRemoveListItem, useUpdateList, useUserProducts, type UserProduct } from "@/hooks/use-shopping";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { formatPrice, cn } from "@/lib/utils";

export default function ListDetail() {
  const [, params] = useRoute("/list/:id");
  const listId = params?.id || "";

  const { data: listData, isLoading, error } = useShoppingList(listId);
  const { mutate: addItem, isPending: isAdding } = useAddListItem(listId);
  const { mutate: updateItem } = useUpdateListItem(listId);
  const { mutate: removeItem } = useRemoveListItem(listId);
  const { mutate: updateList } = useUpdateList();
  const { data: userProducts } = useUserProducts();

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [editingItem, setEditingItem] = useState<{ id: string; units: number; price: string } | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // The share URL is generated during list creation or uses the static shareToken.
  const handleShareClick = () => {
    if (listData?.shareToken) {
      const base = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");
      setShareUrl(`${base}/shared/${listData.shareToken}`);
      setIsShareOpen(true);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !listData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center">
        <div>
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Lista no encontrada</h2>
          <p className="text-muted-foreground mb-6">No pudimos cargar esta lista de compras.</p>
          <Button asChild>
            <a href="/">Volver a Mis Listas</a>
          </Button>
        </div>
      </div>
    );
  }

  const handleFastAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newItemName.trim()) return;

    addItem({
      data: {
        name: newItemName.trim(),
        price: null,
        quantity: null,
        units: 1,
        brand: null,
      }
    }, {
      onSuccess: () => {
        setNewItemName("");
      }
    });
  };

  const handleAddSuggestion = (product: UserProduct) => {
    addItem({
      data: {
        name: product.name,
        price: product.price || null,
        quantity: product.quantity || null,
        units: 1,
        brand: product.brand || null,
      }
    }, {
      onSuccess: () => {
        setNewItemName("");
        setShowSuggestions(false);
      }
    });
  };


  const toggleCheck = (itemId: string, currentChecked: boolean) => {
    updateItem({ itemId, data: { checked: !currentChecked } });
  };

  const pendingItems = listData.items.filter(item => !item.checked);
  const checkedItems = listData.items.filter(item => item.checked);

  const sumPrice = (items: typeof listData.items) =>
    items.reduce((sum, item) => (item.price == null ? sum : sum + item.price * item.units), 0);
  const pendingTotal = sumPrice(pendingItems);
  const checkedTotal = sumPrice(checkedItems);
  const total = pendingTotal + checkedTotal;
  const itemsWithPrice = listData.items.filter(item => item.price != null).length;
  const isPrecompra = (listData as { type?: string }).type === "precompra";

  const handleSaveEdit = () => {
    if (!editingItem) return;
    updateItem({
      itemId: editingItem.id,
      data: {
        units: editingItem.units,
        price: editingItem.price ? parseFloat(editingItem.price) : null,
      },
    }, { onSuccess: () => setEditingItem(null) });
  };

  return (
    <div className={cn(
      "min-h-screen pb-32 transition-colors duration-500",
      isPrecompra ? "bg-slate-50" : "bg-emerald-50/50"
    )}>
      <PageHeader
        title={listData.name}
        backTo="/"
        action={
          <button
            onClick={handleShareClick}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            <Share2 className="w-5 h-5" />
          </button>
        }
        className={cn("transition-colors duration-500", isPrecompra ? "bg-white/80" : "bg-emerald-100/80 border-emerald-200")}
      />

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        {/* Toggle Modo Tienda */}
        <div className={cn(
          "mb-6 flex items-center justify-between p-4 rounded-2xl border transition-all duration-500",
          isPrecompra 
            ? "bg-white border-slate-200" 
            : "bg-emerald-600 border-emerald-700 text-white shadow-lg shadow-emerald-500/20"
        )}>
          <div className="space-y-0.5">
            <Label className={cn("text-lg font-bold flex items-center gap-2", !isPrecompra && "text-white")}>
              {isPrecompra ? "La Lista" : "Comprando en el Súper"}
              {!isPrecompra && <Sparkles className="w-5 h-5 text-emerald-200" />}
            </Label>
            <p className={cn("text-xs", isPrecompra ? "text-muted-foreground" : "text-emerald-100 font-medium")}>
              {isPrecompra ? "Armando el carrito desde casa" : "Tacha los productos mientras compras"}
            </p>
          </div>
          <Switch
            checked={!isPrecompra}
            onCheckedChange={(checked) => {
              updateList({ id: listId, data: { type: checked ? "compra" : "precompra" } });
            }}
            className={!isPrecompra ? "data-[state=checked]:bg-emerald-200" : ""}
          />
        </div>
        
        {/* Empty State */}
        {listData.items.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 px-4"
          >
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-display font-bold mb-2">Lista Vacía</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-8">
              Añade productos a la lista con el botón de abajo.
            </p>
            <Button variant="outline" className="rounded-full" onClick={() => document.getElementById('fast-add-input')?.focus()}>
              <Plus className="w-4 h-4 mr-2" />
              Añadir Producto
            </Button>
          </motion.div>
        )}

        {/* Subtotals & Total */}
        {listData.items.length > 0 && itemsWithPrice > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 rounded-2xl border p-4 ${isPrecompra ? "bg-violet-50 border-violet-200" : "bg-primary/10 border-primary/20"}`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className={`text-xs font-semibold uppercase tracking-wider ${isPrecompra ? "text-violet-700" : "text-primary/70"}`}>
                {isPrecompra ? "Pre-compra" : "Total estimado"}
              </p>
              <p className="text-xs text-muted-foreground">
                {itemsWithPrice} de {listData.items.length} con precio
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/70 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Por Comprar</p>
                <p className="text-lg font-bold text-foreground">{formatPrice(pendingTotal)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{pendingItems.length} {pendingItems.length === 1 ? "ítem" : "ítems"}</p>
              </div>
              <div className="bg-white/70 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-1">En Carrito</p>
                <p className="text-lg font-bold text-emerald-700">{formatPrice(checkedTotal)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{checkedItems.length} {checkedItems.length === 1 ? "ítem" : "ítems"}</p>
              </div>
              <div className={`rounded-xl p-3 ${isPrecompra ? "bg-violet-600 text-white" : "bg-primary text-white"}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1 opacity-80">Total</p>
                <p className="text-lg font-bold">{formatPrice(total)}</p>
                <p className="text-[10px] mt-0.5 opacity-80">{listData.items.length} {listData.items.length === 1 ? "ítem" : "ítems"}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Pending Items */}
        {pendingItems.length > 0 && (
          <div className="mb-10">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-1">
              Por Comprar ({pendingItems.length})
            </h3>
            <div className="space-y-3">
              <AnimatePresence>
                {pendingItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, x: -20 }}
                    className="group bg-card rounded-2xl p-4 shadow-sm border border-border/50 flex gap-4 items-center"
                  >
                    {/* Only allow checking in Store Mode, or if the user wants they can check in pre-purchase too, but UI highlights it in store mode */}
                    <button 
                      onClick={() => toggleCheck(item.id, item.checked)}
                      className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all",
                        "border-2 border-muted-foreground/30",
                        !isPrecompra ? "hover:border-emerald-500 hover:bg-emerald-50" : "opacity-50 cursor-not-allowed"
                      )}
                      disabled={isPrecompra}
                    />
                    
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {item.units > 1 && (
                            <span className="shrink-0 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                              x{item.units}
                            </span>
                          )}
                          <h4 className="font-bold text-lg text-foreground truncate">{item.name}</h4>
                        </div>
                        {item.price != null && (
                          <span className="font-bold text-primary whitespace-nowrap">
                            {formatPrice(item.price)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
                        {item.brand && <span>{item.brand}</span>}
                        {item.brand && item.quantity && <span>•</span>}
                        {item.quantity && <span>{item.quantity}</span>}
                      </div>
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => setEditingItem({ id: item.id, units: item.units, price: item.price != null ? String(item.price) : "" })}
                        className="p-2 text-muted-foreground/50 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => removeItem({ itemId: item.id })}
                        className="p-2 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Checked Items */}
        {checkedItems.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-1">
              En el Carrito ({checkedItems.length})
            </h3>
            <div className="space-y-3 opacity-60">
              <AnimatePresence>
                {checkedItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, x: 20 }}
                    className="bg-card/50 rounded-2xl p-4 border border-border/30 flex gap-4 items-center grayscale-[0.5]"
                  >
                    <button 
                      onClick={() => toggleCheck(item.id, item.checked)}
                      className="flex-shrink-0 w-8 h-8 rounded-full bg-primary border-primary text-primary-foreground flex items-center justify-center"
                      disabled={isPrecompra}
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                    
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {item.units > 1 && (
                            <span className="shrink-0 bg-muted text-muted-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                              x{item.units}
                            </span>
                          )}
                          <h4 className="font-bold text-lg text-foreground line-through decoration-2 decoration-foreground/30 truncate">{item.name}</h4>
                        </div>
                        {item.price != null && (
                          <span className="font-bold text-foreground/70 whitespace-nowrap">
                            {formatPrice(item.price)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
                        {item.brand && <span>{item.brand}</span>}
                        {item.brand && item.quantity && <span>•</span>}
                        {item.quantity && <span>{item.quantity}</span>}
                      </div>
                    </div>

                    <button 
                      onClick={() => removeItem({ itemId: item.id })}
                      className="p-2 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Barra de adición rápida (Inline) */}
        <div className="sticky bottom-4 z-40 mt-8 pb-4">
          <form 
            onSubmit={handleFastAdd} 
            className={cn(
              "relative p-2 rounded-full border bg-card/95 backdrop-blur flex items-center gap-2 shadow-lg focus-within:ring-2 focus-within:ring-primary/20 transition-all",
              isPrecompra ? "border-primary/20 shadow-primary/10" : "border-emerald-500/30 shadow-emerald-600/20"
            )}
          >
            {/* Dropdown de Sugerencias (arriba de la barra) */}
            {showSuggestions && newItemName.length > 1 && (
              <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-full bg-popover border border-border rounded-xl shadow-xl overflow-hidden mb-1">
                {userProducts
                  .filter(p => p.name.toLowerCase().includes(newItemName.toLowerCase()) && p.name.toLowerCase() !== newItemName.toLowerCase())
                  .slice(0, 4)
                  .map(product => (
                    <button
                      key={product.id}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-muted flex items-center gap-3 transition-colors border-b border-border/40 last:border-0"
                      onClick={() => handleAddSuggestion(product)}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <History className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
                        {(product.brand || product.price) && (
                          <p className="text-xs text-muted-foreground truncate">
                            {product.brand && <span>{product.brand}</span>}
                            {product.brand && product.price && <span> • </span>}
                            {product.price && <span className="text-primary font-medium">{formatPrice(product.price)}</span>}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <Input
                id="fast-add-input"
                placeholder="Escribe un producto y dale Enter..."
                value={newItemName}
                onChange={(e) => {
                  setNewItemName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="border-0 shadow-none focus-visible:ring-0 px-4 text-base bg-transparent h-12"
                autoComplete="off"
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={!newItemName.trim() || isAdding}
              className={cn(
                "h-12 w-12 p-0 rounded-full shrink-0 shadow-sm transition-all", 
                isPrecompra ? "" : "bg-emerald-600 hover:bg-emerald-700 text-white"
              )}
            >
              {isAdding ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
            </Button>
          </form>
        </div>
      </main>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-5 pt-2">
              <div>
                <label className="text-sm font-semibold mb-2 block">Cantidad de unidades</label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setEditingItem(e => e ? { ...e, units: Math.max(1, e.units - 1) } : e)}
                    className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl font-bold hover:bg-muted/70 active:scale-95 transition-all"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center text-3xl font-bold tabular-nums">{editingItem.units}</span>
                  <button
                    type="button"
                    onClick={() => setEditingItem(e => e ? { ...e, units: e.units + 1 } : e)}
                    className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Precio ($)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={editingItem.price}
                  onChange={(e) => setEditingItem(ei => ei ? { ...ei, price: e.target.value } : ei)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setEditingItem(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartir lista</DialogTitle>
            <DialogDescription>
              Mandá este enlace a tu familia para que agreguen lo que necesitan. Cualquiera con el link puede ver y agregar productos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-muted rounded-xl px-3 py-2.5 flex items-center gap-2">
              <span className="text-sm text-muted-foreground flex-1 truncate">{shareUrl}</span>
            </div>
            <Button className="w-full gap-2" onClick={handleCopy}>
              {copied ? <><Check className="w-4 h-4" /> ¡Copiado!</> : <><Copy className="w-4 h-4" /> Copiar enlace</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
