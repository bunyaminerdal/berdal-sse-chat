import { tracked } from "@trpc/server";
import { z } from "zod";
import { db } from "~/server/db/client";
import { Message, MessageType } from "../db/schema";
import { authedProcedure, publicProcedure, router } from "../trpc";
import { currentlyTyping, ee } from "./room";

export const messageRouter = router({
  add: authedProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        roomId: z.string().uuid(),
        content: z.string().trim().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { roomId } = input;
      if (ctx.user.id) {
        const [message] = await db
          .insert(Message)
          .values({
            content: input.content,
            roomId,
            senderId: ctx.user.id,
            senderName: ctx.user.name,
          })
          .returning();

        const channelTyping = currentlyTyping[roomId];
        if (channelTyping) {
          delete channelTyping[ctx.user.name];
          ee.emit("isTypingUpdate", roomId, channelTyping);
        }

        const defMessage = message!;
        ee.emit("add", roomId, defMessage);

        return message;
      }
    }),

  infinite: publicProcedure
    .input(
      z.object({
        roomId: z.string().uuid(),
        cursor: z.date().nullish(),
        take: z.number().min(1).max(50).nullish(),
      })
    )
    .query(async (opts) => {
      const take = opts.input.take ?? 20;
      const cursor = opts.input.cursor ?? new Date();
      console.log("🚀 ~ .query ~ take:", take);
      console.log("🚀 ~ .query ~ cursor:", cursor);
      const page = await db.query.Message.findMany({
        orderBy: (fields, ops) => ops.desc(fields.createdAt),
        where: (fields, ops) =>
          ops.and(
            ops.eq(fields.roomId, opts.input.roomId),
            cursor
              ? ops.lte(fields.createdAt, cursor.getMilliseconds())
              : undefined
          ),
        limit: take + 1,
      });

      const items = page.reverse();
      console.log("🚀 ~ .query ~ items:", items);
      let nextCursor: typeof cursor | null = null;
      if (items.length > take) {
        const prev = items.shift();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        nextCursor = new Date(prev!.createdAt);
      }
      return {
        items,
        nextCursor,
      };
    }),

  onAdd: authedProcedure
    .input(
      z.object({
        roomId: z.string().uuid(),
        // lastEventId is the last event id that the client has received
        // On the first call, it will be whatever was passed in the initial setup
        // If the client reconnects, it will be the last event id that the client received
        lastEventId: z.string().nullish(),
      })
    )
    .subscription(async function* (opts) {
      // We start by subscribing to the event emitter so that we don't miss any new events while fetching
      const iterable = ee.toIterable("add", {
        signal: opts.signal,
      });

      // Fetch the last message createdAt based on the last event id
      let lastMessageCreatedAt = await (async () => {
        const lastEventId = opts.input.lastEventId;
        if (!lastEventId) return null;

        const itemById = await db.query.Message.findFirst({
          where: (fields, ops) => ops.eq(fields.id, lastEventId),
        });
        return itemById?.createdAt ?? null;
      })();

      const newMessagesSinceLastMessage = await db.query.Message.findMany({
        where: (fields, ops) =>
          ops.and(
            ops.eq(fields.roomId, opts.input.roomId),
            lastMessageCreatedAt
              ? ops.gt(fields.createdAt, lastMessageCreatedAt)
              : undefined
          ),
        orderBy: (fields, ops) => ops.asc(fields.createdAt),
      });

      function* maybeYield(message: MessageType) {
        if (message.roomId !== opts.input.roomId) {
          // ignore posts from other channels - the event emitter can emit from other channels
          return;
        }
        if (lastMessageCreatedAt && message.createdAt <= lastMessageCreatedAt) {
          // ignore posts that we've already sent - happens if there is a race condition between the query and the event emitter
          return;
        }

        yield tracked(message.id, message);

        // update the cursor so that we don't send this post again
        lastMessageCreatedAt = message.createdAt;
      }

      // yield the posts we fetched from the db
      for (const post of newMessagesSinceLastMessage) {
        yield* maybeYield(post);
      }

      // yield any new posts from the event emitter
      for await (const [roomId, post] of iterable) {
        yield* maybeYield(post);
      }
    }),
});
