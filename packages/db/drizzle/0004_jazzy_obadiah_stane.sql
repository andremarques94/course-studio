ALTER TABLE "courses" DROP CONSTRAINT "courses_slug_unique";--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_owner_id_slug_unique" UNIQUE("owner_id","slug");