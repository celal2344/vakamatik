import { spawn } from "node:child_process";

const executable = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "pnpm";
const arguments_ =
  process.platform === "win32"
    ? ["/d", "/s", "/c", "pnpm --filter @vakamatik/desktop dev"]
    : ["--filter", "@vakamatik/desktop", "dev"];
const child = spawn(executable, arguments_, {
  env: { ...process.env, VAKAMATIK_SMOKE_TEST: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  output += chunk;
});
child.stderr.on("data", (chunk) => {
  output += chunk;
});

const timeout = setTimeout(() => child.kill(), 45_000);
const exitCode = await new Promise((resolve) => child.once("exit", resolve));
clearTimeout(timeout);

if (exitCode !== 0 || !output.includes("VAKAMATIK_SMOKE_READY")) {
  throw new Error(`Development Electron smoke failed (exit ${String(exitCode)}).\n${output}`);
}

process.stdout.write(
  "Development Electron shell launched from the loopback Vite server and exited cleanly.\n",
);
