import { useState, useEffect } from "react";
import { 
  collection, doc, onSnapshot, query, setDoc, deleteDoc, 
  updateDoc, serverTimestamp, addDoc, orderBy, where, getDocs 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./use-auth";

export interface ShoppingListItem {
  id: string;
  name: string;
  price: number | null;
  quantity: string | null;
  units: number;
  brand: string | null;
  checked: boolean;
  addedBy?: string;
  createdAt: any;
  notes?: string;
}

export interface UserProduct {
  id: string;
  name: string;
  price: number | null;
  quantity: string | null;
  brand: string | null;
  lastUsed: any;
}

export interface ShoppingList {
  id: string;
  name: string;
  type: string;
  status: string;
  shareToken: string;
  createdAt: any;
  items: ShoppingListItem[];
}

// Hook to fetch all active lists for the user
export function useShoppingLists() {
  const { user } = useAuth();
  const [data, setData] = useState<ShoppingList[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    // Asumimos que guardamos los IDs a los que el user tiene acceso en un campo o simplemente pedimos las que él creó.
    // Para simplificar "sin fricción", si creó la lista, el ownerId es suyo.
    const q = query(
      collection(db, "lists"), 
      where("status", "==", "active"),
      where("ownerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lists = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ShoppingList[];
      setData(lists);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching lists:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { data, isLoading };
}

// Hook to fetch user's product memory
export function useUserProducts() {
  const { user } = useAuth();
  const [data, setData] = useState<UserProduct[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, "users", user.uid, "products"),
      orderBy("lastUsed", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserProduct[];
      setData(products);
    }, (error) => {
      console.error("Error fetching user products:", error);
    });

    return () => unsubscribe();
  }, [user]);

  return { data };
}

// Hook to create a list
export function useCreateShoppingList() {
  const { user } = useAuth();
  const [isPending, setIsPending] = useState(false);

  const mutate = async (params: { data: { name: string; type: string } }, options?: { onSuccess?: (id: string) => void }) => {
    if (!user) throw new Error("No autenticado");
    setIsPending(true);
    try {
      const shareToken = Math.random().toString(36).substring(2, 8).toUpperCase();
      const docRef = await addDoc(collection(db, "lists"), {
        name: params.data.name,
        type: params.data.type,
        status: "active",
        shareToken,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });
      setIsPending(false);
      options?.onSuccess?.(docRef.id);
      return docRef.id;
    } catch (error) {
      setIsPending(false);
      throw error;
    }
  };

  return { mutate, isPending };
}

export function useDeleteShoppingList() {
  const mutate = async ({ id }: { id: string }) => {
    await updateDoc(doc(db, "lists", id), { status: "archived" });
  };
  return { mutate };
}

// Real-time hook for a single list and its items
export function useShoppingList(id: string) {
  const [data, setData] = useState<ShoppingList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id || id === "0") {
      setIsLoading(false);
      return;
    }

    const listRef = doc(db, "lists", id);
    const itemsQuery = query(collection(listRef, "items"), orderBy("createdAt", "asc"));

    const unsubList = onSnapshot(listRef, (docSnap) => {
      if (!docSnap.exists()) {
        setError(new Error("Lista no encontrada"));
        setIsLoading(false);
        return;
      }
      
      const listData = { id: docSnap.id, ...docSnap.data() } as Omit<ShoppingList, "items">;
      
      const unsubItems = onSnapshot(itemsQuery, (itemsSnap) => {
        const itemsData = itemsSnap.docs.map(iDoc => ({
          id: iDoc.id,
          ...iDoc.data()
        })) as ShoppingListItem[];
        
        setData({ ...listData, items: itemsData } as ShoppingList);
        setIsLoading(false);
      }, (err) => {
        console.error("Error items:", err);
      });

      return () => unsubItems();
    }, (err) => {
      setError(err);
      setIsLoading(false);
    });

    return () => unsubList();
  }, [id]);

  return { data, isLoading, error };
}

// Hook para acceder a la lista a través de un token
export function useShoppingListByToken(token: string) {
  const [listId, setListId] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [tokenError, setTokenError] = useState<Error | null>(null);

  useEffect(() => {
    if (!token) {
      setLoadingToken(false);
      return;
    }
    const q = query(collection(db, "lists"), where("shareToken", "==", token));
    getDocs(q).then(snapshot => {
      if (snapshot.empty) {
        setTokenError(new Error("Lista no encontrada o token inválido"));
      } else {
        setListId(snapshot.docs[0].id);
      }
      setLoadingToken(false);
    }).catch(err => {
      setTokenError(err);
      setLoadingToken(false);
    });
  }, [token]);

  const listHook = useShoppingList(listId || "0");

  return {
    data: listHook.data,
    isLoading: loadingToken || listHook.isLoading,
    error: tokenError || listHook.error,
    listId,
  };
}

export function useUpdateList() {
  const mutate = async ({ id, data }: { id: string; data: Partial<ShoppingList> }) => {
    const listRef = doc(db, "lists", id);
    await updateDoc(listRef, data);
  };
  return { mutate };
}

export function useAddListItem(listId: string) {
  const { user } = useAuth();
  const [isPending, setIsPending] = useState(false);

  const mutate = async (params: { data: any }, options?: { onSuccess?: () => void }) => {
    setIsPending(true);
    try {
      const itemsRef = collection(db, "lists", listId, "items");
      await addDoc(itemsRef, {
        ...params.data,
        checked: false,
        addedBy: user?.uid,
        createdAt: serverTimestamp(),
      });

      // Save to product memory if user is authenticated
      if (user?.uid && params.data.name) {
        const normalizedName = params.data.name.trim().toLowerCase();
        // Use a clean ID based on the name to avoid duplicates
        const productId = normalizedName.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        
        if (productId) {
          const productRef = doc(db, "users", user.uid, "products", productId);
          await setDoc(productRef, {
            name: params.data.name.trim(), // Keep original casing for display
            price: params.data.price || null,
            quantity: params.data.quantity || null,
            brand: params.data.brand || null,
            lastUsed: serverTimestamp(),
          }, { merge: true }); // Merge updates the price/quantity but keeps the doc
        }
      }

      options?.onSuccess?.();
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending };
}

export function useUpdateListItem(listId: string) {
  const mutate = async ({ itemId, data }: { itemId: string; data: Partial<ShoppingListItem> }, options?: { onSuccess?: () => void }) => {
    const itemRef = doc(db, "lists", listId, "items", itemId);
    await updateDoc(itemRef, data);
    options?.onSuccess?.();
  };
  return { mutate };
}

export function useRemoveListItem(listId: string) {
  const mutate = async ({ itemId }: { itemId: string }) => {
    await deleteDoc(doc(db, "lists", listId, "items", itemId));
  };
  return { mutate };
}

// Hook para historial y reportes
export function useHistoryReport() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, "lists"),
          where("status", "==", "archived"),
          where("ownerId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        
        const listsData: any[] = [];
        const itemsMap = new Map<string, any>();

        for (const docSnap of snapshot.docs) {
          const list = { id: docSnap.id, ...docSnap.data() } as any;
          const itemsSnap = await getDocs(collection(docSnap.ref, "items"));
          
          let total = 0;
          let itemsWithPrice = 0;
          
          list.items = itemsSnap.docs.map(i => ({ id: i.id, ...i.data() }));

          list.items.forEach((item: any) => {
            if (item.checked && item.price != null && item.price > 0) {
              const itemTotal = item.price * (item.units || 1);
              total += itemTotal;
              itemsWithPrice++;

              const key = item.name.toLowerCase().trim();
              if (!itemsMap.has(key)) {
                itemsMap.set(key, { name: item.name, brand: item.brand, points: [] });
              }
              itemsMap.get(key).points.push({
                listId: list.id,
                listName: list.name,
                date: list.createdAt.toDate ? list.createdAt.toDate().toISOString() : new Date().toISOString(),
                price: item.price,
                units: item.units || 1
              });
            }
          });

          listsData.push({
            id: list.id,
            name: list.name,
            createdAt: list.createdAt.toDate ? list.createdAt.toDate().toISOString() : new Date().toISOString(),
            total,
            itemCount: list.items.length,
            itemsWithPrice,
            fullList: list // para pasarlo al PDF export
          });
        }

        const priceHistory = Array.from(itemsMap.values());

        setData({ lists: listsData, priceHistory });
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching history:", err);
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  return { data, isLoading };
}
