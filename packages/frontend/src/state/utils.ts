import { MessageType } from "vscode-languageserver-protocol";
import { store } from ".";
import { ICompiled } from "@/types/contracts";
import { ContractsDeployed } from "@/types/idl";

export function createPath(basePath: string, name: string) {
  return basePath + ".items" + `['${name}']`;
}

export function getLatestCompiled(compiled: ICompiled[]): ICompiled | undefined {
  return compiled.reduce<ICompiled | undefined>(
    (latest, item) => !latest || item.compiledAt >= latest.compiledAt ? item : latest,
    undefined,
  );
}

export function getLatestDeployedAddress(deployed: ContractsDeployed): string | undefined {
  return Object.entries(deployed).reduce<[string, number] | undefined>(
    (latest, [address, contract]) =>
      !latest || contract.deployedAt >= latest[1] ? [address, contract.deployedAt] : latest,
    undefined,
  )?.[0];
}

export const logger = {
  error(message: string) {
    store.send({ type: "addLog", logType: MessageType.Error, message });
  },
  info(message: string) {
    store.send({ type: "addLog", logType: MessageType.Info, message });
  },
  warning(message: string) {
    store.send({ type: "addLog", logType: MessageType.Warning, message });
  },
  log(message: string) {
    store.send({ type: "addLog", logType: MessageType.Log, message });
  },
};
