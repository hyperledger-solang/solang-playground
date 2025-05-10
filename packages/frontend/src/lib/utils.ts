import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const downloadBlob = (code: number[]): void => {
  const blob = new Blob([new Uint8Array(code).buffer]);

  const a = document.createElement("a");
  a.download = "result.wasm";
  a.href = URL.createObjectURL(blob);
  a.dataset.downloadurl = ["application/json", a.download, a.href].join(":");
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => {
    URL.revokeObjectURL(a.href);
  }, 1500);
};

/**
 * Generates a random ID.
 * @param length - The desired length of the ID. Default is 10.
 * @returns A randomly generated ID as a string.
 */
export function generateRandomId(length: number = 10): string {
  const characters: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result: string = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export function onEnter(callback: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      callback();
    }
  };
}

export function isValidJSON(jsonString: string): boolean {
  try {
    JSON.parse(jsonString);
    return true;
  } catch (e) {
    return false;
  }
}
