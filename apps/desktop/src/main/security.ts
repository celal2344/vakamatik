import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IpcMainInvokeEvent, WebContents } from "electron";
import { DESKTOP_APP_HOST, DESKTOP_APP_SCHEME } from "@vakamatik/desktop-contract";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost"]);
const ALLOWED_ASSET_EXTENSIONS = new Set([".css", ".html", ".ico", ".js", ".png", ".svg", ".woff", ".woff2"]);

export function isTrustedRendererUrl(rawUrl: string, developmentServerUrl?: string): boolean {
  try {
    const candidate = new URL(rawUrl);
    if (
      candidate.protocol === `${DESKTOP_APP_SCHEME}:` &&
      candidate.hostname === DESKTOP_APP_HOST &&
      (candidate.pathname === "/" || candidate.pathname === "/index.html") &&
      candidate.username === "" &&
      candidate.password === "" &&
      candidate.port === "" &&
      candidate.search === ""
    )
      return true;
    if (developmentServerUrl === undefined) return false;

    const development = new URL(developmentServerUrl);
    return (
      candidate.origin === development.origin &&
      development.protocol === "http:" &&
      LOOPBACK_HOSTS.has(development.hostname) &&
      candidate.pathname === "/" &&
      candidate.search === ""
    );
  } catch {
    return false;
  }
}

export function assertTrustedIpcSender(
  event: IpcMainInvokeEvent,
  expectedWebContents: WebContents,
  developmentServerUrl?: string,
): void {
  if (
    event.sender !== expectedWebContents ||
    event.senderFrame === null ||
    event.senderFrame !== expectedWebContents.mainFrame ||
    !isTrustedRendererUrl(event.senderFrame.url, developmentServerUrl)
  ) {
    throw new Error("Rejected IPC request from an untrusted sender or frame.");
  }
}

export function resolveApplicationAsset(rendererRoot: string, rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Malformed application URL.");
  }

  if (parsed.protocol !== `${DESKTOP_APP_SCHEME}:` || parsed.hostname !== DESKTOP_APP_HOST) {
    throw new Error("Unauthorized application origin.");
  }
  if (
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.port !== "" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error("Application asset URLs cannot contain credentials, ports, queries, or fragments.");
  }

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(parsed.pathname);
  } catch {
    throw new Error("Malformed application asset encoding.");
  }

  const decodedRaw = decodeURIComponentSafely(rawUrl).replaceAll("\\", "/");
  const decodedTwice = decodeURIComponentSafely(decodedRaw).replaceAll("\\", "/");
  if (
    decodedPath.includes("\0") ||
    decodedPath.includes("\\") ||
    /(?:^|\/)\.\.(?:\/|$)/u.test(decodedRaw) ||
    /(?:^|\/)\.\.(?:\/|$)/u.test(decodedTwice)
  ) {
    throw new Error("Application asset traversal was rejected.");
  }

  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.replace(/^\/+/, "");
  const extension = path.extname(relativePath).toLowerCase();
  if (!ALLOWED_ASSET_EXTENSIONS.has(extension)) {
    throw new Error("Unauthorized application asset type.");
  }

  const root = path.resolve(rendererRoot);
  const candidate = path.resolve(root, relativePath);
  const relative = path.relative(root, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Application asset escaped the renderer root.");
  }
  return candidate;
}

export function fileUrlToPathForProtocol(url: string): string {
  return fileURLToPath(url);
}

function decodeURIComponentSafely(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
