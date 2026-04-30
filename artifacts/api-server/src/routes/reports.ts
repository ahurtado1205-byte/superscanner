import { Router, type IRouter } from "express";
import { db, shoppingListsTable, listItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/reports/history", async (_req, res) => {
  const lists = await db
    .select()
    .from(shoppingListsTable)
    .orderBy(shoppingListsTable.createdAt);

  const allItems = await db.select().from(listItemsTable);

  const itemsByList = new Map<number, typeof allItems>();
  for (const item of allItems) {
    if (!itemsByList.has(item.listId)) itemsByList.set(item.listId, []);
    itemsByList.get(item.listId)!.push(item);
  }

  const listSummaries = lists.map((list) => {
    const items = itemsByList.get(list.id) ?? [];
    const total = items.reduce((sum, item) => {
      if (item.price == null) return sum;
      return sum + parseFloat(item.price) * item.units;
    }, 0);
    const itemCount = items.length;
    const itemsWithPrice = items.filter((i) => i.price != null).length;
    return {
      id: list.id,
      name: list.name,
      createdAt: list.createdAt,
      total: Math.round(total * 100) / 100,
      itemCount,
      itemsWithPrice,
    };
  });

  // Group items by normalized name for price tracking
  const priceHistoryMap = new Map<
    string,
    {
      name: string;
      brand: string | null;
      points: {
        listId: number;
        listName: string;
        date: string;
        price: number;
        units: number;
      }[];
    }
  >();

  for (const item of allItems) {
    if (item.price == null) continue;
    const key = item.name.trim().toLowerCase();
    const list = lists.find((l) => l.id === item.listId);
    if (!list) continue;
    if (!priceHistoryMap.has(key)) {
      priceHistoryMap.set(key, { name: item.name, brand: item.brand, points: [] });
    }
    priceHistoryMap.get(key)!.points.push({
      listId: item.listId,
      listName: list.name,
      date: list.createdAt instanceof Date
        ? list.createdAt.toISOString()
        : String(list.createdAt),
      price: parseFloat(item.price),
      units: item.units,
    });
  }

  const priceHistory = Array.from(priceHistoryMap.values())
    .filter((p) => p.points.length >= 1)
    .sort((a, b) => b.points.length - a.points.length);

  res.json({ lists: listSummaries, priceHistory });
});

export default router;
