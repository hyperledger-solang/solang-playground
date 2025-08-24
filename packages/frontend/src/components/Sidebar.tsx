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
      <div className="w-[300px] border-r bg-card h-full pt-2">
        <h2 className="text-2xl py-4 uppercase px-3">Solang playground</h2>
        <Sidebar />
      </div>

    </Fragment>
  );
}

export default SidebarLayout;
