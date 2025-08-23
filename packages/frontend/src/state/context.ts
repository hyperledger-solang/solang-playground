import { ExpNodeType, FolderType } from "@/types/explorer";
import { LogType } from "@/types/log";
import { Monaco } from "@monaco-editor/react";
import { Contract, IDL } from "@/types/idl";
import { ICompiled, ICurrentWasm } from "@/types/contracts";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

export const context = {
  monaco: null as Monaco | null,
  preferences: {
    theme: "vs-dark",
    fontSize: 14,
    autoSave: true,
    autoFormat: true,
  },
  showSpinnerDialog: false,
  currentFile: "home" as string | null,
  logs: [] as LogType[],
  tabs: new Set<string>(),
  files: {} as Record<string, string>,
  explorer: {
    type: ExpNodeType.FOLDER,
    open: true,
    name: "explorer",
    path: "explorer",
    items: {
      src: {
        type: ExpNodeType.FOLDER,
        open: true,
        name: "src",
        path: "explorer.items.src",
        items: {},
      },
    },
  } satisfies FolderType,
  contract: {
    invoking: false,
    address: null,
    methods: [],
    // for deploy explorer's deployed instance list
    // to invoke functions therein
    deployed: {},
  }  as Contract,
  // for deploy explorer's drop down list
  // if the list has something, we can select one and press deploy btn
  compiled: [] as ICompiled[],
  currentWasm: {
    path: '',
    buff: null,
  } as ICurrentWasm,
};

export type Context = typeof context;
