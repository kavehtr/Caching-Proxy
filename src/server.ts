import express, { Request, Response } from "express";

const app = express();

const args = process.argv.slice(2);

let port: number | undefined;
let origin: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port" && args[i + 1]) {
    port = Number(args[i + 1]);
  }
  if (args[i] === "--origin" && args[i + 1]) {
    origin = args[i + 1];
  }
}

if (!port || !origin) {
  console.error("Usage: caching-proxy --port <number> --origin <url>");
  process.exit(1);
}

console.log(`Starting server on port ${port}, proxying to ${origin}`);
app.listen(port, () => console.log(`the system is running on port ${port}`));
