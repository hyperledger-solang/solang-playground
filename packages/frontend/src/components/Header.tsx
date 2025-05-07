"use client";

import { useEffect, useRef, useState } from "react";
import { FaPlay, FaTimes } from "react-icons/fa";
import { Keypair, Networks } from "@stellar/stellar-sdk";
import { useSelector } from "@xstate/store/react";
import deployStellerContract from "@/lib/deploy-steller";
import generateIdl from "@/lib/idl-wasm";
import { cn } from "@/lib/utils";
import { store } from "@/state";
import { useExplorerItem, useFileContent } from "@/state/hooks";
import { logger } from "@/state/utils";
import DeployToSteller from "./DeployToSteller";
import Hide from "./Hide";
import IconButton from "./IconButton";

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
  const code = useFileContent();
  const tabs = useSelector(store, (state) => state.context.tabs);
  const containerRef = useRef<HTMLDivElement>(null);
  const [contract, setContract] = useState<null | Buffer>(null);

  async function handleCompile() {
    if (!code) {
      return logger.error("Error: No Source Code Found");
    }

    logger.info("Compiling contract...");

    const opts: RequestInit = {
      method: "POST",
      mode: "cors",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: code,
      }),
    };

    const { result, success, message } = await fetch("/compile", opts).then(async (res) => {
      console.log(res);
      const result = await res.json().catch(() => null);

      if (!result) {
        return {
          success: false,
          message: res.statusText,
          result: null,
        };
      }

      return {
        success: res.ok,
        message: res.statusText,
        result: result,
      };
    });

    if (success) {
      if (result.type === "SUCCESS") {
        const wasm = result.payload.wasm;
        logger.info("Contract compiled successfully!");
        setContract(wasm);
      } else {
        const message = result.payload.compile_stderr;
        logger.error(message);
      }
    } else {
      logger.error(message);
    }
  }

  async function handleDeploy() {
    if (!contract) {
      return;
    }

    const keypair = Keypair.random();

    logger.info("Deploying contract...");
    const idl = await generateIdl(contract);
    store.send({ type: "updateContract", methods: idl });
    const contractAddress = await deployStellerContract(contract, keypair, Networks.TESTNET);
    logger.info("Contract deployed successfully!");
    contractAddress && store.send({ type: "updateContract", address: contractAddress });
  }

  return (
    <div className="bg-card h-[35px] text-sm border-b flex select-none">
      <div className="border-r">
        <button className="px-3 h-full flex items-center gap-2" onClick={handleCompile}>
          <FaPlay className="text-[#32ba89]" size={12} />
          Compile
        </button>
      </div>
      <div className="border-r">
        <button className="px-3 h-full flex items-center gap-2" onClick={handleDeploy}>
          <FaPlay className="text-[#32ba89]" size={12} />
          Deploy
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
