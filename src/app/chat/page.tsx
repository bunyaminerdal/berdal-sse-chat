import ChatMenu from "~/components/chat-menu";
import NavMenu from "~/components/nav-menu";

export default async function Home() {
  return (
    <div className="flex h-screen flex-col">
      <NavMenu />
      <div className="flex flex-1 overflow-hidden ">
        <div className="hidden border-r dark:border-gray-800 w-64 sm:flex ">
          <ChatMenu roomId={""} />
        </div>
        <div className="p-10">Select a chat room</div>
      </div>
    </div>
  );
}
