import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import Link from "next/link";
import { Button } from "./button";
import ChatMenu from "./chat-menu";

function NavMenu() {
  return (
    <Disclosure>
      <div className="flex h-14 items-center justify-between border-b bg-white px-4 dark:border-gray-800 dark:bg-gray-900 sm:px-6 lg:px-8 ">
        <Link className="flex items-center gap-2" href="/">
          <span className="font-semibold">Berdal SSE Chat</span>
        </Link>
        <Button asChild size="icon" className="sm:hidden">
          <DisclosureButton className="group flex items-center">
            <Bars3Icon className="w-8 group-data-[open]:hidden block" />
            <XMarkIcon className="w-8 group-data-[open]:block hidden" />
          </DisclosureButton>
        </Button>
        <DisclosurePanel className="text-gray-500 absolute top-14 left-0 w-full bottom-0 flex-1 bg-white p-4 dark:bg-gray-900 z-10 sm:hidden flex justify-center">
          <ChatMenu />
        </DisclosurePanel>
      </div>
    </Disclosure>
  );
}
export default NavMenu;
