import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(scriptDirectory, "..", "..");
const assetsDirectory = join(repositoryRoot, "web3d-assets");
const serviceWorkerPath = join(repositoryRoot, "web3d-sw.js");
const marker = "  /*__GENERATED_WEB3D_ASSETS__*/";

const assetFiles = (await readdir(assetsDirectory))
  .filter((name) => name.endsWith(".js") || name.endsWith(".css"))
  .sort((left, right) => left.localeCompare(right));

if (assetFiles.length === 0) {
  throw new Error("No Web3D build assets were found for offline caching.");
}

const serviceWorker = await readFile(serviceWorkerPath, "utf8");
if (!serviceWorker.includes(marker)) {
  throw new Error("The service worker asset marker is missing.");
}

const generatedEntries = assetFiles
  .map((name, index) => {
    const suffix = index === assetFiles.length - 1 ? "" : ",";
    return `  "./web3d-assets/${name}"${suffix}`;
  })
  .join("\n");

await writeFile(serviceWorkerPath, serviceWorker.replace(marker, generatedEntries), "utf8");
console.log(`Offline cache finalized with ${assetFiles.length} build assets.`);
