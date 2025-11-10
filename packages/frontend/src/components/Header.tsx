"use client";

import { useEffect, useRef, useState } from "react";
import { FaPlay, FaTimes, FaRocket, FaCode, FaMoon, FaSun } from "react-icons/fa";
import Image from "next/image";
import SolangLogo from "@/assets/image/solang-logo.png";
import { useSelector } from "@xstate/store/react";
import { cn } from "@/lib/utils";
import { store } from "@/state";
import { useExplorerItem, useFileContent } from "@/state/hooks";
import Hide from "./Hide";
import IconButton from "./IconButton";
import useCompile from "@/hooks/useCompile";
import CompilerOptionsModal from "./CompilerOptionsModal";
import useDeploy from "@/hooks/useDeploy";
import { FileType } from "@/types/explorer";
import DeployContractModal from "./DeployContractModal";
import InvokeFunctionModal from "./InvokeFunctionModal";
import { get } from "lodash";
import ErrorModal from "./ErrorModal";
import useWallet from "@/hooks/useWallet";
import { truncateAddress } from "@/lib/web3";

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
        "px-4 py-2 w-max h-full flex items-center gap-2 border-r border-[#2d2d2d] duration-150 active:opacity-50 cursor-pointer",
        active
          ? "bg-[#0F0F23] text-white border-t-2 border-t-[#8b5cf6]"
          : "bg-[#1A1B3A] text-[#cccccc] hover:bg-[#2a2b5a]",
      )}
    >
      <h3 className="min-w-max text-sm">{file?.name}</h3>
      <IconButton
        className={cn("opacity-0 hover:opacity-100 text-[#cccccc] hover:text-white", active && "opacity-100")}
        onClick={() => store.send({ type: "removeTab", path })}
      >
        <FaTimes size={12} />
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
        "px-4 py-2 w-max h-full flex items-center gap-2 border-r border-[#2d2d2d] duration-150 active:opacity-50 select-none cursor-pointer",
        active
          ? "bg-[#0F0F23] text-white border-t-2 border-t-[#8b5cf6]"
          : "bg-[#1A1B3A] text-[#cccccc] hover:bg-[#2a2b5a]",
      )}
    >
      <h3 className="min-w-max text-sm">Home</h3>
      <IconButton
        className={cn("opacity-0 hover:opacity-100 text-[#cccccc] hover:text-white", active && "opacity-100")}
        onClick={() => store.send({ type: "removeTab", path })}
      >
        <FaTimes size={12} />
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
    if (selected && selected !== 'home') {
      setName(obj.name);
    }
  }, [selected])

  const handleCompile = async () => {
    const result = await compileFile()

    // Check if compilation failed
    if (result.err) {
      setCompileErrorMessage(result.err);
      setShowCompileErrorModal(true);
      return;
    }

    // Only add to compiled list if compilation was successful
    if (selected && selected !== 'home' && result.data) {
      store.send({ type: "addCompiled", path: selected, name });
    }

    console.log('[-] compilation result', result)
  }

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [openCompile, setOpenCompile] = useState(false);
  const [openDeploy, setOpenDeploy] = useState(false);
  const [openInvoke, setOpenInvoke] = useState(false);
  const [showCompileErrorModal, setShowCompileErrorModal] = useState(false);
  const [compileErrorMessage, setCompileErrorMessage] = useState<string>("");
  const { publicKey } = useWallet();

  return (
    <div className="bg-[#1A1B3A] h-[60px] w-full border-b border-white flex items-center justify-between px-8 select-none">
      {/* Left side - Logo + Text + Action Buttons */}
      <div className="flex items-center gap-6">
        {/* Solang Logo + Text */}
        <div className="flex items-center gap-3">
          <Image src={SolangLogo} alt="Solang Logo" width={32} height={32} />
          <h1 className="text-white text-lg font-semibold">Solang IDE</h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Compile Button */}
          <button
            onClick={() => setOpenCompile(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-md text-sm font-medium transition-colors"
          >
            <FaCode size={14} />
            Compile
          </button>

          {/* Deploy Button */}
          <button
            onClick={() => setOpenDeploy(true)}
            className="flex items-center gap-2 px-4 py-2 bg-transparent hover:bg-[#2a2b5a] text-white rounded-md text-sm font-medium transition-colors border border-[#404040]"
          >
            <FaRocket size={14} />
            Deploy
          </button>

          {/* Invoke Button */}
          <button
            onClick={() => setOpenInvoke(true)}
            className="flex items-center gap-2 px-4 py-2 bg-transparent hover:bg-[#2a2b5a] text-white rounded-md text-sm font-medium transition-colors border border-[#404040]"
          >
            <FaPlay size={14} />
            Invoke
          </button>
        </div>
      </div>

      {/* Right side - Network Info and Controls */}
      <div className="flex items-center gap-6">
        {/* Network Information */}
        <div className="flex items-center gap-3 text-[#9ca3af] text-sm">
          <span>Target: Soroban</span>
          <span>|</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Network: Testnet</span>
          </div>
        </div>

        {/* Account Dropdown */}
        <div className="flex items-center gap-2">
          <select className="bg-[#2d2d2d] border border-[#404040] text-white text-sm px-3 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]">
            <option>Account: {truncateAddress(publicKey)}</option>
          </select>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 text-[#9ca3af] hover:text-white transition-colors"
        >
          {isDarkMode ? <FaMoon size={16} /> : <FaSun size={16} />}
        </button>
      </div>
      {/* Modals */}
      <CompilerOptionsModal isOpen={openCompile} onClose={() => setOpenCompile(false)} />
      <DeployContractModal isOpen={openDeploy} onClose={() => setOpenDeploy(false)} />
      <InvokeFunctionModal isOpen={openInvoke} onClose={() => setOpenInvoke(false)} />

      {/* Compilation Error Modal */}
      <ErrorModal
        isOpen={showCompileErrorModal}
        onClose={() => setShowCompileErrorModal(false)}
        title="Compilation Error"
        message={compileErrorMessage}
      />
    </div>
  );
}

// File Tabs Component (to be used below the header)
export function FileTabs() {
  const tabs = useSelector(store, (state) => state.context.tabs);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-[#1A1B3A] h-[48px] text-sm border-b border-[#2d2d2d] flex select-none">
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

export { Header };
export default Header;
