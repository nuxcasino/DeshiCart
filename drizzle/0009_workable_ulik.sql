CREATE TABLE "payment_gateways" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"display_name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sandbox" boolean DEFAULT true NOT NULL,
	"currency" text DEFAULT 'BDT' NOT NULL,
	"min_amount" integer,
	"max_amount" integer,
	"extra_fee" integer DEFAULT 0 NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"maintenance" boolean DEFAULT false NOT NULL,
	"credentials" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_gateways_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer,
	"gateway" text NOT NULL,
	"tran_ref" text,
	"gateway_ref" text,
	"amount" integer,
	"currency" text DEFAULT 'BDT' NOT NULL,
	"status" text NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "gateway_fee" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_transactions_order_id_idx" ON "payment_transactions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_tran_ref_idx" ON "payment_transactions" USING btree ("tran_ref");