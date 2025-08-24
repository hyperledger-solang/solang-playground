import { store } from ".";
import { defaultAuth, defaultCode, defaultError, defaultStorageTypes, defaultTTLStorage } from "./initstate";

function initState() {
  store.send({
    type: "addFile",
    basePath: "explorer.items.src",
    name: "main.sol",
    content: defaultCode,
  }
);
//  store.send(
// {
//     type: "addFile",
//     basePath: "explorer.items.src",
//     name: "auth.sol",
//     content: defaultAuth,
//   }
//  );

 store.send(
{
    type: "addFile",
    basePath: "explorer.items.src",
    name: "error.sol",
    content: defaultError,
  }
 );

  store.send(
{
    type: "addFile",
    basePath: "explorer.items.src",
    name: "storage_types.sol",
    content: defaultStorageTypes,
  }
 );
  store.send(
{
    type: "addFile",
    basePath: "explorer.items.src",
    name: "ttl_storage.sol",
    content: defaultTTLStorage,
  }
 );



  store.send({ type: "setCurrentPath", path: "explorer.items.src.items['main.sol']" });
  store.send({ type: "setDialogSpinner", show: false });
}

export default initState;
