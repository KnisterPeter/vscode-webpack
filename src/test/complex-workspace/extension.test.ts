import expect from "expect";
import * as vscode from "vscode";
import { runner } from "../../extension";

describe("Extension Test with webpack in complex workspace", () => {
  it("should be activated by default", () => {
    expect(
      vscode.extensions.getExtension("knisterpeter.vscode-webpack")?.isActive
    ).toBeTruthy();
  });

  describe("the runner", () => {
    let execution: vscode.TaskExecution | undefined;

    async function startTask() {
      const tasks = await vscode.tasks.fetchTasks({ type: "webpack" });
      execution = await vscode.tasks.executeTask(tasks[0]);
    }

    async function stopTask() {
      execution?.terminate();
    }

    describe("lifecycle", () => {
      afterEach(async () => {
        await stopTask();
      });

      it("should notify if started", async () => {
        const promise = new Promise((resolve) => {
          runner.onActive((event) => {
            if (event.status === "enabled") {
              resolve();
            }
          });
        });

        await startTask();

        return promise;
      });

      it("should notify if stopped", async () => {
        const promise = new Promise((resolve) => {
          runner.onActive((event) => {
            if (event.status === "disabled") {
              resolve();
            }
          });
        });

        await startTask();
        await stopTask();

        return promise;
      });
    });
  });
});
