"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { FaRocket, FaUserCircle } from "react-icons/fa";
import useDeploy from "@/hooks/useDeploy";
import { useSelector } from "@xstate/store/react";
import { store } from "@/state";
import AccountSelectionModal from "./AccountSelectionModal";
import { IParam } from "@/lib/services/types/common";

interface DeployContractModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function DeployContractModal({ isOpen, onClose }: DeployContractModalProps) {
    const [selectedContract, setSelectedContract] = useState<string>("");
    const [constructorArgs, setConstructorArgs] = useState<IParam[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<string>("0x1a2b...c3d4");
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isDeploying, setIsDeploying] = useState(false);

    const { deployWasm } = useDeploy();
    const compiled = useSelector(store, (state) => state.context.compiled);
    const files = useSelector(store, (state) => state.context.files);
    const tabs = useSelector(store, (state) => state.context.tabs);

    // Update constructor args when contract changes
    useEffect(() => {
        if (selectedContract) {
            // Find the selected compiled contract
            const selectedCompiledContract = compiled.find(c => c.name === selectedContract);
            if (selectedCompiledContract) {
                // For now, we'll start with empty constructor args
                // In a real implementation, this would parse the contract ABI to extract constructor arguments
                setConstructorArgs([]);
            }
        }
    }, [selectedContract, compiled]);

    const handleDeploy = async () => {
        if (!selectedContract) return;

        setIsDeploying(true);
        try {
            // Parse constructor arguments
            const parsedArgs = constructorArgs.map(arg => ({
                type: arg.type,
                value: arg.value,
                seq: 0
            }));

            // The deploy hook will handle compilation from the current file
            // We'll pass null as the WASM buffer since the existing deploy hook handles compilation
            const result = await deployWasm(null, parsedArgs);
            console.log('Deployment result:', result);

            if (result) {
                onClose();
            }
        } catch (error) {
            console.error('Deployment failed:', error);
        } finally {
            setIsDeploying(false);
        }
    };

    const handleConstructorArgChange = (index: number, field: 'type' | 'value', value: string) => {
        setConstructorArgs(prev => prev.map((arg, i) =>
            i === index ? { ...arg, [field]: value } : arg
        ));
    };

    const addConstructorArg = () => {
        setConstructorArgs(prev => [...prev, { type: "string", value: "", seq: 0 }]);
    };

    const removeConstructorArg = (index: number) => {
        setConstructorArgs(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-lg bg-[#1A1B3A] border-[#2d2d2d] text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
                            <FaRocket className="text-[#8b5cf6]" />
                            Deploy Contract
                        </DialogTitle>
                        <DialogDescription className="text-[#9ca3af]">
                            Deploy a compiled contract to the network
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Contract Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="contract" className="text-[#cccccc] font-medium">
                                Select Contract
                            </Label>
                            <Select value={selectedContract} onValueChange={setSelectedContract}>
                                <SelectTrigger className="bg-[#2d2d2d] border-[#404040] text-white focus:border-[#8b5cf6]">
                                    <SelectValue placeholder="Choose a compiled contract..." />
                                </SelectTrigger>
                                <SelectContent className="bg-[#2d2d2d] border-[#404040]">
                                    {compiled.length > 0 ? (
                                        compiled.map((contract, index) => (
                                            <SelectItem key={index} value={contract.name} className="text-white hover:bg-[#3a3a3a]">
                                                {contract.name}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="" disabled className="text-[#9ca3af]">
                                            No compiled contracts available
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            {compiled.length === 0 && (
                                <p className="text-[#9ca3af] text-sm">No compiled contracts available. Please compile a contract first.</p>
                            )}
                            {compiled.length > 0 && (
                                <p className="text-[#9ca3af] text-xs">Select a compiled contract to deploy</p>
                            )}
                        </div>

                        {/* Constructor Arguments - Only show after contract selection */}
                        {selectedContract && (
                            <div className="space-y-2">
                                <Label htmlFor="constructorArgs" className="text-[#cccccc] font-medium">
                                    Constructor Arguments
                                </Label>
                                <Input
                                    id="constructorArgs"
                                    value={constructorArgs.length > 0 ? `${constructorArgs[0]?.type || 'string'}: ${constructorArgs[0]?.value || ''}` : ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value.includes(':')) {
                                            const [type, val] = value.split(':').map(s => s.trim());
                                            setConstructorArgs([{ type: type || 'string', value: val || '', seq: 0 }]);
                                        } else {
                                            setConstructorArgs([{ type: 'string', value: value, seq: 0 }]);
                                        }
                                    }}
                                    placeholder="_greeting (string): Hello, Stellar!"
                                    className="bg-[#2d2d2d] border-[#404040] text-white placeholder-[#9ca3af] focus:border-[#8b5cf6]"
                                />
                                <p className="text-[#9ca3af] text-xs">Enter constructor arguments if the contract requires them</p>
                            </div>
                        )}

                        {/* Account Selection */}
                        <div className="space-y-2">
                            <Label className="text-[#cccccc] font-medium">Deploy Account</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={selectedAccount}
                                    readOnly
                                    className="bg-[#2d2d2d] border-[#404040] text-white"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsAccountModalOpen(true)}
                                    className="border-[#404040] text-[#cccccc] hover:bg-[#2a2b5a]"
                                >
                                    <FaUserCircle size={14} />
                                </Button>
                            </div>
                        </div>

                        {/* Network Info */}
                        <div className="bg-[#2d2d2d] p-3 rounded-md">
                            <h4 className="text-[#cccccc] font-medium mb-2">Deployment Info</h4>
                            <div className="text-[#9ca3af] text-sm space-y-1">
                                <div>Network: Futurenet</div>
                                <div>Target: Soroban</div>
                                <div>Gas Limit: Auto</div>
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
                            onClick={handleDeploy}
                            disabled={!selectedContract || isDeploying}
                            className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
                        >
                            {isDeploying ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Deploying...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <FaRocket size={14} />
                                    Deploy {selectedContract || 'Contract'}
                                </div>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Account Selection Modal */}
            <AccountSelectionModal
                isOpen={isAccountModalOpen}
                onClose={() => setIsAccountModalOpen(false)}
                onAccountSelect={(account) => setSelectedAccount(account)}
            />
        </>
    );
}

export default DeployContractModal;
