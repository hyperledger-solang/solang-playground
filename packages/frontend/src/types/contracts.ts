export interface ICompiled {
    path: string,
    name: string,
    compiledAt: number,
}

export interface ICurrentWasm {
    path: string,
    buff: Buffer | null,
}