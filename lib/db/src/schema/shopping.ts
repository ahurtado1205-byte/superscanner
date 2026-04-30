import { pgTable, text, serial, boolean, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shoppingListsTable = pgTable("shopping_lists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("compra"),
  shareToken: text("share_token").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertShoppingListSchema = createInsertSchema(shoppingListsTable).omit({ id: true, createdAt: true });
export type InsertShoppingList = z.infer<typeof insertShoppingListSchema>;
export type ShoppingList = typeof shoppingListsTable.$inferSelect;

export const listItemsTable = pgTable("list_items", {
  id: serial("id").primaryKey(),
  listId: serial("list_id").references(() => shoppingListsTable.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  brand: text("brand"),
  price: numeric("price", { precision: 10, scale: 2 }),
  quantity: text("quantity"),
  units: integer("units").default(1).notNull(),
  notes: text("notes"),
  checked: boolean("checked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertListItemSchema = createInsertSchema(listItemsTable).omit({ id: true, createdAt: true, checked: true });
export type InsertListItem = z.infer<typeof insertListItemSchema>;
export type ListItem = typeof listItemsTable.$inferSelect;
