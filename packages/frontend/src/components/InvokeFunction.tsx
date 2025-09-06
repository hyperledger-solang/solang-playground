"use client";

import { Fragment, useId, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { toast } from "sonner";
import { FunctionSpec } from "@/types/idl";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { ChevronsLeftRightEllipsis } from "lucide-react";
import { logger } from "@/state/utils";
import { scValToNative, xdr } from "@stellar/stellar-base";
import Spinner from "./Spinner";
import ContractService from "@/lib/services/server/contract";
import { Network_Url } from "@/constants";

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
      if (!contractAddress) {
        toast.error("No contract address provided", { id: toastId });
        logger.error("No contract address provided.");
        return;
      }

      const argsArray = Object.values(args);
      const requestData = {
        contractId: contractAddress,
        method: method.name,
        args: argsArray,
      };

      logger.info("Invoking Contract function...");
      setBlock(true);
      logger.info(JSON.stringify(requestData, null, 2));
      toast.loading("Invoking function...", { id: toastId });
      console.log("Invoke Data", requestData);

      const contractService = new ContractService(Network_Url.TEST_NET);
      const response = await contractService.invokeContract(requestData);
      const { resultXdr, diagnosticEventsXdr, status } = response;

      console.log("Invoke Result", resultXdr);

      let retVal: any = null;
      let logs: string[] = [];

      for (const eventXdr of Array.from(diagnosticEventsXdr || [])) {
        try {
          const diagnosticEvent = xdr.DiagnosticEvent.fromXDR(eventXdr as any, "base64");
          const eventBody = diagnosticEvent.event().body().v0();

          const topics = eventBody.topics().map(scValToNative);
          const eventData = scValToNative(eventBody.data());

          if (topics.length && topics[0] === "fn_return") {
            retVal = eventData;
            console.log("Fn Return Val", retVal);
          }

          if (topics.includes("log")) {
            try {
              logs.push(JSON.stringify(eventData));
            } catch {
              logs.push(String(eventData));
            }
          }
        } catch (e) {
          logger.error(`Error parsing diagnostic event: ${String(e)}`);
        }
      }

      logs = logs.filter(Boolean);

      setLogs(logs);
      console.log("Invoke Logs", logs);

      if (retVal !== null) {
        logger.info(`TX Result: ${retVal}`);
        const logSignature = createLogSingnature(method, args, retVal);
        setInvkRetVal(retVal);
        setSignature(logSignature);
      }

      setBlock(false);

      if (status === "SUCCESS") {
        toast.success(`Function invoked successfully`, { id: toastId });
        logger.info("Transaction successful.");
        logger.info(`TxId: ${response.hash}`);
        logger.info(`Contract Logs:\n${logs.join("\n")}`);
        return response;
      } else {
        console.log("Invoke Failure", response);
        logger.error("Transaction failed.");
        logger.info(`TxId: ${resultXdr.hash}`);
        toast.error(`Transaction failed`, { id: toastId });
        throw new Error("Transaction failed");
      }
    } catch (error: any) {
      console.log("Invoke Error", error);
      toast.error(`Error: ${error.message}`, { id: toastId });
    } finally {
      setInvkRetVal(null);
      setBlock(false);
    }
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
