import ChatMenu from "~/components/chat-menu";
import NavMenu from "~/components/nav-menu";

export default async function RoomsLayout(
  props: Readonly<{
    params: Promise<{ roomId: string }>;
    children: React.ReactNode;
  }>
) {
  const { roomId } = await props.params;

  return (
    <div className="flex h-screen flex-col group open">
      <NavMenu />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden sm:flex border-r dark:border-gray-800">
          <ChatMenu roomId={roomId} />
        </div>
        {props.children}
      </div>
    </div>
  );
}
