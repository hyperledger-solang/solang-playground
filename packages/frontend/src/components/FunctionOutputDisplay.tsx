"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { FaCopy, FaCheck, FaTimes } from "react-icons/fa";
import { safeStringify } from "@/utils";

interface FunctionOutputDisplayProps {
    functionName: string;
    returnValue: any;
    logs: string[];
    onClose: () => void;
}

function FunctionOutputDisplay({ functionName, returnValue, logs, onClose }: FunctionOutputDisplayProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            const outputText = `Function: ${functionName}\nReturn Value: ${safeStringify(returnValue)}\nLogs: ${logs.join('\n')}`;
            await navigator.clipboard.writeText(outputText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Copy failed", err);
        }
    };

    return (
        <div className="bg-[#1A1B3A] border border-[#2d2d2d] rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-[#cccccc] font-medium text-lg">Function Output</h3>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        className="border-[#404040] text-[#cccccc] hover:bg-[#2a2b5a]"
                    >
                        {copied ? <FaCheck size={12} /> : <FaCopy size={12} />}
                        {copied ? "Copied!" : "Copy"}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onClose}
                        className="border-[#404040] text-[#cccccc] hover:bg-[#2a2b5a]"
                    >
                        <FaTimes size={12} />
                    </Button>
                </div>
            </div>

            <div className="space-y-3">
                {/* Function Name */}
                <div>
                    <label className="text-[#9ca3af] text-sm font-medium">Function</label>
                    <div className="bg-[#2d2d2d] border border-[#404040] rounded-md px-3 py-2 text-white font-mono">
                        {functionName}
                    </div>
                </div>

                {/* Return Value */}
                <div>
                    <label className="text-[#9ca3af] text-sm font-medium">Return Value</label>
                    <div className="bg-[#2d2d2d] border border-[#404040] rounded-md px-3 py-2 text-white font-mono">
                        {returnValue !== null ? safeStringify(returnValue) : "No return value"}
                    </div>
                </div>

                {/* Logs */}
                {logs.length > 0 && (
                    <div>
                        <label className="text-[#9ca3af] text-sm font-medium">Logs</label>
                        <div className="bg-[#2d2d2d] border border-[#404040] rounded-md px-3 py-2 max-h-32 overflow-y-auto">
                            {logs.map((log, index) => (
                                <div key={index} className="text-white font-mono text-sm">
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default FunctionOutputDisplay;
