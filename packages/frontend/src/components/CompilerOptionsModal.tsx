"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { FaCog, FaCode, FaCheck, FaHammer } from "react-icons/fa";
import useCompile from "@/hooks/useCompile";
import { useSelector } from "@xstate/store/react";
import { store } from "@/state";
import { extractContractNames } from "./DeployExplorer";
import { get } from "lodash";
import { FileType } from "@/types/explorer";

interface CompilerOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function CompilerOptionsModal({ isOpen, onClose }: CompilerOptionsModalProps) {
    const [quickFlags, setQuickFlags] = useState({
        optimize: false,
        emitIr: false,
        emitAbi: false,
        emitDebug: false,
        noStrengthReduce: false,
        noDeadStorage: false,
    });
    const [customFlags, setCustomFlags] = useState("");
    const [isCompiling, setIsCompiling] = useState(false);

    const { compileFile } = useCompile();
    const selected = useSelector(store, (state) => state.context.currentFile);
    const obj = useSelector(store, (state) => get(state.context, selected || '')) as FileType;

    const handleCompile = async () => {
        setIsCompiling(true);
        try {
            const result = await compileFile();
            console.log('[-] compilation result', result);

            if (selected && selected !== 'home') {
                // Get the file content from the store
                const files = store.getSnapshot().context.files;
                const fileContent = files[selected] || '';

                console.log('[-] File content for contract extraction:', fileContent);

                // Extract actual contract names from the source code
                const contractNames = extractContractNames(fileContent);
                console.log('[-] Extracted contract names:', contractNames);

                const contractName = contractNames.length > 0 ? contractNames[0] : obj.name;
                console.log('[-] Using contract name:', contractName);

                store.send({ type: "addCompiled", path: selected, name: contractName });
            }

            onClose();
        } catch (error) {
            console.error('Compilation failed:', error);
        } finally {
            setIsCompiling(false);
        }
    };

    const handleQuickFlagChange = (flag: keyof typeof quickFlags) => {
        setQuickFlags(prev => ({
            ...prev,
            [flag]: !prev[flag]
        }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg bg-[#1A1B3A] border-[#2d2d2d] text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
                        <FaCog className="text-[#8b5cf6]" />
                        Compiler Options
                    </DialogTitle>
                    <DialogDescription className="text-[#9ca3af]">
                        Configure compiler settings before building your contract
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Quick Flags */}
                    <div className="space-y-4">
                        <h3 className="text-[#cccccc] font-medium">Quick Flags</h3>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleQuickFlagChange('optimize')}
                                className={`px-3 py-2 rounded text-sm border transition-colors ${quickFlags.optimize
                                    ? 'bg-[#8b5cf6] border-[#8b5cf6] text-white'
                                    : 'bg-[#2d2d2d] border-[#404040] text-[#cccccc] hover:bg-[#3a3a3a]'
                                    }`}
                            >
                                --optimize
                            </button>

                            <button
                                onClick={() => handleQuickFlagChange('emitIr')}
                                className={`px-3 py-2 rounded text-sm border transition-colors ${quickFlags.emitIr
                                    ? 'bg-[#8b5cf6] border-[#8b5cf6] text-white'
                                    : 'bg-[#2d2d2d] border-[#404040] text-[#cccccc] hover:bg-[#3a3a3a]'
                                    }`}
                            >
                                --emit-ir
                            </button>

                            <button
                                onClick={() => handleQuickFlagChange('emitAbi')}
                                className={`px-3 py-2 rounded text-sm border transition-colors ${quickFlags.emitAbi
                                    ? 'bg-[#8b5cf6] border-[#8b5cf6] text-white'
                                    : 'bg-[#2d2d2d] border-[#404040] text-[#cccccc] hover:bg-[#3a3a3a]'
                                    }`}
                            >
                                --emit-abi
                            </button>

                            <button
                                onClick={() => handleQuickFlagChange('emitDebug')}
                                className={`px-3 py-2 rounded text-sm border transition-colors ${quickFlags.emitDebug
                                    ? 'bg-[#8b5cf6] border-[#8b5cf6] text-white'
                                    : 'bg-[#2d2d2d] border-[#404040] text-[#cccccc] hover:bg-[#3a3a3a]'
                                    }`}
                            >
                                --emit-debug
                            </button>

                            <button
                                onClick={() => handleQuickFlagChange('noStrengthReduce')}
                                className={`px-3 py-2 rounded text-sm border transition-colors ${quickFlags.noStrengthReduce
                                    ? 'bg-[#8b5cf6] border-[#8b5cf6] text-white'
                                    : 'bg-[#2d2d2d] border-[#404040] text-[#cccccc] hover:bg-[#3a3a3a]'
                                    }`}
                            >
                                --no-strength-reduce
                            </button>

                            <button
                                onClick={() => handleQuickFlagChange('noDeadStorage')}
                                className={`px-3 py-2 rounded text-sm border transition-colors ${quickFlags.noDeadStorage
                                    ? 'bg-[#8b5cf6] border-[#8b5cf6] text-white'
                                    : 'bg-[#2d2d2d] border-[#404040] text-[#cccccc] hover:bg-[#3a3a3a]'
                                    }`}
                            >
                                --no-dead-storage
                            </button>
                        </div>
                    </div>

                    {/* Custom Flags */}
                    <div className="space-y-2">
                        <Label htmlFor="customFlags" className="text-[#cccccc] font-medium">
                            Custom Flags
                        </Label>
                        <textarea
                            id="customFlags"
                            value={customFlags}
                            onChange={(e) => setCustomFlags(e.target.value)}
                            placeholder="Add custom compiler flags here..."
                            className="w-full h-20 bg-[#2d2d2d] border border-[#404040] text-white placeholder-[#9ca3af] focus:border-[#8b5cf6] rounded-md px-3 py-2 text-sm resize-none"
                        />
                        <p className="text-[#9ca3af] text-xs">Example: --target soroban --optimize-gas</p>
                    </div>

                    {/* Compiler Info */}
                    <div className="bg-[#2d2d2d] p-3 rounded-md">
                        <h4 className="text-[#cccccc] font-medium mb-2">Compiler Information</h4>
                        <div className="text-[#9ca3af] text-sm space-y-1">
                            <div>Solang Compiler v0.3.3</div>
                            <div>Target: Soroban (Stellar Smart Contracts)</div>
                            <div>Output: WASM bytecode + ABI JSON</div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-[#2d2d2d]">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="border-[#404040] text-[#cccccc] hover:bg-[#2a2b5a]"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCompile}
                        disabled={isCompiling}
                        className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
                    >
                        {isCompiling ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Compiling...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <FaHammer size={14} />
                                Compile
                            </div>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default CompilerOptionsModal;
