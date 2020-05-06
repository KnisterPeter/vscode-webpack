import * as vscode from "vscode";
import { getProjectDirectory } from "./extension";
import type { Runner, RunnerBuildStatus } from "./runner";

interface WebpackTaskDefinition extends vscode.TaskDefinition {
  configFile?: string;
  executionDirectory?: string;
}

export class WebpackTaskProvider implements vscode.TaskProvider {
  constructor(private runner: Runner) {}

  provideTasks(): vscode.ProviderResult<vscode.Task[]> {
    return [];
  }

  async resolveTask(task: vscode.Task): Promise<vscode.Task | undefined> {
    if (task.definition.type === "webpack") {
      const definition: WebpackTaskDefinition = task.definition;

      const projectDirectory = getProjectDirectory();
      if (!projectDirectory) {
        return undefined;
      }

      const workingDirectory = definition.executionDirectory?.replace(
        "${workspaceFolder}",
        projectDirectory
      );

      const runner = this.runner;
      await runner.configure({
        configFile: definition.configFile,
        workingDirectory,
      });

      let lastStatus: RunnerBuildStatus = "idle";

      const execution = new vscode.CustomExecution(async () => {
        const closeEmitter = new vscode.EventEmitter<number | void>();
        const writeEmitter = new vscode.EventEmitter<string>();
        const progressListener = runner.onProgressBuild((event) => {
          if (lastStatus !== "running") {
            writeEmitter.fire("Build started\r\n");
          } else if (event.status === "success") {
            writeEmitter.fire("Build successful\r\n");
          } else if (event.status === "failure") {
            writeEmitter.fire("Build failed\r\n");
          }
          lastStatus = event.status;
        });

        function doClose() {
          runner.stop();
          progressListener.dispose();
        }

        return {
          onDidClose: closeEmitter.event,
          onDidWrite: writeEmitter.event,
          open() {
            runner.start();
          },
          close: doClose,
          handleInput(input) {
            if (input.charCodeAt(0) === 3) {
              doClose();
              closeEmitter.fire();
            } else {
              writeEmitter.fire(input.replace(/\r/, "\r\n"));
            }
          },
        };
      });

      const resolvedTask = new vscode.Task(
        definition,
        vscode.TaskScope.Workspace,
        task.name,
        task.source,
        execution,
        ["knisterpeter.vscode-webpack"]
      );
      resolvedTask.isBackground = true;

      return resolvedTask;
    }
    return undefined;
  }
}
