CREATE TABLE "return_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"user_id" integer,
	"reason" text NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refund_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refund_ref_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refund_amount" integer;--> statement-breakpoint
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;