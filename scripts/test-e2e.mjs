import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import process from "node:process";

const isWindows = process.platform === "win32";
const port = "3217";
const baseURL = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    port,
  ],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
    detached: !isWindows,
  },
);

function stopServer() {
  if (server.pid === undefined || server.exitCode !== null) {
    return;
  }

  if (isWindows) {
    spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
  } else {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      server.kill("SIGTERM");
    }
  }
  server.unref();
}

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error("The production server exited before becoming ready.");
    }

    try {
      const response = await fetch(baseURL);
      if (response.ok) {
        return;
      }
    } catch {
      await delay(250);
    }
  }

  throw new Error("The production server did not become ready within 30 seconds.");
}

try {
  await waitForServer();

  const playwrightEnvironment = { ...process.env };
  delete playwrightEnvironment.FORCE_COLOR;
  const playwright = spawnSync(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test"],
    {
      cwd: process.cwd(),
      env: playwrightEnvironment,
      stdio: "inherit",
      windowsHide: true,
      timeout: 300_000,
    },
  );
  process.exitCode = playwright.status ?? 1;
  if (playwright.error) {
    console.error(playwright.error);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  stopServer();
}

process.exit(process.exitCode);
