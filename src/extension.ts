import * as vscode from "vscode";
import { Runner } from "./runner";

export function activate(context: vscode.ExtensionContext) {
  const workingDirectory = getWebpackDirectory();

  const diagnostics = vscode.languages.createDiagnosticCollection("webpack");
  const channel = vscode.window.createOutputChannel("webpack");
  const statusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  );
  statusItem.text = "webpack";

  let runner = new Runner({
    workingDirectory: workingDirectory,
    configFile: getWebpackConfig(),
    diagnostics,
    channel,
    statusItem,
  });

  context.subscriptions.push(
    runner,
    diagnostics,

    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("webpack")) {
        const isRunning = runner.isRunning;
        runner.dispose();

        runner = new Runner({
          workingDirectory: getWebpackDirectory(),
          configFile: getWebpackConfig(),
          diagnostics,
          channel,
          statusItem,
        });
        context.subscriptions.push(runner);

        if (isRunning) {
          runner.start();
        }
      }
    }),

    vscode.commands.registerCommand("vscode-webpack.start", () => {
      runner.start();
    }),

    vscode.commands.registerCommand("vscode-webpack.trigger", () => {
      runner.invalidate();
    }),

    vscode.commands.registerCommand("vscode-webpack.stop", () => {
      runner.stop();
    })
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
