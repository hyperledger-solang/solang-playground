"use client";

import { store } from "@/state";
import { useSelector } from "@xstate/store/react";
import React, { useEffect, useState } from "react";
import Hide from "./Hide";
import InvokeFunction from "./InvokeFunction";

function ContractExplorer() {
  const idl = useSelector(store, (state) => state.context.contract?.methods) || [];
  const deployed = useSelector(store, (state) => state.context.contract?.deployed) || {};
  const [keys, setKeys] = useState<string[]>([]);

  useEffect(() => {
    const ks = Object.keys(deployed)
    setKeys(ks)
  }, [deployed])

  const toggleCollapsed = (e: React.MouseEvent<HTMLElement>, k: string) => {
    const target = e.target as HTMLElement;
    const div = target.nextElementSibling as HTMLElement | null;

    if(div) {
      div.style.display = div.style.display === 'none' ? 'block' : 'none'
    }
  }

  return (
    <div className=" ">
      <div className="">
        <h2 className="text-base uppercase px-3">Contract Explorer</h2>
      </div>
      <div className="mt-10 relative z-10 px-3 overflow-x-clip">
        <div className="flex flex-col gap-2">
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
        </div>

        <Hide open={idl.length === 0}>
          <div className="text-center">
            <p>No Function or IDL Specified</p>
          </div>
        </Hide>
      </div>
    </div>
  );
}

export default ContractExplorer;
