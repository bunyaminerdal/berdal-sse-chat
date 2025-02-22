import { Suspense } from "react";
import { SignedIn } from "~/server/auth";
import { Chat } from "../../../components/chat";

export default async function Home(
  props: Readonly<{ params: Promise<{ roomId: string }> }>
) {
  const { roomId } = await props.params;

  return (
    <Suspense
      fallback={
        <div className="flex h-full flex-1 flex-row items-center justify-center italic">
          Loading....
        </div>
      }
    >
      <SignedIn>
        <Chat roomId={roomId} />
      </SignedIn>
    </Suspense>
  );
}
