export type IDL = FunctionSpec[];

export interface FunctionSpec {
  type: "function";
  doc: string;
  name: string;
  inputs: InputSpec[];
  outputs: OutputSpec[];
}

export interface ContractsDeployed {
  [key: string]: IDL;
}

interface InputSpec {
  doc: string;
  name: string;
  value: ValueType;
}

interface OutputSpec {
  type: ValueType;
}

type ValueType =
  | { type: "string" }
  | { type: "u8" }
  | { type: "u16" }
  | { type: "u32" }
  | { type: "i32" }
  | { type: "u64" }
  | { type: "i64" }
  | { type: "u128" }
  | { type: "i128" }
  | { type: "vec"; element: ValueType }
  | { type: "option"; value: ValueType }
  | { type: "map"; key: ValueType; value: ValueType }
  | { type: "tuple"; elements: ValueType[] }
  | { type: "custom"; name: string };

export interface Contract {
  address: string | null;
  methods: IDL;
  invoking: boolean;
  deployed: ContractsDeployed;
}
