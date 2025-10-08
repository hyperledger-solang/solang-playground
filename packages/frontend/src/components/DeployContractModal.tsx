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
import { extractConstructorParamTypes } from "./DeployExplorer";

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
                // Get the file content to extract constructor parameters
                const filePath = selectedCompiledContract.path;
                const fileContent = files[filePath] || '';

                // Extract constructor parameter types from the source code
                const constructorTypes = extractConstructorParamTypes(fileContent);

                if (constructorTypes.length > 0) {
                    // Create constructor args based on actual constructor parameters
                    const args = constructorTypes.map((type, index) => ({
                        type: type,
                        value: "",
                        seq: index
                    }));
                    setConstructorArgs(args);
                } else {
                    // No constructor parameters
                    setConstructorArgs([]);
                }
            }
        }
    }, [selectedContract, compiled, files]);

    const handleDeploy = async () => {
        if (!selectedContract) {
            alert('Please select a contract to deploy');
            return;
        }

        if (compiled.length === 0) {
            alert('No compiled contracts available. Please compile a contract first.');
            return;
        }

        setIsDeploying(true);
        try {
            // Use plain values (default type 'string'); keep existing deploy hook API
            const parsedArgs = constructorArgs.map((arg, i) => ({
                type: arg.type || "string",
                value: arg.value,
                seq: i
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
            alert('Deployment failed. Please check the console for details.');
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
        setConstructorArgs(prev => [...prev, { type: "string", value: "", seq: prev.length }]);
    };

    const removeConstructorArg = (index: number) => {
        setConstructorArgs(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-lg bg-[#1A1B3A] border-[#2d2d2d] text-white rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-white">
                            Deploy Contract
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Contract Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="contract" className="text-[#cccccc] font-medium">
                                Contract
                            </Label>
                            <Select value={selectedContract} onValueChange={setSelectedContract}>
                                <SelectTrigger className="bg-[#0F0F23] border-[#404040] text-white focus:border-[#8b5cf6]">
                                    <SelectValue placeholder="Select a contract..." />
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
                        </div>

                        {/* Constructor Arguments - Only show after contract selection */}
                        {selectedContract && constructorArgs.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-[#cccccc] font-medium">
                                    Constructor Arguments
                                </Label>
                                {constructorArgs.map((arg, index) => (
                                    <Input
                                        key={index}
                                        value={arg.value}
                                        onChange={(e) => handleConstructorArgChange(index, 'value', e.target.value)}
                                        placeholder={`${arg.type} value...`}
                                        className="bg-[#0F0F23] border-[#404040] text-white placeholder-[#9ca3af] focus:border-[#8b5cf6]"
                                    />
                                ))}
                            </div>
                        )}

                        {/* Account Selection */}
                        <div className="space-y-2">
                            <Label className="text-[#cccccc] font-medium">Account</Label>
                            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                                <SelectTrigger className="bg-[#0F0F23] border-[#404040] text-white focus:border-[#8b5cf6]">
                                    <SelectValue placeholder="0x1a2b...c3d4 (Default Account)" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#2d2d2d] border-[#404040]">
                                    <SelectItem value="0x1a2b...c3d4" className="text-white hover:bg-[#3a3a3a]">
                                        0x1a2b...c3d4 (Default Account)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Network Info */}
                        <div className="space-y-2">
                            <Label className="text-[#cccccc] font-medium">Network</Label>
                            <div className="bg-[#0F0F23] p-3 rounded-md border border-[#404040]">
                                <div className="text-white font-medium text-lg">Futurenet</div>
                                <div className="text-[#9ca3af] text-sm">RPC: https://rpc-futurenet.stellar.org</div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-[#2d2d2d]">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="border-[#404040] text-[#cccccc] hover:bg-[#2a2b5a] rounded-lg"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeploy}
                            disabled={!selectedContract || isDeploying}
                            className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg"
                        >
                            {isDeploying ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Deploying...
                                </div>
                            ) : (
                                "Deploy Contract"
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
