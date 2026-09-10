CREATE TABLE "districts" (
	"id" text PRIMARY KEY NOT NULL,
	"division_id" text NOT NULL,
	"name_en" text NOT NULL,
	"name_bn" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "divisions" (
	"id" text PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_bn" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"ref_id" text NOT NULL,
	"fee" integer NOT NULL,
	"free_over" integer,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upazilas" (
	"id" text PRIMARY KEY NOT NULL,
	"district_id" text NOT NULL,
	"name_en" text NOT NULL,
	"name_bn" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "division_id" text;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "district_id" text;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "upazila_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "division_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "district_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "upazila_id" text;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upazilas" ADD CONSTRAINT "upazilas_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "districts_division_id_idx" ON "districts" USING btree ("division_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shipping_rules_scope_ref_idx" ON "shipping_rules" USING btree ("scope","ref_id");--> statement-breakpoint
CREATE INDEX "upazilas_district_id_idx" ON "upazilas" USING btree ("district_id");