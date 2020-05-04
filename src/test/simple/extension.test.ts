import expect from "expect";
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
      expect(runner.isRunning).toBeTruthy();
    });
  });
});
