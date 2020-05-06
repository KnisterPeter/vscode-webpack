import * as vscode from "vscode";
import { Runner } from "./runner";
import { configureStatusBar } from "./status-bar";
import { WebpackTaskProvider } from "./webpack-task";

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

  const { registerCommand } = vscode.commands;

  context.subscriptions.push(
    runner,
    diagnostics,
    statusBarItem,

    vscode.tasks.registerTaskProvider(
      "webpack",
      new WebpackTaskProvider(runner)
    ),

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
