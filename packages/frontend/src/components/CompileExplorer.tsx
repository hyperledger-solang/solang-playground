"use client";

import { store } from "@/state";
import { useSelector } from "@xstate/store/react";
import React, { useEffect, useState } from "react";
import Hide from "./Hide";
import { Button } from "./ui/button";
import { useExplorerItem } from "@/state/hooks";
import { FileType } from "@/types/explorer";
import { get } from "lodash";
import useCompile from "@/hooks/useCompile";

function CompileExplorer() {
  const { compileFile } = useCompile();
  
  const selected = useSelector(store, (state) => state.context.currentFile);
  const obj = useSelector(store, (state) => get(state.context, selected || '')) as FileType;
  const [name, setName] = useState<string>('');
  
  
  const [isSelected, setSelected] = useState<boolean>(!1);
  
  console.log('[tur] selected', selected)
  
  useEffect(() => {
    if(selected && selected !== 'home') {
      setName(obj.name);
      setSelected(!0);
    }
  }, [selected])

  const handleCompile = async () => {
    const result = await compileFile();
    selected && selected !== 'home' &&
    store.send({ type: "addCompiled", path: selected, name });
    console.log('[tur] compilation result', result);
  }

  return (
    <div className=" ">
      <div className="">
        <h2 className="text-base uppercase px-3">Compile Explorer</h2>
      </div>
      <div className="mt-10 relative z-10 px-3 overflow-x-clip">
        <Button 
          disabled={!isSelected}
          onClick={handleCompile} 
          variant="outline" size="lg"
        >
          Compile {isSelected ? name : ''}
        </Button>
        {/* <div className="flex flex-col gap-2">
          {
            keys.map(k => (
            <div key={k} >
              <p
                style={{cursor: 'pointer'}} 
                onClick={e => toggleCollapsed(e, k)}
              >
                {`${k.substring(0, 5)}..${k.substring(50)}`}
              </p>
              <div style={{display: 'none'}}>
                { 
                  deployed[k].map(item => (
                    <InvokeFunction key={item.name} method={item} />
                  ))
                }
              </div>
            </div>
            )
          )
          }
        </div> */}

        {/* <Hide open={idl.length === 0}>
          <div className="text-center">
            <p>No Function or IDL Specified</p>
          </div>
        </Hide> */}
      </div>
    </div>
  );
}

export default CompileExplorer;
