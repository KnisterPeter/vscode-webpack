import * as path from "path";
import * as vscode from "vscode";

export function createDiagnostic(
  severity: vscode.DiagnosticSeverity,
  input: string,
  rootDir: string
): [vscode.Uri, vscode.Diagnostic] | [] {
  const match = getDiagnosticMatch(input);
  if (match) {
    const { file, line: lineStr, column: columnStr, error } = match;

    const uri = vscode.Uri.file(
      path.isAbsolute(file) ? file : path.join(rootDir, file)
    );
    const line = lineStr ? parseInt(lineStr, 10) - 1 : 0;
    const column = columnStr ? parseInt(columnStr, 10) - 1 : 0;

    const start = new vscode.Position(line, column);
    const end = new vscode.Position(line, column + 1);

    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(start, end),
      error,
      severity
    );
    diagnostic.source = "webpack";

    return [uri, diagnostic];
  }
  return [];
}

interface DiagnosticMatch {
  file: string;
  line?: string;
  column?: string;
  error: string;
}

const TS_LOADER = /\[tsl\]\s+.*?\s+in\s+(?<file>[^(]+)\((?<line>\d+),(?<column>\d+)\)\n(?<error>.*)/ms;
const WEBPACK = /(?<file>[^\s]+)(?:\s+(?<line>\d+):(?<column>\d+))?\n(?<error>.*)/ms;

function getDiagnosticMatch(input: string): DiagnosticMatch | undefined {
  const expressions = [TS_LOADER, WEBPACK];
  for (const expression of expressions) {
    const match = input.match(expression);
    if (match) {
      // note: we cast here to undefined since we know it matched
      // and that the groups are existing
      return match.groups as undefined;
    }
  }
  return undefined;
}
