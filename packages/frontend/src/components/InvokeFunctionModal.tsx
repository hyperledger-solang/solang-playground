"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { FaPlay, FaUserCircle, FaRocket } from "react-icons/fa";
import { useSelector } from "@xstate/store/react";
import { store } from "@/state";
import AccountSelectionModal from "./AccountSelectionModal";
import { IParam } from "@/lib/services/types/common";
import ContractService from "@/lib/services/server/contract";
import { Network_Url } from "@/constants";
import { xdr } from "@stellar/stellar-sdk";
import { scValToNative } from "@stellar/stellar-sdk";
import { logger } from "@/state/utils";
import { mapIfValid, safeStringify } from "@/utils";
import { toast } from "sonner";
import { MessageType } from "vscode-languageserver-protocol";
import FunctionOutputDisplay from "./FunctionOutputDisplay";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import useWallet from "@/hooks/useWallet";
import { truncateAddress } from "@/lib/web3";

interface InvokeFunctionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function InvokeFunctionModal({ isOpen, onClose }: InvokeFunctionModalProps) {
    const [selectedContractAddress, setSelectedContractAddress] = useState<string>("");
    const [selectedFunction, setSelectedFunction] = useState<string>("");
    const [functionArgs, setFunctionArgs] = useState<IParam[]>([]);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isInvoking, setIsInvoking] = useState(false);
    const [showOutput, setShowOutput] = useState(false);
    const [lastOutput, setLastOutput] = useState<{ functionName: string; returnValue: any; logs: string[] } | null>(null);
    const recordInvoke = useMutation({
        mutationFn: async (data: any) => {
            return await axios.post("/api/analytics/invoke", data);
        },
    });
    const { keypair, publicKey } = useWallet();
    const [selectedAccount, setSelectedAccount] = useState<string>(publicKey);

    const contract = useSelector(store, (state) => state.context.contract);

    // Get deployed contract addresses
    const deployedAddresses = Object.keys(contract.deployed || {});

    // Auto-select first contract when modal opens
    useEffect(() => {
        if (isOpen && deployedAddresses.length > 0 && !selectedContractAddress) {
            setSelectedContractAddress(deployedAddresses[0]);
        }
    }, [isOpen, deployedAddresses.length]);

    // Get methods and fileName for selected contract
    const selectedContractInfo = selectedContractAddress && contract.deployed[selectedContractAddress]
        ? contract.deployed[selectedContractAddress]
        : null;
    const selectedContractMethods = selectedContractInfo?.methods || [];

    // Reset function selection when contract changes
    useEffect(() => {
        setSelectedFunction("");
        setFunctionArgs([]);
    }, [selectedContractAddress]);

    // Update function args when function changes
    useEffect(() => {
        if (selectedFunction && selectedContractMethods) {
            const method = selectedContractMethods.find((m: any) => m.name === selectedFunction);
            if (method && method.inputs) {
                setFunctionArgs(method.inputs.map((input: any, index: number) => ({
                    type: input.value?.type || "string",
                    value: "",
                    seq: index
                })));
            } else {
                setFunctionArgs([]);
            }
        }
    }, [selectedFunction, selectedContractMethods]);

    const handleInvoke = async () => {
        if (!selectedFunction || !selectedContractAddress) return;

        setIsInvoking(true);
        try {
            logger.info("Invoking Contract function...");
            console.log('Invoking function:', selectedFunction, 'with args:', functionArgs);

            // Prepare args: prefer IDL-declared types; otherwise infer numeric as uint32 → u32
            const method = selectedContractMethods?.find((m: any) => m.name === selectedFunction) as any;
            const preparedArgs = functionArgs.map((arg, index) => {
                const declaredType = (method?.inputs?.[index] as any)?.value?.type as string | undefined;
                const candidateType = declaredType || (/^-?\d+$/.test(String(arg.value)) ? "uint32" : "string");
                const [, mappedType] = mapIfValid(String(arg.value ?? ""), candidateType);
                return {
                    type: mappedType || candidateType,
                    value: arg.value,
                    subType: "",
                };
            });

            // Create request data for the contract service - match old working format
            const requestData = {
                contractId: selectedContractAddress,
                method: selectedFunction,
                args: preparedArgs,
            };

            console.log("Invoke Data", requestData);
            logger.info(safeStringify(requestData, 2));

            const contractService = new ContractService(Network_Url.TEST_NET_FALLBACKS, keypair);
            const response = await contractService.invokeContract(requestData);
            const { resultXdr, diagnosticEventsXdr, status } = response;

            if (status === "SUCCESS") {
                recordInvoke.mutate({
                    wallet: contractService.pubKey(),
                    address: selectedContractAddress,
                    method: selectedFunction,
                    txHash: response.txHash,
                });
            }

            console.log("Invoke Result", resultXdr);

            let retVal: any = null;
            let logs: string[] = [];

            // Parse diagnostic events for return value and logs
            for (const eventXdr of Array.from(diagnosticEventsXdr || [])) {
                try {
                    const diagnosticEvent = xdr.DiagnosticEvent.fromXDR(eventXdr as any, "base64");
                    const eventBody = diagnosticEvent.event().body().v0();

                    const topics = eventBody.topics().map(scValToNative);
                    const eventData = scValToNative(eventBody.data());

                    if (topics.length && topics[0] === "fn_return") {
                        retVal = eventData;
                        console.log("Fn Return Val", retVal);
                    }

                    if (topics.includes("log")) {
                        try {
                            logs.push(safeStringify(eventData));
                        } catch {
                            logs.push(String(eventData));
                        }
                    }
                } catch (e) {
                    logger.error(`Error parsing diagnostic event: ${String(e)}`);
                }
            }

            logs = logs.filter(Boolean);
            console.log("Invoke Logs", logs);

            // Log transaction result like old code
            if (retVal !== null) {
                logger.info(`TX Result: ${retVal}`);
            }
            logger.info("Transaction successful.");
            logger.info(`TxId: ${response.hash || 'undefined'}`);
            logger.info(`Contract Logs:`);
            if (logs.length > 0) {
                logs.forEach(log => logger.info(log));
            }

            // If a mutating function was called, immediately read latest state via a no-arg getter if available
            let finalReturn = retVal;
            try {
                const getter = selectedContractMethods?.find((m: any) => m.name === "get" && (!m.inputs || m.inputs.length === 0));
                if (getter && selectedFunction !== "get") {
                    const followUp = await contractService.invokeContract({
                        contractId: selectedContractAddress,
                        method: "get",
                        args: [],
                    });
                    const { diagnosticEventsXdr: de } = followUp;
                    for (const eventXdr of Array.from(de || [])) {
                        try {
                            const diagnosticEvent = xdr.DiagnosticEvent.fromXDR(eventXdr as any, "base64");
                            const eventBody = diagnosticEvent.event().body().v0();
                            const topics = eventBody.topics().map(scValToNative);
                            const eventData = scValToNative(eventBody.data());
                            if (topics.length && topics[0] === "fn_return") {
                                finalReturn = eventData;
                                break;
                            }
                        } catch { }
                    }
                }
            } catch { }

            // Store output for display and close invoke modal
            setLastOutput({
                functionName: selectedFunction,
                returnValue: finalReturn,
                logs: logs
            });
            setShowOutput(true);
            onClose(); // Close the invoke modal so output modal appears on top

            // Add log entries
            store.send({
                type: "addLog",
                message: `Function '${selectedFunction}' invoked successfully`,
                logType: MessageType.Info
            });

            if (logs.length > 0) {
                logs.forEach(log => {
                    store.send({
                        type: "addLog",
                        message: `Log: ${log}`,
                        logType: MessageType.Info
                    });
                });
            }

            toast.success(`Function '${selectedFunction}' invoked successfully`);
        } catch (error) {
            console.error('Invocation failed:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);

            store.send({
                type: "addLog",
                message: `Function '${selectedFunction}' invocation failed: ${errorMessage}`,
                logType: MessageType.Error
            });

            toast.error(`Invocation failed: ${errorMessage}`);
        } finally {
            setIsInvoking(false);
        }
    };

    const handleFunctionArgChange = (index: number, field: 'type' | 'value', value: string) => {
        setFunctionArgs(prev => prev.map((arg, i) =>
            i === index ? { ...arg, [field]: value } : arg
        ));
    };

    const addFunctionArg = () => {
        setFunctionArgs(prev => [...prev, { type: "string", value: "", seq: prev.length }]);
    };

    const removeFunctionArg = (index: number) => {
        setFunctionArgs(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-lg max-h-[90vh] bg-[#1A1B3A] border-[#2d2d2d] text-white flex flex-col">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
                            <FaPlay className="text-[#8b5cf6]" />
                            Invoke Function
                        </DialogTitle>
                        <DialogDescription className="text-[#9ca3af]">
                            Call a function on the deployed contract
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4 overflow-y-auto flex-1">

                        {/* Contract Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="contract" className="text-[#cccccc] font-medium">
                                Contract
                            </Label>
                            <Select value={selectedContractAddress} onValueChange={setSelectedContractAddress}>
                                <SelectTrigger className="bg-[#0F0F23] border-[#404040] text-white focus:border-[#8b5cf6]">
                                    <SelectValue placeholder="Choose a contract..." />
                                </SelectTrigger>
                                <SelectContent className="bg-[#2d2d2d] border-[#404040]">
                                    {deployedAddresses.map((address) => {
                                        const contractInfo = contract.deployed[address];
                                        return (
                                            <SelectItem key={address} value={address} className="text-white hover:bg-[#3a3a3a]">
                                                {contractInfo?.fileName || 'Unknown'} ({`${address.slice(0, 8)}...${address.slice(-8)}`})
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            {deployedAddresses.length === 0 && (
                                <p className="text-[#9ca3af] text-sm">No deployed contracts available.</p>
                            )}
                        </div>

                        {/* Function Selection */}
                        {selectedContractAddress && (
                            <div className="space-y-2">
                                <Label htmlFor="function" className="text-[#cccccc] font-medium">
                                    Function
                                </Label>
                                <Select value={selectedFunction} onValueChange={setSelectedFunction}>
                                    <SelectTrigger className="bg-[#0F0F23] border-[#404040] text-white focus:border-[#8b5cf6]">
                                        <SelectValue placeholder="Choose a function..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#2d2d2d] border-[#404040]">
                                        {selectedContractMethods?.map((method: any, index: number) => (
                                            <SelectItem key={index} value={method.name} className="text-white hover:bg-[#3a3a3a]">
                                                {method.name}({method.inputs?.map((input: any) => input.value?.type).join(', ') || ''})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedContractMethods.length === 0 && (
                                    <p className="text-[#9ca3af] text-sm">No functions available for this contract.</p>
                                )}
                            </div>
                        )}

                        {/* Function Arguments */}
                        {functionArgs.length > 0 && (
                            <div className="space-y-3">
                                <Label className="text-[#cccccc] font-medium">Function Arguments</Label>
                                {functionArgs.map((arg, index) => (
                                    <div key={index} className="space-y-1">
                                        <Label className="text-[#9ca3af] text-sm">
                                            {arg.type} {functionArgs.length > 1 ? `(parameter ${index + 1})` : ''}
                                        </Label>
                                        <Input
                                            value={arg.value}
                                            onChange={(e) => {
                                                const newArgs = [...functionArgs];
                                                newArgs[index].value = e.target.value;
                                                setFunctionArgs(newArgs);
                                            }}
                                            placeholder={`Enter ${arg.type} value...`}
                                            className="bg-[#0F0F23] border-[#404040] text-white placeholder-[#9ca3af] focus:border-[#8b5cf6]"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Account Selection */}
                        <div className="space-y-2">
                            <Label className="text-[#cccccc] font-medium">Account</Label>
                            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                                <SelectTrigger className="bg-[#0F0F23] border-[#404040] text-white focus:border-[#8b5cf6]">
                                    <SelectValue placeholder={truncateAddress(publicKey)} />
                                </SelectTrigger>
                                <SelectContent className="bg-[#2d2d2d] border-[#404040]">
                                    <SelectItem value={publicKey} className="text-white hover:bg-[#3a3a3a]">
                                        {truncateAddress(publicKey)}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Contract Info */}
                        {selectedContractAddress && selectedContractInfo && (
                            <div className="bg-[#0F0F23] p-3 rounded-md">
                                <div className="text-[#9ca3af] text-sm space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[#cccccc] font-medium">{selectedContractInfo.fileName}</span>
                                    </div>
                                    <div>Contract Address: {selectedContractAddress ? `${selectedContractAddress.slice(0, 8)}...${selectedContractAddress.slice(-8)}` : 'Not deployed'}</div>
                                    <div>Network: Testnet</div>
                                    <div>Gas Limit: Auto-estimate</div>
                                    <div>Functions: {selectedContractMethods?.length || 0}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-[#2d2d2d] flex-shrink-0">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="border-[#404040] text-[#cccccc] hover:bg-[#2a2b5a]"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleInvoke}
                            disabled={!selectedFunction || !selectedContractAddress || isInvoking}
                            className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
                        >
                            {isInvoking ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Invoking...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <FaRocket size={14} />
                                    Invoke
                                </div>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Function Output Display */}
            {showOutput && lastOutput && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="max-w-2xl w-full mx-4">
                        <FunctionOutputDisplay
                            functionName={lastOutput.functionName}
                            returnValue={lastOutput.returnValue}
                            logs={lastOutput.logs}
                            onClose={() => setShowOutput(false)}
                        />
                    </div>
                </div>
            )}

            {/* Account Selection Modal */}
            <AccountSelectionModal
                isOpen={isAccountModalOpen}
                onClose={() => setIsAccountModalOpen(false)}
                onAccountSelect={(account) => setSelectedAccount(account)}
            />
        </>
    );
}

export default InvokeFunctionModal;
