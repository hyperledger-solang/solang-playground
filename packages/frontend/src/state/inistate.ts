import { store } from ".";
import {
  defaultAuth,
  defaultCode,
  defaultError,
  defaultStorageTypes,
  defaultTTLStorage,
  mathfile,
  mathfile2,
  printerfile,
} from "./initstate";

function initState() {
  store.send({
    type: "addFile",
    basePath: "explorer.items.src",
    name: "main.sol",
    content: defaultCode,
    openInTab: true,
  });

  store.send({
    type: "addFile",
    basePath: "explorer.items.src",
    name: "error.sol",
    content: defaultError,
    openInTab: false,
  });

  store.send({
    type: "addFile",
    basePath: "explorer.items.src",
    name: "print.sol",
    content: printerfile,
    openInTab: false,
  });

  store.send({
    type: "addFile",
    basePath: "explorer.items.src",
    name: "math2.sol",
    content: mathfile2,
    openInTab: false,
  });

  store.send({
    type: "addFile",
    basePath: "explorer.items.src",
    name: "storage_types.sol",
    content: defaultStorageTypes,
    openInTab: false,
  });

  store.send({
    type: "addFile",
    basePath: "explorer.items.src",
    name: "math.sol",
    content: mathfile,
    openInTab: false,
  });

  store.send({
    type: "addFile",
    basePath: "explorer.items.src",
    name: "ttl_storage.sol",
    content: defaultTTLStorage,
    openInTab: false,
  });

  store.send({
    type: "setCurrentPath",
    path: "explorer.items.src.items['main.sol']",
  });
  store.send({ type: "setDialogSpinner", show: false });
}

export default initState;
