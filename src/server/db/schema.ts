import type { InferSelectModel } from "drizzle-orm";
import { relations, sql } from "drizzle-orm";
import { bigint, pgTableCreator, primaryKey, text } from "drizzle-orm/pg-core";

const pgTable = pgTableCreator((name) => `sse-chat_${name}`);

export const Message = pgTable("message", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  roomId: text("room_id")
    .notNull()
    .references(() => Room.id),
  senderId: text("sender_id")
    .notNull()
    .references(() => User.id),
  senderName: text("sender_name").notNull(),
  content: text("content").notNull(),

  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .default(sql`extract(epoch from now()) * 1000`),
  updatedAt: bigint("updated_at", { mode: "number" })
    .notNull()
    .default(sql`extract(epoch from now()) * 1000`)
    .$onUpdateFn(() => sql`extract(epoch from now()) * 1000`),
});
export type MessageType = InferSelectModel<typeof Message>;

export const Room = pgTable("room", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),

  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .default(sql`extract(epoch from now()) * 1000`),
  updatedAt: bigint("updated_at", { mode: "number" })
    .notNull()
    .default(sql`extract(epoch from now()) * 1000`)
    .$onUpdateFn(() => sql`extract(epoch from now()) * 1000`),
});
export type RoomType = InferSelectModel<typeof Room>;

export const User = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .default(sql`extract(epoch from now()) * 1000`),
  updatedAt: bigint("updated_at", { mode: "number" })
    .notNull()
    .default(sql`extract(epoch from now()) * 1000`)
    .$onUpdateFn(() => sql`extract(epoch from now()) * 1000`),
});
export type UserType = InferSelectModel<typeof User>;

export const MessageRelations = relations(Message, ({ one }) => ({
  room: one(Room, { fields: [Message.roomId], references: [Room.id] }),
  sender: one(User, { fields: [Message.senderId], references: [User.id] }),
}));

export const RoomRelations = relations(Room, ({ many }) => ({
  messages: many(Message),
  usersToRooms: many(UsersToRooms),
}));
export const UserRelations = relations(User, ({ many }) => ({
  usersToRooms: many(UsersToRooms),
}));

export const UsersToRooms = pgTable(
  "users_to_rooms",
  {
    userId: text("user_id")
      .notNull()
      .references(() => User.id),
    roomId: text("room_id")
      .notNull()
      .references(() => Room.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.roomId] }),
  })
);
export type UsersToRoomsType = InferSelectModel<typeof UsersToRooms>;

export const UsersToRoomsRelations = relations(UsersToRooms, ({ one }) => ({
  room: one(Room, {
    fields: [UsersToRooms.roomId],
    references: [Room.id],
  }),
  user: one(User, {
    fields: [UsersToRooms.userId],
    references: [User.id],
  }),
}));
