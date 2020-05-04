import * as vscode from "vscode";
import type { Runner } from "./runner";

export function configureStatusBar(runner: Runner): vscode.StatusBarItem {
  const statusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  );
  statusItem.text = "webpack";

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

  return statusItem;
}
