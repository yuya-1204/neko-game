import { mkdir, rm } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..", "..");
const assetsDirectory = resolve(repositoryRoot, "web3d-assets");

if (
  dirname(assetsDirectory) !== repositoryRoot ||
  basename(assetsDirectory) !== "web3d-assets"
) {
  throw new Error(`Refusing to clean an unexpected build directory: ${assetsDirectory}`);
}

await rm(assetsDirectory, { recursive: true, force: true });
await mkdir(assetsDirectory);
console.log(`Cleaned generated assets: ${assetsDirectory}`);
