import { useState } from "react";
import { useRoute } from "wouter";
import { Loader2, Plus, AlertCircle, Trash2, Check, ExternalLink } from "lucide-react";
import { useShoppingListByToken, useAddListItem, useUpdateListItem, useRemoveListItem } from "@/hooks/use-shopping";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatPrice, cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function SharedList() {
  const [, params] = useRoute("/shared/:token");
  const token = params?.token || "";

  const { data: listData, isLoading, error, listId } = useShoppingListByToken(token);
  
  const { mutate: addItem, isPending: isAdding } = useAddListItem(listId || "");
  const { mutate: updateItem } = useUpdateListItem(listId || "");
  const { mutate: removeItem } = useRemoveListItem(listId || "");

  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ name: "", quantity: "", units: "1", brand: "" });

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
          <p className="text-muted-foreground mb-6">El enlace es inválido o la lista fue eliminada.</p>
        </div>
      </div>
    );
  }

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.name.trim() || !listId) return;

    addItem({
      data: {
        name: manualForm.name,
        quantity: manualForm.quantity || null,
        units: parseInt(manualForm.units) || 1,
        brand: manualForm.brand || null,
        price: null, // Los invitados en pre-compra rara vez saben el precio
      }
    }, {
      onSuccess: () => {
        setIsManualAddOpen(false);
        setManualForm({ name: "", quantity: "", units: "1", brand: "" });
      }
    });
  };

  const toggleCheck = (itemId: string, currentChecked: boolean) => {
    if (!listId) return;
    updateItem({ itemId, data: { checked: !currentChecked } });
  };

  const pendingItems = listData.items.filter(item => !item.checked);
  const checkedItems = listData.items.filter(item => item.checked);

  return (
    <div className="min-h-screen pb-32 bg-violet-50/50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b px-4 py-4 flex flex-col items-center shadow-sm">
        <div className="w-full max-w-3xl flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}images/logo-icon.png`} alt="Logo" className="w-8 h-8 object-contain" />
            <span className="font-display font-bold text-lg hidden sm:inline">Super Scanner</span>
          </div>
          <Button variant="outline" size="sm" className="rounded-full text-xs font-semibold" asChild>
            <a href="/">Crear mis listas</a>
          </Button>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold">{listData.name}</h1>
          <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold mt-1">Lista Compartida</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        {/* Pending Items */}
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
                  className="bg-white rounded-2xl p-4 shadow-sm border border-border/50 flex gap-4 items-center"
                >
                  <button 
                    onClick={() => toggleCheck(item.id, item.checked)}
                    className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center hover:border-primary transition-all"
                  />
                  
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                      {item.units > 1 && (
                        <span className="shrink-0 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                          x{item.units}
                        </span>
                      )}
                      <h4 className="font-bold text-lg text-foreground truncate">{item.name}</h4>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
                      {item.brand && <span>{item.brand}</span>}
                      {item.brand && item.quantity && <span>•</span>}
                      {item.quantity && <span>{item.quantity}</span>}
                    </div>
                  </div>

                  <button 
                    onClick={() => listId && removeItem({ itemId: item.id })}
                    className="p-2 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </motion.div>
              ))}
              
              {pendingItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground bg-white/50 rounded-2xl border border-dashed">
                  No hay ítems pendientes.
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Checked Items */}
        {checkedItems.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-1">
              En el Carrito ({checkedItems.length})
            </h3>
            <div className="space-y-3 opacity-70">
              <AnimatePresence>
                {checkedItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, x: 20 }}
                    className="bg-card/50 rounded-2xl p-4 border flex gap-4 items-center grayscale-[0.5]"
                  >
                    <button 
                      onClick={() => toggleCheck(item.id, item.checked)}
                      className="flex-shrink-0 w-8 h-8 rounded-full bg-primary border-primary text-primary-foreground flex items-center justify-center"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                    
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2">
                        {item.units > 1 && (
                          <span className="shrink-0 bg-muted text-muted-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                            x{item.units}
                          </span>
                        )}
                        <h4 className="font-bold text-lg text-foreground line-through decoration-2 decoration-foreground/30 truncate">{item.name}</h4>
                      </div>
                    </div>

                    <button 
                      onClick={() => listId && removeItem({ itemId: item.id })}
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
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-6">
        <Button 
          className="h-14 px-8 rounded-full shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 text-base gap-2"
          onClick={() => setIsManualAddOpen(true)}
        >
          <Plus className="w-5 h-5" />
          Añadir Producto
        </Button>
      </div>

      {/* Manual Add Dialog */}
      <Dialog open={isManualAddOpen} onOpenChange={setIsManualAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir a la lista</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleManualAdd} className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">¿Qué necesitas?</label>
              <Input
                placeholder="Ej. Leche descremada"
                value={manualForm.name}
                onChange={(e) => setManualForm({...manualForm, name: e.target.value})}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Unidades</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={manualForm.units}
                  onChange={(e) => setManualForm({...manualForm, units: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Peso/Vol.</label>
                <Input
                  placeholder="1L, 500g"
                  value={manualForm.quantity}
                  onChange={(e) => setManualForm({...manualForm, quantity: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Marca (opcional)</label>
              <Input
                placeholder="La Serenísima"
                value={manualForm.brand}
                onChange={(e) => setManualForm({...manualForm, brand: e.target.value})}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsManualAddOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!manualForm.name.trim() || isAdding}>
                {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
