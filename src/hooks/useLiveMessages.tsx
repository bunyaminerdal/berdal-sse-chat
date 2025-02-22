"use client";
import { skipToken } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { trpc } from "~/lib/trpc";

export function useLiveMessages(roomId: string) {
  const [, query] = trpc.message.infinite.useSuspenseInfiniteQuery(
    { roomId: roomId },
    {
      getNextPageParam: (d) => d.nextCursor,
      // No need to refetch as we have a subscription
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );
  const utils = trpc.useUtils();
  const [messages, setMessages] = useState(() => {
    const msgs = query.data?.pages.map((page) => page.items).flat();
    return msgs ?? null;
  });
  type Message = NonNullable<typeof messages>[number];

  /**
   * fn to add and dedupe new messages onto state
   */
  const addMessages = useCallback((incoming?: Message[]) => {
    setMessages((current) => {
      const map: Record<Message["id"], Message> = {};
      for (const msg of current ?? []) {
        map[msg.id] = msg;
      }
      for (const msg of incoming ?? []) {
        map[msg.id] = msg;
      }
      return Object.values(map).sort((a, b) => a.createdAt - b.createdAt);
    });
  }, []);

  /**
   * when new data from `useInfiniteQuery`, merge with current state
   */
  useEffect(() => {
    const msgs = query.data?.pages.map((page) => page.items).flat();
    addMessages(msgs);
  }, [query.data?.pages, addMessages]);

  const [lastEventId, setLastEventId] = useState<
    // Query has not been run yet
    | false
    // Empty list
    | null
    // Event id
    | string
  >(false);
  if (messages && lastEventId === false) {
    // We should only set the lastEventId once, if the SSE-connection is lost, it will automatically reconnect and continue from the last event id
    // Changing this value will trigger a new subscription
    setLastEventId(messages.at(-1)?.id ?? null);
  }
  const subscription = trpc.message.onAdd.useSubscription(
    lastEventId === false ? skipToken : { roomId: roomId, lastEventId },
    {
      onData(event) {
        addMessages([event.data]);
      },
      onError(err) {
        console.error("Subscription error:", err);

        const lastMessageEventId = messages?.at(-1)?.id;
        if (lastMessageEventId) {
          // We've lost the connection, let's resubscribe from the last message
          setLastEventId(lastMessageEventId);
        }
      },
    }
  );
  return {
    query,
    messages,
    subscription,
  };
}
