import * as path from "path";
import * as vscode from "vscode";

export function createDiagnostic(
  severity: vscode.DiagnosticSeverity,
  input: string,
  rootDir: string
): [vscode.Uri, vscode.Diagnostic] | [] {
  const [, file, lineStr, columnStr] =
    input.match(/^([^\s]+)(?:\s(\d+):(\d+))?/) ?? [];
  if (file) {
    const uri = vscode.Uri.file(path.join(rootDir, file));
    const line = lineStr ? parseInt(lineStr, 10) - 1 : 0;
    const column = columnStr ? parseInt(columnStr, 10) - 1 : 0;
    const start = new vscode.Position(line, column);
    const end = new vscode.Position(line, column + 1);

    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(start, end),
      input.split("\n").slice(1).join("\n"),
      severity
    );
    diagnostic.source = "webpack";

    return [uri, diagnostic];
  }
  return [];
}
