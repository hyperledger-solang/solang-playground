"use client";

import { SidebarView, useAppStore } from "@/app/state";
import FileExplorer from "./FileExplorer";
import Settings from "./Settings";
import { ExpNodeType } from "@/types/explorer";
import { store } from "@/state";
// import ContractExplorer from "./ContractExplorer";
import dynamic from "next/dynamic";
import { Fragment } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import Spinner from "./Spinner";
import { useSelector } from "@xstate/store/react";

const CompileExplorer = dynamic(() => import("./CompileExplorer"), { ssr: false });
const DeployExplorer = dynamic(() => import("./DeployExplorer"), { ssr: false });

function Sidebar() {
  const { sidebar } = useAppStore();
  const { explorer } = store.getSnapshot().context;


  if (sidebar === SidebarView.SETTINGS) {
    return <Settings />;
  }

  if (sidebar === SidebarView.COMPILE) {
    return <CompileExplorer />;
  }

  if (sidebar === SidebarView.DEPLOY) {
    return <DeployExplorer />;
  }

  return (
    <div className="">
      <FileExplorer root={explorer} />

    </div>
  );
}

function SidebarLayout() {
  const showSpinnerDialog = useSelector(store, (state) => state.context.showSpinnerDialog);
  const { sidebar, setSidebar } = useAppStore();
  return (
    <Fragment>
      <Dialog open={showSpinnerDialog}>
        <DialogContent className="w-max bg-transparent border-none shadow-none" icon={false}>
          <DialogHeader className="sr-only">
            <DialogTitle>Invoking Function</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Spinner />
          </div>
        </DialogContent>
      </Dialog>
      <div className="w-[300px] border-r border-[#2d2d2d] bg-[#1A1B3A] h-full">
        {/* Tabs */}
        <div className="flex border-b border-[#2d2d2d]">
          <button
            onClick={() => setSidebar(SidebarView.FILE_EXPLORER)}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${sidebar === SidebarView.FILE_EXPLORER
              ? 'bg-[#0F0F23] text-white border-b-2 border-b-[#8b5cf6]'
              : 'bg-[#1A1B3A] text-[#cccccc] hover:bg-[#2a2b5a]'
              }`}
          >
            Files
          </button>
          <button
            onClick={() => setSidebar(SidebarView.COMPILE)}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${sidebar === SidebarView.COMPILE
              ? 'bg-[#0F0F23] text-white border-b-2 border-b-[#8b5cf6]'
              : 'bg-[#1A1B3A] text-[#cccccc] hover:bg-[#2a2b5a]'
              }`}
          >
            Examples
          </button>
        </div>
        <Sidebar />
      </div>

    </Fragment>
  );
}

export default SidebarLayout;
