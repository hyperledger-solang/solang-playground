"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";

export function CopyableCell({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncate = (str: string) => {
    if (str.length <= 12) return str;
    return `${str.slice(0, 6)}...${str.slice(-6)}`;
  };

  return (
    <div className="flex items-center gap-2">
      <code className="text-xs font-mono bg-muted/50 px-2 py-1 rounded border border-border/50 truncate block max-w-[140px]">
        {truncate(text)}
      </code>
      <button
        onClick={handleCopy}
        className="flex-shrink-0 p-1.5 hover:bg-muted rounded transition-colors"
        title="Copy full address"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
        )}
      </button>
    </div>
  );
}