import { useMemo } from "react";
import { trpc } from "~/lib/trpc";

/**
 * Set isTyping with a throttle of 1s
 * Triggers immediately if state changes
 */
export function useThrottledIsTypingMutation(roomId: string) {
  const isTyping = trpc.room.isTyping.useMutation();

  return useMemo(() => {
    let state = false;
    let timeout: ReturnType<typeof setTimeout> | null;
    function trigger() {
      timeout && clearTimeout(timeout);
      timeout = null;

      isTyping.mutate({ typing: state, roomId });
    }

    return (nextState: boolean) => {
      const shouldTriggerImmediately = nextState !== state;

      state = nextState;
      if (shouldTriggerImmediately) {
        trigger();
      } else if (!timeout) {
        timeout = setTimeout(trigger, 1000);
      }
    };
  }, [roomId]);
}
