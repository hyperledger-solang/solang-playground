export function matchEnum<T extends string | number, R>(
    value: T,
    cases: { [K in T]: () => R }
): R {
    return cases[value]();
}

// impl for browser
export async function sha256Buffer(buf: Buffer | Uint8Array): Promise<string> {
    const data = buf instanceof Uint8Array ? buf : new Uint8Array(buf);

    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export function safeParseJson(jString: string): any {
  try {
    return JSON.parse(jString);
  } catch (e) {
    return false;
  }
}