import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  defaultWorkspaceUiState,
  workspaceUiStateSchema,
  type CaseSessionSummary,
  type CaseView,
  type WorkspaceUiState,
} from "@vakamatik/desktop-contract";

interface StoredSession {
  readonly caseId: string;
  readonly root: string;
  readonly title: string;
  readonly folderName: string;
  readonly lastOpenedAt: string;
  readonly uiState: WorkspaceUiState;
}

interface StoredRegistry {
  readonly version: 1;
  readonly sessions: readonly StoredSession[];
}

export class CaseSessionRegistry {
  readonly #filePath: string;
  #writeChain: Promise<void> = Promise.resolve();

  public constructor(userDataDirectory: string) {
    this.#filePath = path.join(userDataDirectory, "case-sessions.json");
  }

  async list(): Promise<readonly CaseSessionSummary[]> {
    const registry = await this.#read();
    const summaries = await Promise.all(
      registry.sessions.map(async (session) => ({
        caseId: session.caseId,
        title: session.title,
        folderName: session.folderName,
        lastOpenedAt: session.lastOpenedAt,
        available: await this.#isAvailable(session.root),
        uiState: session.uiState,
      })),
    );
    return summaries.sort((left, right) => right.lastOpenedAt.localeCompare(left.lastOpenedAt));
  }

  async rootFor(caseId: string): Promise<string | undefined> {
    return (await this.#read()).sessions.find((session) => session.caseId === caseId)?.root;
  }

  async register(root: string, caseView: CaseView): Promise<void> {
    await this.#update((registry) => {
      const prior = registry.sessions.find((session) => session.caseId === caseView.caseId);
      const next: StoredSession = {
        caseId: caseView.caseId,
        root: path.resolve(root),
        title: caseView.title,
        folderName: caseView.folderName,
        lastOpenedAt: new Date().toISOString(),
        uiState: prior?.uiState ?? { ...defaultWorkspaceUiState },
      };
      return [next, ...registry.sessions.filter((session) => session.caseId !== caseView.caseId)].slice(
        0,
        200,
      );
    });
  }

  async saveUiState(caseId: string, uiState: WorkspaceUiState): Promise<void> {
    await this.#update((registry) =>
      registry.sessions.map((session) =>
        session.caseId === caseId ? { ...session, uiState: workspaceUiStateSchema.parse(uiState) } : session,
      ),
    );
  }

  async forget(caseId: string): Promise<void> {
    await this.#update((registry) => registry.sessions.filter((session) => session.caseId !== caseId));
  }

  async #isAvailable(root: string): Promise<boolean> {
    try {
      await access(path.join(root, "case.json"));
      return true;
    } catch {
      return false;
    }
  }

  async #read(): Promise<StoredRegistry> {
    try {
      const parsed: unknown = JSON.parse(await readFile(this.#filePath, "utf8"));
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !("sessions" in parsed) ||
        !Array.isArray(parsed.sessions)
      ) {
        return { version: 1, sessions: [] };
      }
      const sessions = parsed.sessions.flatMap((value): StoredSession[] => {
        if (typeof value !== "object" || value === null) return [];
        const item = value as Record<string, unknown>;
        if (
          typeof item.caseId !== "string" ||
          typeof item.root !== "string" ||
          typeof item.title !== "string" ||
          typeof item.folderName !== "string" ||
          typeof item.lastOpenedAt !== "string"
        )
          return [];
        const uiState = workspaceUiStateSchema.safeParse(item.uiState);
        return [
          {
            caseId: item.caseId,
            root: item.root,
            title: item.title,
            folderName: item.folderName,
            lastOpenedAt: item.lastOpenedAt,
            uiState: uiState.success ? uiState.data : { ...defaultWorkspaceUiState },
          },
        ];
      });
      return { version: 1, sessions };
    } catch {
      return { version: 1, sessions: [] };
    }
  }

  async #update(change: (registry: StoredRegistry) => readonly StoredSession[]): Promise<void> {
    this.#writeChain = this.#writeChain.then(async () => {
      const current = await this.#read();
      const next: StoredRegistry = { version: 1, sessions: change(current) };
      await mkdir(path.dirname(this.#filePath), { recursive: true });
      const temporaryPath = `${this.#filePath}.tmp`;
      await writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
      await rename(temporaryPath, this.#filePath);
    });
    await this.#writeChain;
  }
}
