import expect from "expect";
import { sep } from "path";
import * as vscode from "vscode";
import { createDiagnostic } from "../../diagnostics";

function normalize(input: string): string {
  return input.replace(/\//g, sep);
}

function position(l: number, c: number): vscode.Position {
  return new vscode.Position(l, c);
}

function range(sl: number, sc: number, el: number, ec: number): vscode.Range {
  return new vscode.Range(position(sl, sc), position(el, ec));
}

describe("createDiagnostic", () => {
  it("should create an error with line and column", () => {
    const [uri, diagnostic] = createDiagnostic(
      vscode.DiagnosticSeverity.Error,
      `src/index.js 5:8
some error description
`,
      "/root"
    );

    expect(uri?.fsPath).toBe(normalize("/root/src/index.js"));
    expect(diagnostic).toEqual(
      expect.objectContaining({
        severity: vscode.DiagnosticSeverity.Error,
        source: "webpack",
        range: range(4, 7, 4, 8),
        message: `some error description\n`,
      })
    );
  });

  it("should create an error without line and column", () => {
    const [uri, diagnostic] = createDiagnostic(
      vscode.DiagnosticSeverity.Error,
      `src/index.js
some error description
      `,
      "/root"
    );

    expect(uri?.fsPath).toBe(normalize("/root/src/index.js"));
    expect(diagnostic).toEqual(
      expect.objectContaining({
        severity: vscode.DiagnosticSeverity.Error,
        source: "webpack",
        range: range(0, 0, 0, 1),
        message: `some error description
      `,
      })
    );
  });
});
