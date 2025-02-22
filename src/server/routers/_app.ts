/**
 * This file contains the root router of your tRPC-backend
 */
import { createCallerFactory } from "@trpc/server/unstable-core-do-not-import";
import { cache } from "react";
import { auth } from "../auth";
import type { Context } from "../context";
import { router } from "../trpc";
import { messageRouter } from "./message";
import { roomRouter } from "./room";
import { userRouter } from "./user";

export const appRouter = router({
  room: roomRouter,
  message: messageRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;

const createCallerContext = cache(
  async (): Promise<Context> => ({
    session: await auth(),
  })
);

export const caller = createCallerFactory()(appRouter)(createCallerContext);
