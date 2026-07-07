import { MonacoToProtocolConverter, ProtocolToMonacoConverter } from "./converter";

export const protocolToMonaco = new ProtocolToMonacoConverter();
export const monacoToProtocol = new MonacoToProtocolConverter();
