"use client";

import Image from "next/image";
import SolangLogo from "@/assets/image/solang-logo.png";
import { Button } from "./ui/button";
import { FaCog } from "react-icons/fa";
import { SidebarView, useAppStore } from "@/app/state";
import { Files, FunctionSquare, LucideFiles, SquareFunction, Star, RefreshCcw, SquarePlay, LucideProps } from "lucide-react";
import useCompile from "@/hooks/useCompile";
import useDeploy from "@/hooks/useDeploy";
import { useState } from "react";

// import * as imgs from "@/assets/image";
import CompileIcon from "@/assets/image/compile.svg";
import DeployAndRunIcon from "@/assets/image/deployAndRun.svg";
import FileManagerIcon from "@/assets/image/fileManager.svg";

function SidePanel() {
  const { compileFile } = useCompile();
  const { deployWasm } = useDeploy();
  const [contract, setContract] = useState<null | Buffer>(null);

  
  const setSidebar = useAppStore((state) => state.setSidebar);
  return (
    <div className="w-[50px] flex flex-col border-r h-full py-3 items-center">
      <div className="">
        <Image className="mx-auto" src={SolangLogo.src} height={40} width={40} alt="Solang Logo" />
      </div>
      <div className="flex-1 flex flex-col gap-2 mt-6">
        <Button
        tooltip="File Management" 
        onClick={() => setSidebar(SidebarView.FILE_EXPLORER)} 
        variant="outline" 
        size="icon">
          <Image
              src={FileManagerIcon}
              alt="File Manager Icon"
              width={25} 
              height={35}
            />
        </Button>
        <Button
        tooltip="Solidity Compiler" 
            onClick={() => setSidebar(SidebarView.COMPILE)} 
            variant="outline" 
            size="icon"
        >
            <Image
              src={CompileIcon}
              alt="Compile Icon"
              width={25} 
              height={35} 
            />
        </Button>
        <Button
          tooltip="Deploy and Invoke" 
          onClick={() => setSidebar(SidebarView.DEPLOY)} 
          variant="outline" 
          size="icon">
          <Image
              src={DeployAndRunIcon}
              alt="Deploy and Run Icon"
              width={25} 
              height={35}
            />
        </Button>
      </div>
      <div className="">
        <Button onClick={() => setSidebar(SidebarView.SETTINGS)} variant="outline" size="icon">
          <FaCog size={30} />
        </Button>
      </div>
    </div>
  );
}

export default SidePanel;
