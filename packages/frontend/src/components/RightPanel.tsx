"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import useCompile from "@/hooks/useCompile";
import useDeploy from "@/hooks/useDeploy";
import { useSelector } from "@xstate/store/react";
import { store } from "@/state";
import { FileType } from "@/types/explorer";
import { get } from "lodash";

function RightPanel() {
    const [activeTab, setActiveTab] = useState<'Build' | 'Artifacts' | 'Invoke'>('Build');
    const { compileFile } = useCompile();
    const { deployWasm } = useDeploy();

    const selected = useSelector(store, (state) => state.context.currentFile);
    const compiled = useSelector(store, (state) => state.context.compiled);
    const contract = useSelector(store, (state) => state.context.contract);

    const obj = useSelector(store, (state) => get(state.context, selected || '')) as FileType;
    const [name, setName] = useState<string>('');

    const handleCompile = async () => {
        const result = await compileFile();
        if (selected && selected !== 'home') {
            store.send({ type: "addCompiled", path: selected, name });
        }
        console.log('[RightPanel] compilation result', result);
    };

    const handleDeploy = async () => {
        // Add deploy functionality here
        console.log('Deploy clicked');
    };

    return (
        <div className="w-[300px] border-l border-[#2d2d2d] bg-[#1A1B3A] h-full">
            {/* Tabs */}
            <div className="flex border-b border-[#2d2d2d]">
                <button
                    onClick={() => setActiveTab('Build')}
                    className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${activeTab === 'Build'
                        ? 'bg-[#0F0F23] text-white border-b-2 border-b-[#8b5cf6]'
                        : 'bg-[#1A1B3A] text-[#cccccc] hover:bg-[#2a2b5a]'
                        }`}
                >
                    Build
                </button>
                <button
                    onClick={() => setActiveTab('Artifacts')}
                    className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${activeTab === 'Artifacts'
                        ? 'bg-[#0F0F23] text-white border-b-2 border-b-[#8b5cf6]'
                        : 'bg-[#1A1B3A] text-[#cccccc] hover:bg-[#2a2b5a]'
                        }`}
                >
                    Artifacts
                </button>
                <button
                    onClick={() => setActiveTab('Invoke')}
                    className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${activeTab === 'Invoke'
                        ? 'bg-[#0F0F23] text-white border-b-2 border-b-[#8b5cf6]'
                        : 'bg-[#1A1B3A] text-[#cccccc] hover:bg-[#2a2b5a]'
                        }`}
                >
                    Invoke
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-3">
                {activeTab === 'Build' && (
                    <div className="space-y-4">
                        <div className="text-[#cccccc] text-sm">
                            {compiled.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-[#9ca3af] text-sm">No artifacts yet — press Compile.</p>
                                    <Button
                                        onClick={handleCompile}
                                        className="mt-4 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
                                        size="sm"
                                    >
                                        Compile Contract
                                    </Button>
                                </div>
                            ) : (
                                <div>
                                    <h3 className="text-[#cccccc] text-sm font-medium mb-2">Build Results</h3>
                                    <div className="space-y-2">
                                        {compiled.map((item, index) => (
                                            <div key={index} className="bg-[#2d2d2d] p-2 rounded text-xs text-[#9ca3af]">
                                                {item.name} - Compiled successfully
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'Artifacts' && (
                    <div className="space-y-4">
                        <div className="text-[#cccccc] text-sm">
                            {compiled.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-[#9ca3af] text-sm">No artifacts generated yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {compiled.map((item, index) => (
                                        <div key={index} className="bg-[#2d2d2d] p-3 rounded">
                                            <div className="text-[#cccccc] text-xs font-medium">{item.name}</div>
                                            <div className="text-[#9ca3af] text-xs mt-1">WASM Contract</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'Invoke' && (
                    <div className="space-y-4">
                        <div className="text-[#cccccc] text-sm">
                            <h3 className="text-[#cccccc] text-sm font-medium mb-2">Contract Functions</h3>
                            {contract.address ? (
                                <div className="space-y-2">
                                    <div className="bg-[#2d2d2d] p-3 rounded">
                                        <div className="text-[#cccccc] text-xs font-medium">Contract Address</div>
                                        <div className="text-[#9ca3af] text-xs mt-1 font-mono">{contract.address}</div>
                                    </div>
                                    {contract.methods?.map((method, index) => (
                                        <div key={index} className="bg-[#2d2d2d] p-3 rounded">
                                            <div className="text-[#cccccc] text-xs font-medium">{method.name}</div>
                                            <div className="text-[#9ca3af] text-xs mt-1">{method.inputs?.length || 0} parameters</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-[#9ca3af] text-sm">No contract deployed yet.</p>
                                    <Button
                                        onClick={handleDeploy}
                                        className="mt-4 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
                                        size="sm"
                                    >
                                        Deploy Contract
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default RightPanel;