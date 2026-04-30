import { Router, type IRouter } from "express";
import { db, shoppingListsTable, listItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

const router: IRouter = Router();

// Generate or return existing share token for a list
router.post("/lists/:id/share", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [list] = await db.select().from(shoppingListsTable).where(eq(shoppingListsTable.id, id));
  if (!list) { res.status(404).json({ error: "List not found" }); return; }

  if (list.shareToken) {
    res.json({ shareToken: list.shareToken });
    return;
  }

  const shareToken = randomBytes(12).toString("hex");
  const [updated] = await db
    .update(shoppingListsTable)
    .set({ shareToken })
    .where(eq(shoppingListsTable.id, id))
    .returning();

  res.json({ shareToken: updated.shareToken });
});

// Get a list by share token (for family members)
router.get("/lists/shared/:token", async (req, res) => {
  const { token } = req.params;
  const [list] = await db
    .select()
    .from(shoppingListsTable)
    .where(eq(shoppingListsTable.shareToken, token));

  if (!list) { res.status(404).json({ error: "Lista no encontrada" }); return; }

  const items = await db
    .select()
    .from(listItemsTable)
    .where(eq(listItemsTable.listId, list.id))
    .orderBy(listItemsTable.createdAt);

  res.json({
    id: list.id,
    name: list.name,
    shareToken: list.shareToken,
    createdAt: list.createdAt,
    items: items.map((i) => ({
      ...i,
      price: i.price != null ? parseFloat(i.price) : null,
    })),
  });
});

// Toggle checked on a shared list item
router.patch("/lists/shared/:token/items/:itemId", async (req, res) => {
  const { token } = req.params;
  const itemId = parseInt(req.params.itemId);
  const [list] = await db.select().from(shoppingListsTable).where(eq(shoppingListsTable.shareToken, token));
  if (!list) { res.status(404).json({ error: "Lista no encontrada" }); return; }

  const { checked } = req.body;
  const [item] = await db
    .update(listItemsTable)
    .set({ checked: !!checked })
    .where(eq(listItemsTable.id, itemId))
    .returning();
  res.json({ ...item, price: item.price != null ? parseFloat(item.price) : null });
});

// Add an item to a shared list (family members)
router.post("/lists/shared/:token/items", async (req, res) => {
  const { token } = req.params;
  const [list] = await db
    .select()
    .from(shoppingListsTable)
    .where(eq(shoppingListsTable.shareToken, token));

  if (!list) { res.status(404).json({ error: "Lista no encontrada" }); return; }

  const { name, notes } = req.body;
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const [item] = await db
    .insert(listItemsTable)
    .values({ listId: list.id, name: name.trim(), notes: notes ?? null, units: 1 })
    .returning();

  res.status(201).json({ ...item, price: null });
});

export default router;
