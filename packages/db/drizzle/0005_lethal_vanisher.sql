CREATE TYPE "public"."course_role" AS ENUM('editor', 'viewer');--> statement-breakpoint
CREATE TABLE "course_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "course_role" NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_invitations_normalized_email_check" CHECK ("course_invitations"."email" = lower(btrim("course_invitations"."email")) and "course_invitations"."email" <> ''),
	CONSTRAINT "course_invitations_terminal_state_check" CHECK ("course_invitations"."accepted_at" is null or "course_invitations"."revoked_at" is null)
);
--> statement-breakpoint
CREATE TABLE "course_members" (
	"course_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "course_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_members_course_id_user_id_pk" PRIMARY KEY("course_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "course_invitations" ADD CONSTRAINT "course_invitations_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_invitations" ADD CONSTRAINT "course_invitations_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_members" ADD CONSTRAINT "course_members_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_members" ADD CONSTRAINT "course_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_invitations_course_id_idx" ON "course_invitations" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_invitations_token_hash_uidx" ON "course_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "course_invitations_pending_course_email_uidx" ON "course_invitations" USING btree ("course_id","email") WHERE "course_invitations"."accepted_at" is null and "course_invitations"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "course_members_user_id_idx" ON "course_members" USING btree ("user_id");