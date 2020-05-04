import expect from "expect";
import * as vscode from "vscode";

describe("Extension Test with empty workspace", () => {
  it("should be disabled by default", () => {
    expect(
      vscode.extensions.getExtension("knisterpeter.vscode-webpack")?.isActive
    ).toBeFalsy();
  });
});
