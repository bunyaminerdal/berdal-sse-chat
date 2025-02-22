import { HashtagIcon } from "@heroicons/react/24/outline";
import { Suspense } from "react";
import { Button } from "~/components/button";
import { CreateChannelDialog } from "~/components/create-channel";
import RoomList from "~/components/RoomList";
import { auth, SignedIn, SignedOut, signIn, signOut } from "~/server/auth";
const ChatMenu = async ({ roomId = "" }: { roomId?: string }) => {
  const session = await auth();
  return (
    <nav className="flex w-96 sm:w-64 flex-col  bg-white p-4 dark:bg-gray-900 ">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <HashtagIcon className="size-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium">Chat Rooms</span>
        </div>
        <Suspense>
          <SignedIn>
            <CreateChannelDialog />
          </SignedIn>
        </Suspense>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <SignedIn>
          <RoomList roomId={roomId} />
        </SignedIn>
      </Suspense>
      <div className="mt-auto">
        <div className="flex items-center justify-between">
          <Suspense>
            <SignedIn>
              <span className="text-sm font-medium">
                Hello, {session?.user?.name} 👋
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button type="submit" size="sm">
                  Sign Out
                </Button>
              </form>
            </SignedIn>
            <SignedOut>
              <form
                className="w-full"
                action={async () => {
                  "use server";
                  await signIn();
                }}
              >
                <Button type="submit" size="sm" className="w-full">
                  Sign In
                </Button>
              </form>
            </SignedOut>
          </Suspense>
        </div>
      </div>
    </nav>
  );
};

export default ChatMenu;
