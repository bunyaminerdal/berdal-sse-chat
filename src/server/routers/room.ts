import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import EventEmitter, { on } from "node:events";
import { z } from "zod";
import { db } from "~/server/db/client";
import { Room, UsersToRooms, type MessageType } from "~/server/db/schema";
import { authedProcedure } from "~/server/trpc";

export type WhoIsTyping = Record<string, { lastTyped: Date }>;

export interface MyEvents {
  add: (roomId: string, data: MessageType) => void;
  isTypingUpdate: (roomId: string, who: WhoIsTyping) => void;
}
declare interface MyEventEmitter {
  on<TEv extends keyof MyEvents>(event: TEv, listener: MyEvents[TEv]): this;
  off<TEv extends keyof MyEvents>(event: TEv, listener: MyEvents[TEv]): this;
  once<TEv extends keyof MyEvents>(event: TEv, listener: MyEvents[TEv]): this;
  emit<TEv extends keyof MyEvents>(
    event: TEv,
    ...args: Parameters<MyEvents[TEv]>
  ): boolean;
}

class MyEventEmitter extends EventEmitter {
  public toIterable<TEv extends keyof MyEvents>(
    event: TEv,
    opts: NonNullable<Parameters<typeof on>[2]>
  ): AsyncIterable<Parameters<MyEvents[TEv]>> {
    return on(this, event, opts) as any;
  }
}

// In a real app, you'd probably use Redis or something
export const ee = new MyEventEmitter();

// who is currently typing for each channel, key is `name`
export const currentlyTyping: Record<string, WhoIsTyping> = Object.create(null);

// every 1s, clear old "isTyping"
setInterval(() => {
  const updatedChannels = new Set<string>();
  const now = Date.now();
  for (const [roomId, typers] of Object.entries(currentlyTyping)) {
    for (const [key, value] of Object.entries(typers ?? {})) {
      if (now - value.lastTyped.getTime() > 3e3) {
        delete typers[key];
        updatedChannels.add(roomId);
      }
    }
  }
  updatedChannels.forEach((roomId) => {
    ee.emit("isTypingUpdate", roomId, currentlyTyping[roomId] ?? {});
  });
}, 3e3).unref();

export const roomRouter = {
  list: authedProcedure
    .input(z.object({ userId: z.string().trim().min(2) }))
    .query(async ({ input }) => {
      const utrs = await db.query.UsersToRooms.findMany({
        where: (utr, { eq }) => eq(utr.userId, input.userId),
      });
      const roomIds = utrs.map((utr) => utr.roomId);
      if (!roomIds.length) return [];
      return db.query.Room.findMany({
        where: (room, { inArray }) => inArray(room.id, roomIds),
      });
    }),

  create: authedProcedure
    .input(z.object({ name: z.string().trim().min(2) }))
    .mutation(async ({ ctx, input }) => {
      const targetUser = await db.query.User.findFirst({
        where: (user, { eq }) => eq(user.name, input.name),
      });
      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `User not found with name: ${input.name}`,
        });
      }
      const roomName = `${ctx.user.name}_${targetUser.name}`;
      const existedRoom = await db.query.Room.findFirst({
        where: (room, { eq }) => eq(room.name, roomName),
      });
      if (existedRoom) {
        return existedRoom.id;
      }
      const [room] = await db
        .insert(Room)
        .values({
          name: roomName,
        })
        .returning();
      if (!room) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An unexpected error occurred, please try again later.",
        });
      }
      await db.insert(UsersToRooms).values({
        roomId: room.id,
        userId: ctx.user.id!,
      });
      await db.insert(UsersToRooms).values({
        roomId: room.id,
        userId: targetUser.id,
      });
      return room?.id;
    }),

  isTyping: authedProcedure
    .input(z.object({ roomId: z.string().uuid(), typing: z.boolean() }))
    .mutation(async (opts) => {
      const { name } = opts.ctx.user;
      const { roomId } = opts.input;

      if (!currentlyTyping[roomId]) {
        currentlyTyping[roomId] = {};
      }

      if (!opts.input.typing) {
        delete currentlyTyping[roomId][name];
      } else {
        currentlyTyping[roomId][name] = {
          lastTyped: new Date(),
        };
      }
      ee.emit("isTypingUpdate", roomId, currentlyTyping[roomId]);
    }),

  whoIsTyping: authedProcedure
    .input(
      z.object({
        roomId: z.string().uuid(),
      })
    )
    .subscription(async function* (opts) {
      const { roomId } = opts.input;

      let lastIsTyping = "";

      /**
       * yield who is typing if it has changed
       * won't yield if it's the same as last time
       */
      function* maybeYield(who: WhoIsTyping) {
        const idx = Object.keys(who).toSorted().toString();
        if (idx === lastIsTyping) {
          return;
        }
        yield Object.keys(who);

        lastIsTyping = idx;
      }

      // emit who is currently typing
      yield* maybeYield(currentlyTyping[roomId] ?? {});

      for await (const [roomId, who] of ee.toIterable("isTypingUpdate", {
        signal: opts.signal,
      })) {
        if (roomId === opts.input.roomId) {
          yield* maybeYield(who);
        }
      }
    }),
} satisfies TRPCRouterRecord;
