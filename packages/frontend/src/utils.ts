export function mapIfValid(v: string, t: string): any {
    if(/bool/.test(t) &&(v === "true" || v === "false")) {
        return v === "true";
    } else if(/uint\d*/.test(t) && /^[0-9]+$/.test(v)) {
        return Number(v);
    } else if(/bytes\d*|address/.test(t) && v.startsWith("0x")) {
        return v;
    }
    return null;
}