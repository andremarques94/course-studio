ALTER TABLE "courses" ADD COLUMN "owner_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "courses_owner_id_idx" ON "courses" USING btree ("owner_id");
