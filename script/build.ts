import { execSync } from "node:child_process";

function run(cmd: string) {
  try {
    execSync(cmd, { stdio: "inherit", env: process.env });
  } catch (err) {
    console.error(`Build step failed: ${cmd}`);
    process.exit(1);
  }
}

run("npx hardhat compile");
