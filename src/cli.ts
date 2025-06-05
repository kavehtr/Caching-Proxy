#!/usr/bin/env node

// src/cli.ts

import { startProxyServer } from "./server";
import { clearCache } from "./cache";

interface CLIArgs {
  port?: number;
  origin?: string;
  clearCacheFlag: boolean;
}

function parseArgs(argv: string[]): CLIArgs {
  // argv: [ "node", "dist/cli.js", ...user args... ]
  const args = argv.slice(2);
  const result: CLIArgs = { clearCacheFlag: false };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--port" && i + 1 < args.length) {
      result.port = parseInt(args[i + 1], 10);
      i++;
    } else if (a === "--origin" && i + 1 < args.length) {
      result.origin = args[i + 1];
      i++;
    } else if (a === "--clear-cache") {
      result.clearCacheFlag = true;
    } else {
      console.error(`Unknown or malformed argument: ${a}`);
      process.exit(1);
    }
  }

  return result;
}

async function main() {
  const { port, origin, clearCacheFlag } = parseArgs(process.argv);

  if (clearCacheFlag) {
    console.log("Clearing cache folder...");
    try {
      await clearCache();
      console.log("Cache cleared successfully.");
    } catch (err) {
      console.error("Error clearing cache:", err);
      process.exit(1);
    }
    process.exit(0);
  }

  if (typeof port !== "number" || !origin) {
    console.error("Usage:");
    console.error("  caching-proxy --port <number> --origin <url>");
    console.error("  caching-proxy --clear-cache");
    process.exit(1);
  }

  // Start the proxy server
  startProxyServer(port, origin);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
