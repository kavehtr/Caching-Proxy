import fs from "fs";
import path from "path";
import crypto from "crypto";
import { promisify } from "util";

const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);

const CACHE_DIR = path.resolve(process.cwd(), "cache");

export interface CachedResponse {
  status: number;
  headers: Record<string, string>;
  bodyBase64: string;
}

export interface CachedWrite {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
}

/**
 * Ensure ./cache/ directory exists. If not, create it.
 */
async function ensureCacheDir(): Promise<void> {
  try {
    await stat(CACHE_DIR);
    // if stat succeeds and is directory, do nothing.
  } catch (err: any) {
    // If does not exist, create it:
    await mkdir(CACHE_DIR, { recursive: true });
  }
}

/**
 * Given a request‐URL string, compute a SHA256 hex string to use as filename.
 */
function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Try to read from disk‐cache. If found, return a CachedResponse; else return null.
 */
export async function getFromCache(key: string): Promise<CachedResponse | null> {
  await ensureCacheDir();
  const filename = path.join(CACHE_DIR, hashKey(key) + ".json");

  try {
    const data = await readFile(filename, "utf-8");
    const parsed: CachedResponse = JSON.parse(data);
    return parsed;
  } catch (_err) {
    return null;
  }
}

/**
 * Write a new response to disk.
 */
export async function saveToCache(key: string, responseObj: CachedWrite): Promise<void> {
  await ensureCacheDir();
  const filename = path.join(CACHE_DIR, hashKey(key) + ".json");

  const toWrite: CachedResponse = {
    status: responseObj.status,
    headers: responseObj.headers,
    bodyBase64: responseObj.body.toString("base64"),
  };

  await writeFile(filename, JSON.stringify(toWrite), "utf-8");
}

/**
 * Remove ALL cached files (i.e. clear ./cache/ directory).
 */
export async function clearCache(): Promise<void> {
  try {
    await ensureCacheDir();
    const files = await readdir(CACHE_DIR);
    for (const f of files) {
      const fullPath = path.join(CACHE_DIR, f);
      await unlink(fullPath);
    }
  } catch (err) {
    // If the directory does not exist, there's nothing to clear.
  }
}
