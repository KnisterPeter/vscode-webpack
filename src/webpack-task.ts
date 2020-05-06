import * as vscode from "vscode";
import type { Runner } from "./runner";

interface WebpackTaskDefinition extends vscode.TaskDefinition {
  configFile?: string;
  executionDirectory?: string;
}

export class WebpackTaskProvider implements vscode.TaskProvider {
  constructor(private runner: Runner) {}

  provideTasks(): vscode.ProviderResult<vscode.Task[]> {
    return [];
  }

  resolveTask(task: vscode.Task): vscode.ProviderResult<vscode.Task> {
    if (task.definition.type === "webpack") {
      const webpackTask: WebpackTaskDefinition = task.definition;

      const runner = this.runner;

      return new vscode.Task(
        webpackTask,
        vscode.TaskScope.Workspace,
        "webpack",
        "webpack",
        new vscode.CustomExecution(async () => {
          const writeEmitter = new vscode.EventEmitter<string>();
          const progressListener = runner.onProgressBuild((event) => {
            if (event.status === "success") {
              writeEmitter.fire("Build successful\r\n");
            } else if (event.status === "failure") {
              writeEmitter.fire("Build failed\r\n");
            }
          });

          return {
            onDidWrite: writeEmitter.event,
            open() {
              runner.start();
            },
            close() {
              runner.stop();
              progressListener.dispose();
            },
          };
        }),
        []
      );
    }
    return undefined;
  }
}
