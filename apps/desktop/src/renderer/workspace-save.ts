export type SaveStatus = "saved" | "pending" | "saving" | "error";

export type FlushEdits = () => Promise<boolean>;

export type RegisterFlush = (flush: FlushEdits | null) => void;
