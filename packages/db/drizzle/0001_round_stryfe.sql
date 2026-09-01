CREATE TABLE "lesson_documents" (
	"lesson_id" uuid PRIMARY KEY NOT NULL,
	"ydoc" "bytea" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lesson_documents" ADD CONSTRAINT "lesson_documents_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;