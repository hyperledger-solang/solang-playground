import { FolderType } from "@/types/explorer";
import RenderNode from "./components/RenderNode";

function FileExplorer({ root }: { root: FolderType }) {
  return (
    <div className="text-[#cccccc]">
      <div className="relative z-10 overflow-x-clip px-3 py-4">
        <RenderNode node={root} basePath="" />
      </div>
    </div>
  );
}

export default FileExplorer;
