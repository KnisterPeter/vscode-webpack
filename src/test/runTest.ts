import { execSync } from "child_process";
import * as path from "path";
import { runTests } from "vscode-test";

async function runWorkspace(name: string) {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");
    const extensionTestsPath = path.resolve(__dirname, `./${name}/index`);
    const workspace = path.resolve(
      __dirname,
      `../../src/test/${name}/workspace`
    );

    execSync("yarn install", {
      cwd: workspace,
    });

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: ["--disable-extensions", workspace],
    });
  } catch (err) {
    console.error(`Failed to run tests '${name}'`);
    process.exit(1);
  }
}

async function main() {
  const workspace = process.argv[2];
  const workspaces = ["empty", "simple", "complex"];

  if (workspace && workspaces.includes(workspace)) {
    await runWorkspace(`${workspace}-workspace`);
  } else {
    for await (const workspace of workspaces) {
      await runWorkspace(`${workspace}-workspace`);
    }
  }
}

main();
