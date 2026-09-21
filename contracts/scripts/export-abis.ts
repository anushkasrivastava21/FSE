/**
 * export-abis.ts — Extracts raw ABI JSON from Hardhat artifacts into shared/abi/
 * Run after `hardhat compile`: node scripts/export-abis.ts
 */
import * as fs from "fs";
import * as path from "path";

const CONTRACTS_TO_EXPORT = ["Listing", "MatchingEngine"];
const ARTIFACTS_DIR = path.resolve(__dirname, "../artifacts/src");
const OUTPUT_DIR = path.resolve(__dirname, "../../shared/abi");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

for (const name of CONTRACTS_TO_EXPORT) {
  const artifactPath = path.join(ARTIFACTS_DIR, `${name}.sol`, `${name}.json`);

  if (!fs.existsSync(artifactPath)) {
    console.error(`Artifact not found: ${artifactPath}`);
    console.error("Run 'hardhat compile' first.");
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  const abi = artifact.abi;

  const outputPath = path.join(OUTPUT_DIR, `${name}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(abi, null, 2) + "\n");
  console.log(`Exported ${name} ABI → ${outputPath}`);
}

console.log("\nDone. ABIs are in shared/abi/");
