"use client";

import { useEffect, useRef, useState } from "react";
import { FaPlay, FaTimes } from "react-icons/fa";
import { useSelector } from "@xstate/store/react";
import { cn } from "@/lib/utils";
import { store } from "@/state";
import { useExplorerItem, useFileContent } from "@/state/hooks";
import Hide from "./Hide";
import IconButton from "./IconButton";
import useCompile from "@/hooks/useCompile";
import useDeploy from "@/hooks/useDeploy";
import { FileType } from "@/types/explorer";
import { get } from "lodash";

function TabItem({ path }: { path: string }) {
  const file = useExplorerItem(path);
  const active = useSelector(store, (state) => state.context.currentFile === path);
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [active]);

  return (
    <div
      ref={itemRef}
      onClick={() => store.send({ type: "setCurrentPath", path })}
      className={cn(
        "bg-foreground/10 px-3 py-1 w-max h-full flex items-center gap-32 border-r duration-150 active:opacity-50",
        active && "border-t border-t-primary bg-background/20",
      )}
    >
      <h3 className="min-w-max">{file?.name}</h3>
      <IconButton
        className={cn("opacity-0 hover:opacity-100", active && "opacity-100")}
        onClick={() => store.send({ type: "removeTab", path })}
      >
        <FaTimes size={15} />
      </IconButton>
    </div>
  );
}

function TabHome({ path }: { path: string }) {

  const active = useSelector(store, (state) => state.context.currentFile === path);
  const itemRef = useRef<HTMLDivElement>(null);
  console.log('item ref:', itemRef.current);
  useEffect(() => {
    if (active && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    console.log('active:', active);
  }, [active]);

  return (
    <div
      ref={itemRef}
      onClick={() => store.send({ type: "setCurrentPath", path })}
      className={cn(
        "bg-foreground/10 px-3 py-1 w-max h-full flex items-center gap-32 border-r duration-150 active:opacity-50 select-none",
        active && "border-t border-t-primary bg-background/20",
      )}
    >
      <h3 className="min-w-max">Home</h3>
      <IconButton
        className={cn("opacity-0 hover:opacity-100", active && "opacity-100")}
        onClick={() => store.send({ type: "removeTab", path })}
      >
        <FaTimes size={15} />
      </IconButton>
    </div>
  );
}

function Header() {
  const { compileFile } = useCompile();
  const { deployWasm } = useDeploy();
  const code = useFileContent();
  const tabs = useSelector(store, (state) => state.context.tabs);
  const containerRef = useRef<HTMLDivElement>(null);
  const [contract, setContract] = useState<null | Buffer>(null);
  const selected = useSelector(store, (state) => state.context.currentFile);
  // const showSpinnerDialog = useSelector(store, (state) => state.context.showSpinnerDialog);
const [name, setName] = useState<string>('');
  const obj = useSelector(store, (state) => get(state.context, selected || '')) as FileType;

  console.log('[header] tabs', tabs)
  useEffect(() => {
      if(selected && selected !== 'home') {
        setName(obj.name);
      }
    }, [selected])

  const handleCompile = async () => {
    const result = await compileFile()
    if(selected && selected !== 'home')
          store.send({ type: "addCompiled", path: selected, name });
    console.log('[-] compilation result', result)
  }

  return (
    <div className="bg-card h-[35px] text-sm border-b flex select-none">
      <div className="border-r">
        <button className="px-3 h-full flex items-center gap-2" onClick={handleCompile}>
          <FaPlay className="text-[#32ba89]" size={12} />
          Compile
        </button>
      </div>
      <div className="flex flex-1 w-0">
        <div ref={containerRef} className="overflow-x-auto flex scroll-smooth">
          {[...tabs].map((tab) => (
            <Hide key={tab} open={tab !== "home"} fallback={<TabHome path={tab} />}>
              <TabItem key={tab} path={tab} />
            </Hide>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Header;
