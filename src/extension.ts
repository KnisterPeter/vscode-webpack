import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { Runner } from "./runner";
import { configureStatusBar } from "./status-bar";

export const runner = new Runner();

export function activate(context: vscode.ExtensionContext) {
  const workingDirectory = getWebpackDirectory();

  const diagnostics = vscode.languages.createDiagnosticCollection("webpack");
  const channel = vscode.window.createOutputChannel("webpack");
  const statusBarItem = configureStatusBar(runner);

  runner.configure({
    workingDirectory: workingDirectory,
    configFile: getWebpackConfig(),
    diagnostics,
    channel,
  });

  if (getAutostart() && workingDirectory) {
    const configFile = path.join(workingDirectory, getWebpackConfig());
    if (fs.existsSync(configFile)) {
      runner.start();
    }
  }

  const { registerCommand } = vscode.commands;

  context.subscriptions.push(
    runner,
    diagnostics,
    statusBarItem,

    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("webpack")) {
        runner.configure({
          workingDirectory: getWebpackDirectory(),
          configFile: getWebpackConfig(),
          diagnostics,
          channel,
        });
      }
    }),

    registerCommand(`vscode-webpack.start`, () => runner.start()),
    registerCommand(`vscode-webpack.trigger`, () => runner.invalidate()),
    registerCommand(`vscode-webpack.stop`, () => runner.stop())
  );
}

export function deactivate() {}

function getProjectDirectoy(): string | undefined {
  if (!vscode.workspace.workspaceFolders) {
    return;
  }

  if (vscode.workspace.workspaceFolders.length > 1) {
    return;
  }

  return vscode.workspace.workspaceFolders[0].uri.fsPath;
}

function getWebpackConfig(): string {
  return vscode.workspace
    .getConfiguration("webpack")
    .get("configFile", "webpack.config.js");
}

function getWebpackDirectory(): string | undefined {
  const directory: string | undefined = vscode.workspace
    .getConfiguration("webpack")
    .get("executionDirectory");
  return directory?.length ? directory : getProjectDirectoy();
}

function getAutostart(): boolean {
  return vscode.workspace
    .getConfiguration("webpack")
    .get("startOnActivation", true);
}
