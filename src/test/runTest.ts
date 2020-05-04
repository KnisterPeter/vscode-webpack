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
  await runWorkspace("suite");
  await runWorkspace("simple");
}

main();
