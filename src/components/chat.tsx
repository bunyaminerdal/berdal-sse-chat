"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { run } from "@trpc/server/unstable-core-do-not-import";
import { cx } from "class-variance-authority";
import { format, formatDistanceToNow, isToday } from "date-fns";
import { signIn, useSession } from "next-auth/react";
import * as React from "react";
import { Avatar } from "~/components/avatar";
import { Button } from "~/components/button";
import { Textarea } from "~/components/input";
import { useLiveMessages } from "~/hooks/useLiveMessages";
import { useThrottledIsTypingMutation } from "~/hooks/useThrottledIsTypingMutation";
import { trpc } from "~/lib/trpc";
import { listWithAnd, pluralize } from "~/utils/utils";

function SubscriptionStatus(props: { subscription: any }) {
  const { subscription } = props;
  return (
    <div
      className={cx(
        "rounded-full p-2 text-sm transition-colors",
        run(() => {
          switch (subscription.status) {
            case "idle":
            case "connecting":
              return "bg-white text-gray-500 dark:bg-gray-900 dark:text-gray-400";
            case "error":
              return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
            case "pending":
              return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
          }
        })
      )}
    >
      {run(() => {
        switch (subscription.status) {
          case "idle":
          case "connecting":
            // treat idle and connecting the same

            return (
              <div>
                Connecting...
                {subscription.error && " (There are connection problems)"}
              </div>
            );
          case "error":
            // something went wrong
            return (
              <div>
                Error - <em>{subscription.error.message}</em>
                <a
                  href="#"
                  onClick={() => {
                    subscription.reset();
                  }}
                  className="hover underline"
                >
                  Try Again
                </a>
              </div>
            );
          case "pending":
            // we are polling for new messages
            return <div>Connected - awaiting messages</div>;
        }
      })}
    </div>
  );
}

export function Chat(props: Readonly<{ roomId: string }>) {
  const { roomId } = props;
  const livePosts = useLiveMessages(roomId);
  const currentlyTyping = trpc.room.whoIsTyping.useSubscription({
    roomId,
  });
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const session = useSession().data;

  return (
    <main className="flex-1 overflow-hidden">
      <div className="flex h-full flex-col">
        {/* connection status indicator */}
        <div className="relative flex items-center justify-center gap-2 p-4 sm:p-6 lg:p-8">
          {/* connection status indicator - centered */}
          <div className="absolute right-0 top-0 flex items-center justify-center gap-2 rounded-full p-2 text-sm">
            <SubscriptionStatus subscription={livePosts.subscription} />
          </div>
        </div>
        <div
          className="flex flex-1 flex-col-reverse overflow-y-scroll p-4 sm:p-6 lg:p-8"
          ref={scrollRef}
        >
          {/* Inside this div things will not be reversed. */}
          <div>
            <div className="grid gap-4">
              <div>
                <Button
                  className={cx(
                    "",
                    livePosts.query.hasNextPage ? "" : "hidden"
                  )}
                  disabled={
                    !livePosts.query.hasNextPage ||
                    livePosts.query.isFetchingNextPage
                  }
                  onClick={() => {
                    void livePosts.query.fetchNextPage();
                  }}
                >
                  {livePosts.query.isFetchingNextPage
                    ? "Loading..."
                    : !livePosts.query.hasNextPage
                    ? ""
                    : "Load more"}
                </Button>
              </div>

              {livePosts.messages?.map((item) => {
                const isMe = item.senderName === session?.user?.name;
                const createdAt = new Date(item.createdAt);
                return (
                  <div
                    key={item.id}
                    className={cx(
                      "flex items-start gap-3",
                      isMe ? "justify-end" : "justify-start"
                    )}
                  >
                    <Avatar
                      alt="Avatar"
                      className="size-8"
                      initials={item.senderName.substring(0, 2)}
                    />

                    <div className="flex flex-col gap-1">
                      <div
                        className={cx(
                          "rounded-lg bg-gray-100 p-3 text-sm",
                          isMe
                            ? "bg-gray-300 dark:bg-gray-800"
                            : "bg-gray-200 dark:bg-gray-700"
                        )}
                      >
                        <p>{item.content}</p>
                      </div>
                      <div className="text-xs italic text-gray-500 dark:text-gray-400">
                        {isToday(createdAt)
                          ? formatDistanceToNow(createdAt) + " ago"
                          : format(createdAt, "MMM d, yyyy h:mm a")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-sm italic text-gray-400">
              {currentlyTyping.data?.length ? (
                `${listWithAnd(currentlyTyping.data)} ${pluralize(
                  currentlyTyping.data.length,
                  "is",
                  "are"
                )} typing...`
              ) : (
                <>&nbsp;</>
              )}
            </p>
          </div>
        </div>

        <div className="border-t bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
          {session ? (
            <AddMessageForm
              roomId={roomId}
              onMessagePost={() => {
                scrollRef.current?.scroll({
                  // `top: 0` is actually the bottom of the chat due to `flex-col-reverse`
                  top: 0,
                  behavior: "smooth",
                });
              }}
            />
          ) : (
            <Button
              className="w-full"
              variant="ghost"
              onClick={() => {
                void signIn();
              }}
            >
              Sign in to post a message
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}

function AddMessageForm(props: { onMessagePost: () => void; roomId: string }) {
  const { roomId } = props;
  const addPost = trpc.message.add.useMutation();

  const [message, setMessage] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);

  function postMessage() {
    const input = {
      content: message,
      roomId,
    };
    setMessage("");
    addPost.mutate(input, {
      onSuccess() {
        props.onMessagePost();
      },
      onError(error) {
        setMessage(input.content);
      },
    });
  }

  const isTypingMutation = useThrottledIsTypingMutation(roomId);

  React.useEffect(() => {
    // update isTyping state
    isTypingMutation(isFocused && message.trim().length > 0);
  }, [isFocused, message, isTypingMutation]);

  return (
    <div className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          /**
           * In a real app you probably don't want to use this manually
           * Checkout React Hook Form - it works great with tRPC
           * @see https://react-hook-form.com/
           */
          postMessage();
        }}
      >
        <Textarea
          className="pr-12"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={message.split(/\r|\n/).length}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              postMessage();
            }
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoFocus
        />
        <Button
          className="absolute right-2 top-2"
          size="icon"
          type="submit"
          variant="ghost"
          title="Send message"
        >
          <PaperAirplaneIcon className="size-5" />
        </Button>
      </form>
    </div>
  );
}
