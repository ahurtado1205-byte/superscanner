import { Router, type IRouter } from "express";
import { db, shoppingListsTable, listItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function computeTotal(items: { price: string | null; units: number }[]) {
  return items.reduce((sum, i) => {
    if (i.price == null) return sum;
    return sum + parseFloat(i.price) * i.units;
  }, 0);
}

router.get("/lists", async (_req, res) => {
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

  const result = lists.map((list) => {
    const items = itemsByList.get(list.id) ?? [];
    const pending = items.filter((i) => !i.checked);
    const checked = items.filter((i) => i.checked);
    return {
      ...list,
      itemCount: items.length,
      pendingCount: pending.length,
      checkedCount: checked.length,
      total: Math.round(computeTotal(items) * 100) / 100,
      pendingTotal: Math.round(computeTotal(pending) * 100) / 100,
      checkedTotal: Math.round(computeTotal(checked) * 100) / 100,
    };
  });

  res.json(result);
});

router.post("/lists", async (req, res) => {
  const { name, type } = req.body;
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const listType = type === "precompra" ? "precompra" : "compra";
  const [list] = await db
    .insert(shoppingListsTable)
    .values({ name: name.trim(), type: listType })
    .returning();
  res.status(201).json({ ...list, itemCount: 0, pendingCount: 0, checkedCount: 0, total: 0, pendingTotal: 0, checkedTotal: 0 });
});

router.get("/lists/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [list] = await db.select().from(shoppingListsTable).where(eq(shoppingListsTable.id, id));
  if (!list) { res.status(404).json({ error: "List not found" }); return; }

  const items = await db
    .select()
    .from(listItemsTable)
    .where(eq(listItemsTable.listId, id))
    .orderBy(listItemsTable.createdAt);

  const parsed = items.map((i) => ({ ...i, price: i.price != null ? parseFloat(i.price) : null }));
  const pending = parsed.filter((i) => !i.checked);
  const checked = parsed.filter((i) => i.checked);

  res.json({
    ...list,
    items: parsed,
    total: Math.round(computeTotal(items) * 100) / 100,
    pendingTotal: Math.round(computeTotal(items.filter((i) => !i.checked)) * 100) / 100,
    checkedTotal: Math.round(computeTotal(items.filter((i) => i.checked)) * 100) / 100,
    itemCount: items.length,
    pendingCount: pending.length,
    checkedCount: checked.length,
  });
});

router.delete("/lists/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(shoppingListsTable).where(eq(shoppingListsTable.id, id));
  res.json({ success: true });
});

router.post("/lists/:id/items", async (req, res) => {
  const listId = parseInt(req.params.id);
  if (isNaN(listId)) { res.status(400).json({ error: "Invalid list id" }); return; }

  const { name, brand, price, quantity, units, notes } = req.body;
  if (!name || typeof name !== "string") { res.status(400).json({ error: "name is required" }); return; }

  const [item] = await db
    .insert(listItemsTable)
    .values({ listId, name: name.trim(), brand: brand ?? null, price: price != null ? String(price) : null, quantity: quantity ?? null, units: units != null ? Number(units) : 1, notes: notes ?? null })
    .returning();
  res.status(201).json({ ...item, price: item.price != null ? parseFloat(item.price) : null });
});

router.patch("/lists/:id/items/:itemId", async (req, res) => {
  const itemId = parseInt(req.params.itemId);
  if (isNaN(itemId)) { res.status(400).json({ error: "Invalid item id" }); return; }

  const { checked, name, price, quantity, units, notes } = req.body;
  const updates: Record<string, unknown> = {};
  if (checked !== undefined && checked !== null) updates.checked = checked;
  if (name !== undefined && name !== null) updates.name = name.trim();
  if (price !== undefined) updates.price = price != null ? String(price) : null;
  if (quantity !== undefined) updates.quantity = quantity;
  if (units !== undefined && units !== null) updates.units = Number(units);
  if (notes !== undefined) updates.notes = notes;

  const [item] = await db.update(listItemsTable).set(updates).where(eq(listItemsTable.id, itemId)).returning();
  res.json({ ...item, price: item.price != null ? parseFloat(item.price) : null });
});

router.delete("/lists/:id/items/:itemId", async (req, res) => {
  const itemId = parseInt(req.params.itemId);
  if (isNaN(itemId)) { res.status(400).json({ error: "Invalid item id" }); return; }
  await db.delete(listItemsTable).where(eq(listItemsTable.id, itemId));
  res.json({ success: true });
});

export default router;
