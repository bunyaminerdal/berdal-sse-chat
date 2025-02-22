import { z } from "zod";
import { db } from "~/server/db/client";
import { User } from "../db/schema";
import { publicProcedure, router } from "../trpc";
export const userRouter = router({
  userCreate: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async (opts) => {
      const { input } = opts;

      const existedUser = await db.query.User.findFirst({
        where: (user, { eq }) => eq(user.name, input.name),
      });
      if (existedUser) return existedUser;

      // Create a new user in the database
      const user = await db
        .insert(User)
        .values({ name: input.name })
        .returning();

      return user;
    }),
});
