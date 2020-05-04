import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { Runner } from "./runner";

export let runner: Runner;

export function activate(context: vscode.ExtensionContext) {
  const workingDirectory = getWebpackDirectory();

  const diagnostics = vscode.languages.createDiagnosticCollection("webpack");
  const channel = vscode.window.createOutputChannel("webpack");
  const statusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  );
  statusItem.text = "webpack";

  runner = new Runner();
  runner.configure({
    workingDirectory: workingDirectory,
    configFile: getWebpackConfig(),
    diagnostics,
    channel,
  });

  runner.onActive((event) => {
    if (event.status === "enabled") {
      statusItem.show();
    } else {
      statusItem.hide();
    }
  });

  runner.onProgressBuild((event) => {
    const icon = (() => {
      switch (event.status) {
        case "idle":
          return "";
        case "running":
          return "$(repo-sync~spin)";
        case "success":
          return "$(check)";
        case "failure":
          return "$(alert)";
        default:
          return "";
      }
    })();

    const progress = event.progress ? `${event.progress}% ` : "";

    statusItem.text = `${icon} ${progress}webpack`;
  });

  if (getAutostart() && workingDirectory) {
    const configFile = path.join(workingDirectory, getWebpackConfig());
    if (fs.existsSync(configFile)) {
      runner.start();
    }
  }

  context.subscriptions.push(
    runner,
    diagnostics,

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

    vscode.commands.registerCommand("vscode-webpack.start", () =>
      runner.start()
    ),

    vscode.commands.registerCommand("vscode-webpack.trigger", () =>
      runner.invalidate()
    ),

    vscode.commands.registerCommand("vscode-webpack.stop", () => runner.stop())
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
