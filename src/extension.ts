import * as vscode from "vscode";
import { Runner } from "./runner";
import { configureStatusBar } from "./status-bar";
import { WebpackTaskProvider } from "./webpack-task";

export const runner = new Runner();

export function activate(context: vscode.ExtensionContext) {
  const diagnostics = vscode.languages.createDiagnosticCollection("webpack");
  const channel = vscode.window.createOutputChannel("webpack");
  const statusBarItem = configureStatusBar(runner);

  runner.configure({
    workingDirectory: getProjectDirectory(),
    configFile: "webpack.config.js",
    diagnostics,
    channel,
  });

  const { registerCommand } = vscode.commands;

  context.subscriptions.push(
    runner,
    diagnostics,
    statusBarItem,

    vscode.tasks.registerTaskProvider(
      "webpack",
      new WebpackTaskProvider(runner)
    ),

    registerCommand(`vscode-webpack.trigger`, () => runner.invalidate())
  );
}

export function deactivate() {}

export function getProjectDirectory(): string | undefined {
  if (!vscode.workspace.workspaceFolders) {
    return;
  }

  if (vscode.workspace.workspaceFolders.length > 1) {
    return;
  }

  return vscode.workspace.workspaceFolders[0].uri.fsPath;
}
