import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  tagline: text("tagline").notNull().default(""),
  image: text("image").notNull().default(""),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  details: jsonb("details").$type<string[]>().notNull().default([]),
  price: integer("price").notNull(), // BDT
  compareAtPrice: integer("compare_at_price"),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  sizes: jsonb("sizes").$type<string[]>().notNull().default([]),
  colors: jsonb("colors").$type<string[]>().notNull().default([]),
  badge: text("badge"),
  featured: boolean("featured").notNull().default(false),
  rating: numeric("rating", { precision: 2, scale: 1 }).notNull().default("0"),
  reviewCount: integer("review_count").notNull().default(0),
  stock: integer("stock").notNull().default(25),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  author: text("author").notNull(),
  rating: integer("rating").notNull(),
  title: text("title").notNull().default(""),
  body: text("body").notNull(),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  notes: text("notes"),
  paymentMethod: text("payment_method").notNull(),
  subtotal: integer("subtotal").notNull(),
  shipping: integer("shipping").notNull(),
  total: integer("total").notNull(),
  status: text("status").notNull().default("confirmed"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  transactionId: text("transaction_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  productId: integer("product_id").notNull(),
  name: text("name").notNull(),
  image: text("image").notNull(),
  price: integer("price").notNull(),
  size: text("size"),
  quantity: integer("quantity").notNull(),
});

export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
