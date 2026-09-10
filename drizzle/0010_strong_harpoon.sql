ALTER TABLE "categories" ADD COLUMN "name_bn" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "tagline_bn" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "name_bn" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "description_bn" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "details_bn" jsonb DEFAULT '[]'::jsonb NOT NULL;