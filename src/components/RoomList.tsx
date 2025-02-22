import { HashtagIcon } from "@heroicons/react/24/outline";
import { cx } from "class-variance-authority";
import Link from "next/link";
import { auth } from "~/server/auth";
import { caller } from "~/server/routers/_app";

const RoomList = async ({ roomId }: { roomId: string }) => {
  const session = await auth();
  const rooms = await caller.room.list({ userId: session?.user?.id ?? "" });

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
      {rooms.map((room) => (
        <Link
          key={room.id}
          className={cx(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-50",
            room.id === roomId &&
              "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
          )}
          href={`/chat/${room.id}`}
        >
          <HashtagIcon className="h-4 w-4" />
          {room.name}
        </Link>
      ))}
    </div>
  );
};

export default RoomList;
