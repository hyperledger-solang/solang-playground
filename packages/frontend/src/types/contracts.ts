export interface ICompiled {
    path: string,
    name: string,
}

export interface ICurrentWasm {
    path: string,
    buff: Buffer | null,
}