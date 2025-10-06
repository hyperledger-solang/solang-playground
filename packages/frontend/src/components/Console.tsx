"use client";

import { store } from "@/state";
import { MessageTypeName } from "@/types/log";
import { useSelector } from "@xstate/store/react";
import { useEffect, useRef, useState } from "react";
import { FaChevronUp, FaChevronDown, FaGripLines, FaColumns, FaPlus } from "react-icons/fa";

function Console() {
  const logs = useSelector(store, (state) => state.context.logs);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    const element = containerRef.current;
    if (element) {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [logs]);

  return (
    <div className="border-t border-[#2d2d2d] bg-[#1A1B3A] flex-shrink-0 relative z-30">
      {/* Terminal Toggle Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1A1B3A] border-b border-[#2d2d2d]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-2 text-[#cccccc] hover:text-white transition-colors text-sm"
          >
            {isCollapsed ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
            Terminal
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="text-[#9ca3af] hover:text-white transition-colors p-1">
            <FaGripLines size={12} />
          </button>
          <button className="text-[#9ca3af] hover:text-white transition-colors p-1">
            <FaColumns size={12} />
          </button>
          <button className="text-[#9ca3af] hover:text-white transition-colors p-1">
            <FaPlus size={12} />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      {!isCollapsed && (
        <div
          ref={containerRef}
          className="text-sm text-[#cccccc] font-medium overflow-auto bg-[#1A1B3A] h-[195px] p-3 w-full"
        >
          {logs.map((item) => (
            <span key={item.id} className="block mb-2">
              <pre>
                {MessageTypeName[item.type]}: {item.message}
              </pre>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default Console;
