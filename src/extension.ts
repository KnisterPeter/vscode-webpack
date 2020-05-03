import * as vscode from "vscode";
import { Runner } from "./runner";

export function activate(context: vscode.ExtensionContext) {
  const diagnostics = vscode.languages.createDiagnosticCollection("webpack");
  const channel = vscode.window.createOutputChannel("webpack");
  const statusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  );
  statusItem.text = "webpack";

  let runner = new Runner({
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
          configFile: getWebpackConfig(),
          diagnostics,
          channel,
          statusItem,
        });
        context.subscriptions.push(runner);

        if (isRunning) {
          runner.run();
        }
      }
    }),

    vscode.commands.registerCommand("vscode-webpack.start", () => {
      runner.run();
      statusItem.show();
    }),

    vscode.commands.registerCommand("vscode-webpack.trigger", () => {
      runner.invalidate();
    }),

    vscode.commands.registerCommand("vscode-webpack.stop", () => {
      runner.stop();
      statusItem.hide();
    })
  );
}

export function deactivate() {}

function getWebpackConfig(): string | undefined {
  return vscode.workspace.getConfiguration("webpack").get("configFile");
}

export function getProjectDirectoy(): string | undefined {
  if (!vscode.workspace.workspaceFolders) {
    return;
  }

  if (vscode.workspace.workspaceFolders.length > 1) {
    return;
  }

  return vscode.workspace.workspaceFolders[0].uri.fsPath;
}
