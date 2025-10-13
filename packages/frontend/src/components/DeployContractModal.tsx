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
import ErrorModal from "./ErrorModal";

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
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>("");

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
            setErrorMessage('Please select a contract to deploy');
            setShowErrorModal(true);
            return;
        }

        if (compiled.length === 0) {
            setErrorMessage('No compiled contracts available. Please compile a contract first.');
            setShowErrorModal(true);
            return;
        }

        setIsDeploying(true);
        setErrorMessage("");
        try {
            // Use the actual constructor parameter types
            const parsedArgs = constructorArgs.map((arg, i) => ({
                type: arg.type,
                value: arg.value,
                seq: i
            }));

            // The deploy hook will handle compilation from the current file
            // We'll pass null as the WASM buffer since the existing deploy hook handles compilation
            const result = await deployWasm(null, parsedArgs);
            console.log('Deployment result:', result);

            if (result) {
                setErrorMessage("");
                onClose();
            } else {
                setErrorMessage('Deployment failed. Check the terminal for more details.');
                setShowErrorModal(true);
            }
        } catch (error) {
            console.error('Deployment failed:', error);
            const errMsg = error instanceof Error ? error.message : 'Unknown error occurred';
            setErrorMessage(`Deployment failed: ${errMsg}`);
            setShowErrorModal(true);
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
                        {/* No Compiled Contracts Message */}
                        {compiled.length === 0 && (
                            <div className="bg-[#2a2b5a] border border-[#404040] rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 text-yellow-400">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-semibold">No Compiled Contracts</span>
                                </div>
                                <p className="text-[#cccccc] text-sm">
                                    You need to compile a contract before you can deploy it. Click the <span className="font-semibold text-[#8b5cf6]">Compile</span> button in the header to compile your contract first.
                                </p>
                            </div>
                        )}

                        {/* Contract Selection */}
                        {compiled.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="contract" className="text-[#cccccc] font-medium">
                                    Contract
                                </Label>
                                <Select value={selectedContract} onValueChange={setSelectedContract}>
                                    <SelectTrigger className="bg-[#0F0F23] border-[#404040] text-white focus:border-[#8b5cf6]">
                                        <SelectValue placeholder="Select a contract..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#2d2d2d] border-[#404040]">
                                        {compiled.map((contract, index) => (
                                            <SelectItem key={index} value={contract.name} className="text-white hover:bg-[#3a3a3a]">
                                                {contract.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

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
                                <div className="text-white font-medium text-lg">Testnet</div>
                                <div className="text-[#9ca3af] text-sm">RPC: https://rpc-testnet.stellar.org</div>
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
                            disabled={compiled.length === 0 || !selectedContract || isDeploying}
                            className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Error Modal */}
            <ErrorModal
                isOpen={showErrorModal}
                onClose={() => setShowErrorModal(false)}
                title="Deployment Error"
                message={errorMessage}
            />
        </>
    );
}

export default DeployContractModal;
