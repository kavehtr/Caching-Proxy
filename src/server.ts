// src/server.ts

import express, { Response, RequestHandler } from "express";
import { getFromCache, saveToCache, CachedWrite } from "./cache";

export async function startProxyServer(port: number, origin: string) {
  const app = express();

  // 1) Create a variable of type RequestHandler, pointing to your async function:
  const catchAllMiddleware: RequestHandler = async (req, res) => {
    const incomingUrl = req.originalUrl;
    const normalizedOrigin = origin.replace(/\/+$/, "");
    const targetUrl = normalizedOrigin + incomingUrl;

    // If not GET, proxy directly (always MISS, no caching)
    if (req.method.toUpperCase() !== "GET") {
      try {
        const proxied = await fetch(targetUrl, {
          method: req.method,
          headers: { ...(req.headers as any) },
        });

        // Copy status/headers/body, add X-Cache: MISS
        await copyResponseToExpress(proxied, res, "MISS");
        return; // <--- return void, not Response
      } catch (err) {
        console.error("Error proxying non-GET:", err);
        res.status(502).send("Bad Gateway");
        return;
      }
    }

    // 1. Try disk cache
    const cached = await getFromCache(targetUrl);
    if (cached) {
      // HIT: send cached status + headers + body
      for (const [k, v] of Object.entries(cached.headers)) {
        if (k.toLowerCase() === "transfer-encoding") continue;
        res.setHeader(k, v);
      }
      res.setHeader("X-Cache", "HIT");
      const buffer = Buffer.from(cached.bodyBase64, "base64");
      res.status(cached.status).send(buffer);
      return;
    }

    // 2. MISS → fetch from origin, cache & respond
    try {
      const proxied = await fetch(targetUrl, {
        method: "GET",
        headers: { ...(req.headers as any) },
      });

      const status = proxied.status;
      const headersObj: Record<string, string> = {};
      proxied.headers.forEach((value, key) => {
        headersObj[key] = value;
      });

      const arrayBuffer = await proxied.arrayBuffer();
      const bodyBuffer = Buffer.from(arrayBuffer);

      // Fire-and-forget: write into disk cache
      const toCache: CachedWrite = {
        status,
        headers: headersObj,
        body: bodyBuffer,
      };
      saveToCache(targetUrl, toCache).catch(console.error);

      // Send the response back to the client
      for (const [k, v] of Object.entries(headersObj)) {
        if (k.toLowerCase() === "transfer-encoding") continue;
        res.setHeader(k, v);
      }
      res.setHeader("X-Cache", "MISS");
      res.status(status).send(bodyBuffer);
      return;
    } catch (err) {
      console.error("Error proxying GET:", err);
      res.status(502).send("Bad Gateway");
      return;
    }
  };

  // 2) Now pass that variable to app.use():
  app.use(catchAllMiddleware);

  // 3) Finally, start listening:
  app.listen(port, () => {
    console.log(`Caching proxy is running on port ${port}, forwarding to ${origin}`);
  });
}

async function copyResponseToExpress(
  source: any,
  res: Response,
  cacheStatus: "HIT" | "MISS"
) {
  // Note: this function itself is async, but it does not return a Response—only void.
  res.status(source.status);
  source.headers.forEach((value: string, key: string) => {
    if (key.toLowerCase() === "transfer-encoding") return;
    res.setHeader(key, value);
  });
  res.setHeader("X-Cache", cacheStatus);

  const data = await source.arrayBuffer();
  res.send(Buffer.from(data));
  return;
}
