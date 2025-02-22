CREATE TABLE IF NOT EXISTS "sse-chat_message" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"sender_name" text NOT NULL,
	"content" text NOT NULL,
	"created_at" bigint DEFAULT extract(epoch from now()) * 1000 NOT NULL,
	"updated_at" bigint DEFAULT extract(epoch from now()) * 1000 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sse-chat_room" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"created_at" bigint DEFAULT extract(epoch from now()) * 1000 NOT NULL,
	"updated_at" bigint DEFAULT extract(epoch from now()) * 1000 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sse-chat_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" bigint DEFAULT extract(epoch from now()) * 1000 NOT NULL,
	"updated_at" bigint DEFAULT extract(epoch from now()) * 1000 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sse-chat_users_to_rooms" (
	"user_id" text NOT NULL,
	"room_id" text NOT NULL,
	CONSTRAINT "sse-chat_users_to_rooms_user_id_room_id_pk" PRIMARY KEY("user_id","room_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sse-chat_message" ADD CONSTRAINT "sse-chat_message_room_id_sse-chat_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."sse-chat_room"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sse-chat_message" ADD CONSTRAINT "sse-chat_message_sender_id_sse-chat_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."sse-chat_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sse-chat_users_to_rooms" ADD CONSTRAINT "sse-chat_users_to_rooms_user_id_sse-chat_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."sse-chat_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sse-chat_users_to_rooms" ADD CONSTRAINT "sse-chat_users_to_rooms_room_id_sse-chat_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."sse-chat_room"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
