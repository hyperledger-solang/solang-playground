"use client";

import { store } from "@/state";
import { useSelector } from "@xstate/store/react";
import React, { useEffect, useState } from "react";
import Hide from "./Hide";
import InvokeFunction from "./InvokeFunction";
import useDeploy from "@/hooks/useDeploy";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectIcon, SelectItem, SelectItemText, SelectPortal, SelectTrigger, SelectValue, SelectViewport } from "@radix-ui/react-select";
import { ArchiveX, ChevronDownIcon, Copy, LucideDelete } from "lucide-react";
import useCompile from "@/hooks/useCompile";

function DeployExplorer() {
  const {compileFile} = useCompile();
  
  const {deployWasm} = useDeploy();
  const currFileTabSelected = useSelector(store, (state) => state.context.currentFile);
  const compiled = useSelector(store, (state) => state.context.compiled);
  const currWasm = useSelector(store, (state) => state.context.currentWasm);
  const deployed = useSelector(store, (state) => state.context.contract?.deployed) || {};
  const [keys, setKeys] = useState<string[]>([]);
  const [copied, setCopied] = useState<boolean>(!1);
  const [selected, setSelected] = useState<string>(compiled.length ? compiled[0].path : '');

  useEffect(() => {
    console.log('[tur] current file tab:', currFileTabSelected)
    currFileTabSelected && setSelected(currFileTabSelected || '')
  }, [currFileTabSelected])
  
  useEffect(() => {
    console.log('[tur] compiled updated:', compiled)
  }, [compiled])

  const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const v = event.target.value;
    console.log("[tur] Custom selected:", v);
    setSelected(v);
    store.send({ type: "setCurrentPath", path: v });
  };

  useEffect(() => {
    const ks = Object.keys(deployed)
    console.log('[tur] useEffect deployed:', ks)
    setKeys(ks || [])
  }, [deployed])

  const toggleCollapsed = (e: React.MouseEvent<HTMLElement>, k: string) => {
    // const target = e.target as HTMLElement;
    // const div = target.nextElementSibling as HTMLElement | null;

    // if(div) {
    //   div.style.display = div.style.display === 'none' ? 'block' : 'none'
    // }
    const span = e.currentTarget as HTMLElement;
    const parentP = span.parentElement;
    const containerDiv = parentP?.parentElement;

    const hiddenDiv = containerDiv?.querySelector('div') as HTMLElement | null;

    if (hiddenDiv) {
      hiddenDiv.style.display = hiddenDiv.style.display === 'none' ? 'block' : 'none';
    }
  }

  const handleDeploy = async () => {
    let contract: Buffer | null = null;
    console.log('[tur] selected path', selected)
    console.log('[tur] curr wasm path', currWasm.path)
    if(selected.indexOf(currWasm.path) == -1) {
      console.log('[tur] so compiling..')
      const res = await compileFile();
      contract = res.data;
    }
    const result = await deployWasm(contract)
    console.log('[tur] deployed?', result)
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(!0);
      setTimeout(() => setCopied(!1), 1500);
      console.log('[tur] copied!')
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleRemoveDeployed = async (k: string) => {
    console.log('[tur] keys:', keys)
    store.send({ type: 'deleteDeployed', addr: k})
  }

  return (
    <div className=" ">
      <div className="">
        <h2 className="text-base uppercase px-3">Deploy Explorer</h2>
      </div>
      <div className="mt-10 relative z-10 px-3 overflow-x-clip">
        <div>
          <div style={{marginBottom: '1rem'}}>
            <p style={{marginBottom: '1rem'}}>CONTRACTS</p>
            <select
              disabled={compiled.length == 0}
              value={selected}
              onChange={handleSelect}
              className="w-48 px-4 py-2 rounded shadow-md"
              style={{
                backgroundColor: 'hsl(var(--background))',
                color: 'white',
                border: '1px solid hsl(var(--card))',
              }}
            >
              {compiled.map((c, i) => (
                <option key={`${c.path}__${i}`} value={c.path} style={{ backgroundColor: 'hsl(var(--card))' }}>{c.name}</option>
              ))}
            </select>
            
          </div>
        </div>
        <div className="relative inline-block w-48">
          <div>
            <Button
              disabled={compiled.length == 0}
              variant="outline"
              size="lg"
              onClick={handleDeploy}
            >
              Depoly
            </Button>
          </div>
        </div>
        {keys.length ? <p style={{marginTop: '1rem', marginBottom: '1rem'}}>DEPLOYED</p> : <></>}
        <div className="flex flex-col gap-2">
          {
            keys.map(k => (
            <div key={k}>
              <p
                key={k}
                style={{display: 'flex', justifyContent: 'space-between'}}
              >
                <span style={{cursor: 'pointer'}} onClick={e => toggleCollapsed(e, k)}>
                  {`${k.substring(0, 5)}..${k.substring(50)}`}
                </span>
                <Copy style={{cursor: 'pointer'}} size={16} onClick={e => handleCopy(k)} />
                {/* {copied && <span style={{ color: "green" }}>Copied!</span>} */}
                <ArchiveX style={{cursor: 'pointer'}} size={16} onClick={e => handleRemoveDeployed(k)}/>                
              </p>
              <div key={k} style={{display: 'none'}}>
                { 
                  deployed[k] && deployed[k].map(item => (
                    <InvokeFunction contractAddress={k} key={item.name} method={item} />
                  ))
                }
              </div>
            </div>
            )
          )
          }
        </div>

        {/* <Hide open={idl.length === 0}>
          <div className="text-center">
            <p>No Function or IDL Specified</p>
          </div>
        </Hide> */}
      </div>
    </div>
  );
}

export default DeployExplorer;
