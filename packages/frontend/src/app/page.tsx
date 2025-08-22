'use client';

import Console from "@/components/Console";
import Editor from "@/components/Editor";
import Header from "@/components/Header";
import SidePanel from "@/components/SidePanel";
import Sidebar from "@/components/Sidebar";
import HomeTab from "@/components/HomeTab";
import { Toaster } from "@/components/ui/sonner"
import { useSelector } from "@xstate/store/react";
import { store } from "@/state";

export default function Home() {
  const currentFile = useSelector(store, (state) => state.context.currentFile);
  console.log("[Home] currentFile", currentFile);
  return (
    <div className="h-screen">
      <div className="flex flex-col h-full">
        <div className="flex-1 flex">
          <SidePanel />
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <div className="flex-1 relative">
              <Editor />
              {/* <HomeTab /> */}
            </div>
            <Console />
          </div>
        </div>
        {/* <Footer /> */}
      </div>
      <Toaster />
    </div>
  );
}
