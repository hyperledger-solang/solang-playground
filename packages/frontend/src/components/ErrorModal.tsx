"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { FaTimes } from "react-icons/fa";

interface ErrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
}

function ErrorModal({ isOpen, onClose, title, message }: ErrorModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-[#1A1B3A] border-red-500/50 text-white rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-red-400">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        {title}
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                        <p className="text-red-200 text-sm leading-relaxed">
                            {message}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-[#2d2d2d]">
                    <Button
                        onClick={onClose}
                        className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg"
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default ErrorModal;