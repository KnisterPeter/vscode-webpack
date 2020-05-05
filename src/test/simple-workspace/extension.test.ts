import expect from "expect";
import * as path from "path";
import * as vscode from "vscode";
import { runner } from "../../extension";

describe("Extension Test with webpack in workspace", () => {
  it("should be activated by default", () => {
    expect(
      vscode.extensions.getExtension("knisterpeter.vscode-webpack")?.isActive
    ).toBeTruthy();
  });

  describe("the runner", () => {
    it("should be running by default", () => {
      expect(runner.isActive).toBeTruthy();
    });

    describe("while triggering builds", () => {
      let doc: vscode.TextDocument;
      const insertAt = new vscode.Position(2, 0);
      const removeFrom = new vscode.Range(insertAt, new vscode.Position(2, 2));

      async function insertComment(): Promise<void> {
        if (doc.getText(removeFrom) !== "//") {
          const edit = new vscode.WorkspaceEdit();
          edit.insert(doc.uri, insertAt, "//");
          await vscode.workspace.applyEdit(edit);
          await doc.save();
        }
      }

      async function removeComment(): Promise<void> {
        if (doc.getText(removeFrom) === "//") {
          const edit = new vscode.WorkspaceEdit();
          edit.delete(doc.uri, removeFrom);
          await vscode.workspace.applyEdit(edit);
          await doc.save();
        }
      }

      before(async () => {
        doc = await vscode.workspace.openTextDocument(
          vscode.Uri.file(
            path.resolve(
              vscode.workspace.workspaceFolders![0].uri.fsPath,
              "src/index.js"
            )
          )
        );
      });

      describe("when breaking and saving a file", () => {
        after(async () => {
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

          return promise;
        });
      });

      describe("when fixing and saving a file", async () => {
        before(async () => {
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

          return promise;
        });
      });
    });

    it("should notify if started", async () => {
      const promise = new Promise((resolve) => {
        runner.onActive((event) => {
          if (event.status === "enabled") {
            resolve();
          }
        });
      });

      await vscode.commands.executeCommand("vscode-webpack.stop");
      await vscode.commands.executeCommand("vscode-webpack.start");

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

      await vscode.commands.executeCommand("vscode-webpack.stop");

      return promise;
    });
  });
});
