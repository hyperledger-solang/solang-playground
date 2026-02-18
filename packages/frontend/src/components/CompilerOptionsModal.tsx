"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { FaCog,FaHammer } from "react-icons/fa";
import useCompile from "@/hooks/useCompile";
import { useSelector } from "@xstate/store/react";
import { store } from "@/state";
import { get } from "lodash";
import { FileType } from "@/types/explorer";
import ErrorModal from "./ErrorModal";
import useWallet from "@/hooks/useWallet";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";

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
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>("");
    const { publicKey } = useWallet();
    const recordCompile = useMutation({
      mutationFn: async (wallet: any) =>
        axios.post("/api/analytics/compile", {
          wallet,
        }),
    });

    const { compileFile } = useCompile();
    const selected = useSelector(store, (state) => state.context.currentFile);
    const obj = useSelector(store, (state) => get(state.context, selected || '')) as FileType;

    const handleCompile = async () => {
        setIsCompiling(true);
        try {
            const result = await compileFile();
            console.log('[-] compilation result', result);

            // Check if compilation failed
            if (result.err) {
                setErrorMessage(result.err);
                setShowErrorModal(true);
                return;
            }

            // Only add to compiled list if compilation was successful
            if (selected && selected !== 'home' && result.data) {
                store.send({ type: "addCompiled", path: selected, name: obj.name });
            }

            // Only close modal if compilation was successful
            if (result.data) {
                onClose();
                if (publicKey) {
                    recordCompile.mutate(publicKey);
                }

            }
        } catch (error) {
            console.error('Compilation failed:', error);
            const errMsg = error instanceof Error ? error.message : 'Unknown compilation error';
            setErrorMessage(errMsg);
            setShowErrorModal(true);
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
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-[640px] bg-[#171833] border border-[#27284a] text-white rounded-full shadow-xl px-5 py-4">
                    <DialogHeader className="pb-2">
                        <DialogTitle className="flex items-center gap-2 text-[18px] font-semibold tracking-tight">
                            <FaCog className="text-[#8b5cf6]" />
                            Compiler Options
                        </DialogTitle>
                        {/* Intentionally minimal — removed extra descriptive text */}
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Quick Flags */}
                        <div className="space-y-2.5">
                            <h3 className="text-[#cfd1e6] font-medium text-sm">Quick Flags</h3>

                            <div className="grid grid-cols-4 gap-2">
                                <button
                                    onClick={() => handleQuickFlagChange('optimize')}
                                    className={`px-2.5 py-1.5 rounded-full text-xs border transition-colors ${quickFlags.optimize
                                        ? 'bg-[#8b5cf6] border-[#8b5cf6] text-white'
                                        : 'bg-[#22234a] border-[#34355f] text-[#cfd1e6] hover:bg-[#2a2c56]'
                                        }`}
                                >
                                    --optimize
                                </button>

                                <button
                                    onClick={() => handleQuickFlagChange('emitIr')}
                                    className={`px-2.5 py-1.5 rounded-full text-xs border transition-colors ${quickFlags.emitIr
                                        ? 'bg-[#8b5cf6] border-[#8b5cf6] text-white'
                                        : 'bg-[#22234a] border-[#34355f] text-[#cfd1e6] hover:bg-[#2a2c56]'
                                        }`}
                                >
                                    --emit-ir
                                </button>

                                <button
                                    onClick={() => handleQuickFlagChange('emitAbi')}
                                    className={`px-2.5 py-1.5 rounded-full text-xs border transition-colors ${quickFlags.emitAbi
                                        ? 'bg-[#8b5cf6] border-[#8b5cf6] text-white'
                                        : 'bg-[#22234a] border-[#34355f] text-[#cfd1e6] hover:bg-[#2a2c56]'
                                        }`}
                                >
                                    --emit-abi
                                </button>

                                <button
                                    onClick={() => handleQuickFlagChange('emitDebug')}
                                    className={`px-2.5 py-1.5 rounded-full text-xs border transition-colors ${quickFlags.emitDebug
                                        ? 'bg-[#8b5cf6] border-[#8b5cf6] text-white'
                                        : 'bg-[#22234a] border-[#34355f] text-[#cfd1e6] hover:bg-[#2a2c56]'
                                        }`}
                                >
                                    --emit-debug
                                </button>

                                <button
                                    onClick={() => handleQuickFlagChange('noStrengthReduce')}
                                    className={`px-2.5 py-1.5 rounded-full text-xs border transition-colors ${quickFlags.noStrengthReduce
                                        ? 'bg-[#8b5cf6] border-[#8b5cf6] text-white'
                                        : 'bg-[#22234a] border-[#34355f] text-[#cfd1e6] hover:bg-[#2a2c56]'
                                        }`}
                                >
                                    --no-strength-reduce
                                </button>

                                <button
                                    onClick={() => handleQuickFlagChange('noDeadStorage')}
                                    className={`px-2.5 py-1.5 rounded-full text-xs border transition-colors ${quickFlags.noDeadStorage
                                        ? 'bg-[#8b5cf6] border-[#8b5cf6] text-white'
                                        : 'bg-[#22234a] border-[#34355f] text-[#cfd1e6] hover:bg-[#2a2c56]'
                                        }`}
                                >
                                    --no-dead-storage
                                </button>
                            </div>
                        </div>

                        {/* Custom Flags */}
                        <div className="space-y-2">
                            <Label htmlFor="customFlags" className="text-[#cfd1e6] font-medium text-sm">
                                Custom Flags
                            </Label>
                            <textarea
                                id="customFlags"
                                value={customFlags}
                                onChange={(e) => setCustomFlags(e.target.value)}
                                placeholder="Add custom compiler flags here..."
                                className="w-full h-20 bg-[#1e1f3f] border border-[#34355f] text-white placeholder-[#8c8fb0] focus:border-[#8b5cf6] rounded-xl px-3 py-2 text-sm resize-none"
                            />
                            {/* Removed example helper to reduce height */}
                        </div>

                        {/* Compiler Info */}
                        <div className="bg-[#1e1f3f] p-3 rounded-xl border border-[#34355f]">
                            <h4 className="text-[#cfd1e6] font-medium mb-2 text-sm">Compiler Information</h4>
                            <div className="text-[#8c8fb0] text-sm space-y-1">
                                <div>Solang Compiler v0.3.3</div>
                                <div>Target: Soroban (Stellar Smart Contracts)</div>
                                <div>Output: WASM bytecode + ABI JSON</div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-3 border-t border-[#27284a]">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="border-[#34355f] text-[#cfd1e6] hover:bg-[#22234a]"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCompile}
                            disabled={isCompiling}
                            className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl px-4"
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

            {/* Error Modal */}
            <ErrorModal
                isOpen={showErrorModal}
                onClose={() => setShowErrorModal(false)}
                title="Compilation Error"
                message={errorMessage}
            />
        </>
    );
}

export default CompilerOptionsModal;
