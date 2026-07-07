"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import useCompile from "@/hooks/useCompile";
import useDeploy from "@/hooks/useDeploy";
import { useSelector } from "@xstate/store/react";
import { store } from "@/state";
import { FileType } from "@/types/explorer";
import { get } from "lodash";
import CompilerOptionsModal from "./CompilerOptionsModal";
import DeployContractModal from "./DeployContractModal";
import InvokeFunction from "./InvokeFunction";

function RightPanel() {
    const [activeTab, setActiveTab] = useState<'Build' | 'Artifacts' | 'Invoke'>('Build');
    const [openCompile, setOpenCompile] = useState(false);
    const [openDeploy, setOpenDeploy] = useState(false);
    const { compileFile } = useCompile();
    const { deployWasm } = useDeploy();

    const selected = useSelector(store, (state) => state.context.currentFile);
    const compiled = useSelector(store, (state) => state.context.compiled);
    const contract = useSelector(store, (state) => state.context.contract);

    const obj = useSelector(store, (state) => get(state.context, selected || '')) as FileType;
    const [name, setName] = useState<string>('');

    // Check if current file is compiled
    const isCurrentFileCompiled = compiled.some(item => item.path === selected);

    // State for selected contract in Invoke tab
    const [selectedContractAddress, setSelectedContractAddress] = useState<string>('');

    // Get deployed contract addresses
    const deployedAddresses = Object.keys(contract.deployed || {});

    // Auto-select first contract when available or when new contract is deployed
    useEffect(() => {
        if (deployedAddresses.length > 0) {
            // If no contract selected or selected contract no longer exists, select the latest
            if (!selectedContractAddress || !deployedAddresses.includes(selectedContractAddress)) {
                setSelectedContractAddress(deployedAddresses[deployedAddresses.length - 1]);
            }
        }
    }, [deployedAddresses.length]);

    const handleDeploy = () => {
        setOpenDeploy(true);
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
                            <div>
                                {/* Compile Button - Always visible */}
                                <div className="mb-4">
                                    <Button
                                        onClick={() => setOpenCompile(true)}
                                        className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
                                        size="sm"
                                        disabled={!selected || selected === 'home'}
                                    >
                                        {isCurrentFileCompiled ? 'Recompile' : 'Compile'} Contract
                                    </Button>
                                    {(!selected || selected === 'home') && (
                                        <p className="text-[#9ca3af] text-xs mt-2 text-center">Select a contract file to compile</p>
                                    )}
                                </div>

                                {/* Build Results */}
                                {compiled.length > 0 ? (
                                    <div>
                                        <h3 className="text-[#cccccc] text-sm font-medium mb-2">Build Results</h3>
                                        <div className="space-y-2">
                                            {compiled.map((item, index) => (
                                                <div
                                                    key={index}
                                                    className={`bg-[#2d2d2d] p-2 rounded text-xs ${item.path === selected ? 'border border-[#8b5cf6]' : ''
                                                        }`}
                                                >
                                                    <div className="text-[#9ca3af]">
                                                        {item.name} - Compiled successfully
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-[#9ca3af] text-sm">No artifacts yet</p>
                                    </div>
                                )}
                            </div>
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
                            {deployedAddresses.length > 0 ? (
                                <div className="space-y-4">
                                    {/* Contract Selection Dropdown */}
                                    <div>
                                        <label className="text-[#9ca3af] text-xs mb-1 block">Select Contract</label>
                                        <select
                                            value={selectedContractAddress}
                                            onChange={(e) => setSelectedContractAddress(e.target.value)}
                                            className="w-full px-3 py-2 rounded bg-[#2d2d2d] text-[#cccccc] border border-[#3d3d3d] text-xs focus:outline-none focus:border-[#8b5cf6]"
                                        >
                                            {deployedAddresses.map((address) => {
                                                const contractInfo = contract.deployed[address];
                                                return (
                                                    <option key={address} value={address}>
                                                        {contractInfo?.fileName || 'Unknown'} ({`${address.slice(0, 8)}...${address.slice(-8)}`})
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    {/* Selected Contract Address Display */}
                                    {selectedContractAddress && contract.deployed[selectedContractAddress] && (
                                        <div className="bg-[#2d2d2d] p-3 rounded">
                                            <div className="text-[#cccccc] text-xs font-medium">{contract.deployed[selectedContractAddress].fileName}</div>
                                            <div className="text-[#9ca3af] text-xs mt-1 font-mono break-all">{selectedContractAddress}</div>
                                        </div>
                                    )}

                                    {/* Functions of Selected Contract */}
                                    {selectedContractAddress && contract.deployed[selectedContractAddress] && (
                                        <div className="space-y-2">
                                            <h4 className="text-[#cccccc] text-xs font-medium">Functions</h4>
                                            {contract.deployed[selectedContractAddress].methods.map((method, index) => (
                                                <InvokeFunction
                                                    key={`${selectedContractAddress}-${method.name}-${index}`}
                                                    contractAddress={selectedContractAddress}
                                                    method={method}
                                                />
                                            ))}
                                        </div>
                                    )}
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

            {/* Compiler Options Modal */}
            <CompilerOptionsModal isOpen={openCompile} onClose={() => setOpenCompile(false)} />

            {/* Deploy Contract Modal */}
            <DeployContractModal isOpen={openDeploy} onClose={() => setOpenDeploy(false)} />
        </div>
    );
}

export default RightPanel;