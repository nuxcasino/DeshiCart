CREATE TABLE "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"sku" text NOT NULL,
	"color" text DEFAULT '' NOT NULL,
	"size" text DEFAULT '' NOT NULL,
	"price" integer NOT NULL,
	"compare_at_price" integer,
	"stock" integer DEFAULT 0 NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"barcode" text DEFAULT '' NOT NULL,
	"weight_grams" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "variant_id" integer;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_variants_product_id_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_product_combo_idx" ON "product_variants" USING btree ("product_id","color","size");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");