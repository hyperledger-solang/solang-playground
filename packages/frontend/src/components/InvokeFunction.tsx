"use client";

import { Fragment, useId, useState } from "react";
import { store } from "@/state";
import { useSelector } from "@xstate/store/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { toast } from "sonner";
import { FunctionSpec } from "@/types/idl";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { ChevronsLeftRightEllipsis } from "lucide-react";
import { logger } from "@/state/utils";
import { callContract } from "@/actions";
import { networkRpc } from "@/lib/web3";
import { Server } from "@stellar/stellar-sdk/rpc";
import { Networks, scValToNative, xdr, rpc } from "@stellar/stellar-sdk";
import { withError } from "@/lib/action-util";
import Spinner from "./Spinner";

function transformValue(type: string, value: any) {
  switch (type) {
    case "string":
      return `"${value}"`;
    case "bool":
      return value ? "true" : "false";
    case "vec":
      return typeof value === "string" ? value : JSON.stringify(value);
    default:
      return value;
  }
}

function createLogSingnature(method: FunctionSpec, args: any, result: any) {
  const mappedArgs = method.inputs.map((arg) => {
    const value = args[arg.name]?.value;
    const val = transformValue(arg.value.type, value);
    return {
      name: arg.name,
      type: arg.value.type,
      value: val,
    };
  });
  const output = method.outputs.at(0);
  const val = transformValue(output?.type as any, result);
  return {
    name: method.name,
    args: mappedArgs,
    result: {
      type: output?.type as any,
      value: val,
    },
  };
}
const defaultState = {
  args: [],
  result: { type: "", value: "" },
  name: "",
};
function InvokeFunction({ contractAddress, method }: { contractAddress: string, method: FunctionSpec }) {
  const [sg, setSignature] = useState<ReturnType<typeof createLogSingnature>>(defaultState);
  const [args, setArgs] = useState<Record<string, { type: string; value: string; subType: string }>>({});
  // const contractAddress = useSelector(store, (state) => state.context.contract?.address);
  const [logs, setLogs] = useState<string[]>(["Hello wrold", "Mango World"]);
  const toastId = useId();
  const [block, setBlock] = useState(false);
  const [invkRetVal, setInvkRetVal] = useState<any>(null);

  const handleInputChange = (name: string, value: string, type: string, subType: string) => {
    setArgs((prev) => ({
      ...prev,
      [name]: {
        type,
        value,
        subType,
      },
    }));
  };

  const handleInvoke = async () => {
    try {
      const server = new Server(networkRpc[Networks.TESTNET]);
      const argsArray = Object.values(args);
      const data = {
        contractId: contractAddress!,
        method: method.name,
        args: argsArray,
      };

      logger.info("Invoking Contract function...");
      setBlock(true);
      logger.info(JSON.stringify(data, null, 2));
      toast.loading("Invoking function...", { id: toastId });

      const result = await withError(callContract(data));

      let response;
      while (true) {
        response = await server.getTransaction(result.hash);
        if (response.status !== "NOT_FOUND") {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const logs =
        response.diagnosticEventsXdr
          ?.map((eventXdr) => {
            const diagnosticEvent = eventXdr;
            const contractEvent = diagnosticEvent.event();
            const eventBody = contractEvent.body().v0();
            const data = scValToNative(eventBody.data());
            const topics = eventBody.topics().map((topic) => scValToNative(topic));

            if (topics.includes("log")) {
              try {
                return JSON.stringify(data);
              } catch (error) {
                return data;
              }
            }

            return null as never;
          })
          .filter(Boolean) || [];

      setLogs(logs);

      if (response.status === "SUCCESS") {
        logger.info("Transaction successful.");
        logger.info(`TxId: ${result.hash}`);
        logger.info(`Contract Logs: \n${logs.join("\n")}`);
        if (response.returnValue) {
          const retVal = scValToNative(response.returnValue);
          setInvkRetVal(retVal);
          logger.info(`TX Result: ${retVal}`);
          const logSignature = createLogSingnature(method, args, scValToNative(response.returnValue));
          setBlock(false);
          setSignature(logSignature);
        }
        toast.success(`Function invoked successfully`, { id: toastId });
        return response;
      } else {
        logger.error("Transaction failed.");
        logger.info(`TxId: ${result.hash}`);
        toast.error(`Transaction failed`, { id: toastId });
        throw new Error("Transaction failed");
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`, { id: toastId });
    }
    setInvkRetVal(null);
    setBlock(false);
  };

  return (
    <Fragment>
      <Dialog open={block}>
        <DialogContent className="w-max bg-transparent border-none shadow-none" icon={false}>
          <DialogHeader className="sr-only">
            <DialogTitle>Invoking Function</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Spinner />
          </div>
        </DialogContent>
      </Dialog>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" key={method.name} className="w-full text-left justify-start items-center btn-custom-invoke" style={{marginTop: '2px'}}>
            <span>{method.name}</span>
            {invkRetVal && (<span>{invkRetVal}</span>)}
            <ChevronsLeftRightEllipsis className="ml-auto" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoke {method.name}</DialogTitle>
            <DialogDescription>{method.doc || "Enter arguments to invoke this function"}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {method.inputs?.map((arg, index) => (
              <div key={index} className="flex flex-col gap-2">
                <Label htmlFor={arg.name} className="">
                  <span>{arg.name}</span>{" "}
                  <span className="text-xs text-muted-foreground bg-black/10 p-1 rounded">({arg.value.type})</span>
                </Label>
                <Input
                  id={arg.name}
                  value={args[arg.name]?.value || ""}
                  onChange={(e) =>
                    handleInputChange(arg.name, e.target.value, arg.value.type, (arg as any).value?.element?.type)
                  }
                  className="col-span-3"
                  placeholder={`Enter '${arg.name}' value`}
                />
              </div>
            ))}

            {method.inputs?.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">This function takes no arguments</p>
            )}
          </div>

          <DialogFooter>
            <DialogTrigger asChild>
              <Button variant="outline">Cancel</Button>
            </DialogTrigger>
            <DialogTrigger asChild>
              <Button onClick={handleInvoke}>Invoke</Button>
            </DialogTrigger>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(sg.name)} onOpenChange={(val) => setSignature(val ? sg : defaultState)}>
        <DialogContent>
          <DialogHeader className="sr-only">
            <DialogTitle>Invocation result</DialogTitle>
          </DialogHeader>
          <div className="">
            <p className="text-lg font-bold mb-2">Function Signature</p>
            <div className="w-full font-medium text-lg resize-none p-2 text-white bg-[rgb(31,31,31)] rounded min-h-16">
              <div className="flex gap-1">
                <span className="text-[#569cd6]">function&nbsp;:-&nbsp;</span>
                <span className="text-[#dcdcaa]">{sg.name}</span>
              </div>
              {sg.args.map((arg, index) => (
                <div className="flex gap-1" key={arg.name}>
                  <span className="text-[#5c9284]">
                    <span className="">Input{index + 1}</span>&nbsp;:-&nbsp;
                  </span>
                  <span className="text-[#9cdcaa]">{arg.name}:</span>
                  <span className="text-[#4ec9b0]">{arg.type}</span>
                  <span className="text-[#d4d4d4]">=</span>
                  <span className="text-[#ce9178]">{arg.value}</span>
                </div>
              ))}
              <div className="flex gap-1">
                <span className="text-[#755c92]">Result&nbsp;:-&nbsp;</span>
                <span className="text-[#c586c0]">return:</span>
                <span className="text-[#4ec9b0]">{sg.result.type}</span>
                <span className="text-[#d4d4d4]">=</span>
                <span className="text-[#ce9178]">{sg.result.value}</span>
              </div>
            </div>

            <p className="text-lg font-bold mb-2 mt-3">Logs:</p>
            <div className="w-full grid gap-1 font-medium text-lg resize-none p-2  bg-[rgb(31,31,31)] rounded min-h-16">
              {logs.map((log, index) => (
                <p key={index} className="text-base">
                  <span className="text-[#947291]">{"->"}&nbsp;</span>
                  {log}
                </p>
              ))}
            </div>
          </div>

          <DialogFooter>
            <DialogTrigger asChild>
              <Button variant="outline">Cancel</Button>
            </DialogTrigger>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}

export default InvokeFunction;
