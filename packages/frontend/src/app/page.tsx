'use client';

import Console from "@/components/Console";
import Editor from "@/components/Editor";
import { Header, FileTabs } from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import RightPanel from "@/components/RightPanel";
import HomeTab from "@/components/HomeTab";
import { Toaster } from "@/components/ui/sonner"
import { useSelector } from "@xstate/store/react";
import { store } from "@/state";

export default function Home() {
  const currentFile = useSelector(store, (state) => state.context.currentFile);
  console.log("[Home] currentFile", currentFile);
  return (
    <div className="h-screen bg-[#1A1B3A] flex flex-col relative overflow-hidden">
      <Header />
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-0 min-w-0 relative">
          <FileTabs />
          <div className="flex-1 min-h-0 relative z-10">
            <Editor />
            {/* <HomeTab /> */}
          </div>
        </div>
        <RightPanel />
      </div>
      <div className="relative z-20">
        <Console />
      </div>
      <Toaster />
    </div>
  );
}
