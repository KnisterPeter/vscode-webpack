import expect from "expect";
import * as path from "path";
import * as vscode from "vscode";
import { runner } from "../../extension";

function position(l: number, c: number): vscode.Position {
  return new vscode.Position(l, c);
}

function range(sl: number, sc: number, el: number, ec: number): vscode.Range {
  return new vscode.Range(position(sl, sc), position(el, ec));
}

describe("Extension Test with webpack in workspace", () => {
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

    describe("while triggering builds", () => {
      let doc: vscode.TextDocument;

      const insertCommentAt = position(2, 0);
      const removeCommentFrom = range(2, 0, 2, 2);

      async function insertComment(): Promise<void> {
        if (doc.getText(removeCommentFrom) !== "//") {
          const edit = new vscode.WorkspaceEdit();
          edit.insert(doc.uri, insertCommentAt, "//");
          await vscode.workspace.applyEdit(edit);
          await doc.save();
        }
      }

      async function removeComment(): Promise<void> {
        if (doc.getText(removeCommentFrom) === "//") {
          const edit = new vscode.WorkspaceEdit();
          edit.delete(doc.uri, removeCommentFrom);
          await vscode.workspace.applyEdit(edit);
          await doc.save();
        }
      }

      const importCode = `import './does-not-exist';\n`;
      const insertImportAt = position(0, 0);
      const removeImportFrom = range(0, 0, 1, 0);

      async function addBrokenImport(): Promise<void> {
        if (doc.getText(removeImportFrom) !== importCode) {
          const edit = new vscode.WorkspaceEdit();
          edit.insert(doc.uri, insertImportAt, importCode);
          await vscode.workspace.applyEdit(edit);
          await doc.save();
        }
      }

      async function removeBrokenImport(): Promise<void> {
        if (doc.getText(removeImportFrom) === importCode) {
          const edit = new vscode.WorkspaceEdit();
          edit.delete(doc.uri, removeImportFrom);
          await vscode.workspace.applyEdit(edit);
          await doc.save();
        }
      }

      before("open text document", async () => {
        doc = await vscode.workspace.openTextDocument(
          path.resolve(
            vscode.workspace.workspaceFolders![0].uri.fsPath,
            "src/index.js"
          )
        );
        await vscode.window.showTextDocument(doc);
      });

      before("ensure task is started", async () => {
        await startTask();
        await new Promise((resolve) => {
          if (runner.isActive) {
            resolve();
          } else {
            runner.onActive((event) => {
              if (event.status === "enabled") {
                resolve();
              }
            });
          }
        });
      });

      after("ensure task is stopped", async () => {
        await stopTask();
        await new Promise((resolve) => {
          if (!runner.isActive) {
            resolve();
          } else {
            runner.onActive((event) => {
              if (event.status === "disabled") {
                resolve();
              }
            });
          }
        });
      });

      describe("when breaking and saving a file", () => {
        afterEach("insert comment", async () => {
          await insertComment();
        });

        it("should report failure", async () => {
          const promise = new Promise((resolve) => {
            runner.onProgressBuild((event) => {
              if (event.status === "failure") {
                resolve();
              }
            });
          });

          await removeComment();

          await promise;

          const diagnostics = vscode.languages
            .getDiagnostics(doc.uri)
            .filter((diag) => diag.source === "webpack");
          expect(diagnostics).toHaveLength(1);
        });
      });

      describe("when fixing and saving a file", async () => {
        beforeEach("remove comment", async () => {
          await removeComment();
        });

        it("should report success", async () => {
          const promise = new Promise((resolve) => {
            runner.onProgressBuild((event) => {
              if (event.status === "success") {
                resolve();
              }
            });
          });

          await insertComment();

          await promise;

          const diagnostics = vscode.languages
            .getDiagnostics(doc.uri)
            .filter((diag) => diag.source === "webpack");
          expect(diagnostics).toHaveLength(0);
        });
      });

      describe("when inserting broken import", () => {
        afterEach("remove broken import", async () => {
          await removeBrokenImport();
        });

        it("should report failure", async () => {
          const promise = new Promise((resolve) => {
            runner.onProgressBuild((event) => {
              if (event.status === "failure") {
                resolve();
              }
            });
          });

          await addBrokenImport();

          await promise;

          const diagnostics = vscode.languages
            .getDiagnostics(doc.uri)
            .filter((diag) => diag.source === "webpack");
          expect(diagnostics).toHaveLength(1);
        });
      });
    });
  });
});
