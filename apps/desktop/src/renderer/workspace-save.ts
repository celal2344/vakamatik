export type SaveStatus = "saved" | "pending" | "saving" | "error";

export type FlushEdits = () => Promise<boolean>;

export type RegisterFlush = (flush: FlushEdits | null) => void;

export async function flushBeforeTransition(flush: FlushEdits | null): Promise<boolean> {
  if (flush === null) return true;
  try {
    return await flush();
  } catch {
    return false;
  }
}
