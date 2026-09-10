ALTER TABLE "orders" ADD COLUMN "gateway_val_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "bank_tran_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "card_info" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "risk_level" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "store_amount" text;