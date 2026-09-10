import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  index,
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

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    customerName: text("customer_name").notNull(),
    email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  divisionId: text("division_id"),
  districtId: text("district_id"),
  upazilaId: text("upazila_id"),
  notes: text("notes"),
    paymentMethod: text("payment_method").notNull(),
    subtotal: integer("subtotal").notNull(),
    discount: integer("discount").notNull().default(0),
    couponCode: text("coupon_code"),
    shipping: integer("shipping").notNull(),
    total: integer("total").notNull(),
    status: text("status").notNull().default("confirmed"),
    paymentStatus: text("payment_status").notNull().default("pending"),
    transactionId: text("transaction_id"),
    gatewayValId: text("gateway_val_id"),
    bankTranId: text("bank_tran_id"),
    cardInfo: text("card_info"),
    riskLevel: integer("risk_level").notNull().default(0),
    storeAmount: text("store_amount"),
    refundStatus: text("refund_status").notNull().default("none"),
    refundRefId: text("refund_ref_id"),
    refundAmount: integer("refund_amount"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("orders_user_id_idx").on(t.userId),
    index("orders_status_idx").on(t.status),
  ]
);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  productId: integer("product_id").notNull(),
  variantId: integer("variant_id").references(() => productVariants.id),
  sku: text("sku"),
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

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  label: text("label").notNull().default("Home"),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  postcode: text("postcode").notNull().default(""),
  divisionId: text("division_id"),
  districtId: text("district_id"),
  upazilaId: text("upazila_id"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Address = typeof addresses.$inferSelect;

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  type: text("type").notNull().default("flat"), // "flat" (BDT) or "percent"
  value: integer("value").notNull(),
  minSubtotal: integer("min_subtotal").notNull().default(0),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  active: boolean("active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const shippingZones = pgTable("shipping_zones", {
  id: serial("id").primaryKey(),
  city: text("city").notNull().unique(),
  fee: integer("fee").notNull(),
  freeOver: integer("free_over"),
  active: boolean("active").notNull().default(true),
});

export const wishlistItems = pgTable("wishlist_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Coupon = typeof coupons.$inferSelect;
export type ShippingZone = typeof shippingZones.$inferSelect;

// Bangladesh administrative hierarchy (§15). Stable package IDs are used as
// primary keys so re-seeds are idempotent and relationships survive.
export const divisions = pgTable("divisions", {
  id: text("id").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameBn: text("name_bn").notNull(),
  active: boolean("active").notNull().default(true),
});

export const districts = pgTable(
  "districts",
  {
    id: text("id").primaryKey(),
    divisionId: text("division_id")
      .notNull()
      .references(() => divisions.id),
    nameEn: text("name_en").notNull(),
    nameBn: text("name_bn").notNull(),
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("districts_division_id_idx").on(t.divisionId)]
);

export const upazilas = pgTable(
  "upazilas",
  {
    id: text("id").primaryKey(),
    districtId: text("district_id")
      .notNull()
      .references(() => districts.id),
    nameEn: text("name_en").notNull(),
    nameBn: text("name_bn").notNull(),
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("upazilas_district_id_idx").on(t.districtId)]
);

// Location shipping rules (§16). Most-specific active rule wins:
// upazila → district → division → legacy city zone → flat fallback.
export const shippingRules = pgTable(
  "shipping_rules",
  {
    id: serial("id").primaryKey(),
    scope: text("scope").notNull(), // "division" | "district" | "upazila"
    refId: text("ref_id").notNull(),
    fee: integer("fee").notNull(),
    freeOver: integer("free_over"),
    active: boolean("active").notNull().default(true),
  },
  (t) => [
    uniqueIndex("shipping_rules_scope_ref_idx").on(t.scope, t.refId),
  ]
);

export type Division = typeof divisions.$inferSelect;
export type District = typeof districts.$inferSelect;
export type Upazila = typeof upazilas.$inferSelect;
export type ShippingRule = typeof shippingRules.$inferSelect;

export const productVariants = pgTable(
  "product_variants",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),
    color: text("color").notNull().default(""),
    size: text("size").notNull().default(""),
    price: integer("price").notNull(),
    compareAtPrice: integer("compare_at_price"),
    stock: integer("stock").notNull().default(0),
    image: text("image").notNull().default(""),
    barcode: text("barcode").notNull().default(""),
    weightGrams: integer("weight_grams"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("product_variants_product_id_idx").on(t.productId),
    uniqueIndex("product_variants_product_combo_idx").on(
      t.productId,
      t.color,
      t.size
    ),
  ]
);

export type ProductVariant = typeof productVariants.$inferSelect;

export const returnRequests = pgTable("return_requests", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  userId: integer("user_id").references(() => users.id),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("requested"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ReturnRequest = typeof returnRequests.$inferSelect;
