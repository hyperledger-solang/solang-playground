import { store } from ".";
import { defaultCode } from "./initstate";

function initState() {
  store.send({
    type: "addFile",
    basePath: "explorer.items.src",
    name: "main.sol",
    content: defaultCode,
  });

  store.send({ type: "setCurrentPath", path: "explorer.items.src.items['main.sol']" });
  store.send({ type: "setDialogSpinner", show: false });
}

export default initState;
