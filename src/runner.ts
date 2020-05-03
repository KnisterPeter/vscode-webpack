import { ChildProcess, fork } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import type { Stats } from "webpack";
import type { Command } from "./command-type";

export class Runner implements vscode.Disposable {
  private webpack: ChildProcess | undefined;

  public get isRunning(): boolean {
    return this.webpack !== undefined;
  }

  private workingDirectory: string | undefined;

  private configFile: string | undefined;

  private diagnostics: vscode.DiagnosticCollection;

  private channel: vscode.OutputChannel;

  private statusItem: vscode.StatusBarItem;

  constructor({
    workingDirectory,
    configFile,
    diagnostics,
    channel,
    statusItem,
  }: {
    workingDirectory: string | undefined;
    configFile: string;
    diagnostics: vscode.DiagnosticCollection;
    channel: vscode.OutputChannel;
    statusItem: vscode.StatusBarItem;
  }) {
    this.workingDirectory = workingDirectory;
    this.configFile = configFile;
    this.diagnostics = diagnostics;
    this.channel = channel;
    this.statusItem = statusItem;

    this.diagnostics.clear();
  }

  private send(command: Command) {
    this.webpack?.send(command);
  }

  public async start() {
    if (!this.workingDirectory) {
      vscode.window.showErrorMessage(
        "No working directory (defaults to project root)"
      );
      return;
    }
    const workingDirectory = this.workingDirectory;

    if (!this.configFile) {
      vscode.window.showWarningMessage("No webpack configuration file defined");
      return;
    }

    const configFile = path.join(workingDirectory, this.configFile);
    if (!fs.existsSync(configFile)) {
      vscode.window.showWarningMessage(
        "Defined webpack configuration file doesn't exist"
      );
      return;
    }

    if (this.isRunning) {
      return;
    }

    this.webpack = fork(path.join(__dirname, "webpack.js"), [], {
      cwd: workingDirectory,
    });
    this.webpack.on("error", (e) => {
      console.error("error", e);
      this.webpack = undefined;
    });
    this.webpack.on("exit", (code) => {
      console.log("exit", code);
      this.webpack = undefined;
    });

    this.webpack.on("message", (data: Command) => {
      switch (data.command) {
        case "log":
          this.channel.appendLine(data.data.join(" "));
          break;
        case "log-error":
          this.channel.appendLine(data.data.join(" "));
          break;
        case "webpack-result-error":
          vscode.window.showErrorMessage("webpack Error");

          this.channel.appendLine(JSON.stringify(data.error, null, 2));

          this.updateStatusBar("alert");
          break;
        case "webpack-result-stats":
          this.handleStats(data.stats, workingDirectory);
          break;
        case "webpack-compile":
          if (data.done) {
            this.updateStatusBar("repo-sync", data.progress);
          } else {
            this.updateStatusBar("repo-sync~spin", data.progress);
          }
          break;
        default:
          throw new Error(`Unknown command '${data.command}'`);
      }
    });
    this.statusItem.show();
    this.send({
      command: "start",
      cwd: workingDirectory,
      configFile: this.configFile,
    });
  }

  private handleStats(stats: Stats.ToJsonOutput, rootDir: string) {
    this.diagnostics.clear();

    this.channel.appendLine(JSON.stringify(stats, null, 2));

    if (stats.errors.length || stats.warnings.length) {
      const diagnostics = new Map<vscode.Uri, vscode.Diagnostic[]>();

      for (const error of stats.errors) {
        this.channel.appendLine(error);

        const [uri, diagnostic] = this.createDiagnostic(
          vscode.DiagnosticSeverity.Error,
          error,
          rootDir
        );
        if (uri && diagnostic) {
          diagnostics.set(uri, [...(diagnostics.get(uri) ?? []), diagnostic]);
        }
      }
      for (const warning of stats.warnings) {
        this.channel.appendLine(warning);

        const [uri, diagnostic] = this.createDiagnostic(
          vscode.DiagnosticSeverity.Warning,
          warning,
          rootDir
        );
        if (uri && diagnostic) {
          diagnostics.set(uri, [...(diagnostics.get(uri) ?? []), diagnostic]);
        }
      }

      for (const [uri, set] of diagnostics) {
        this.diagnostics.set(uri, set);
      }

      this.updateStatusBar("alert");
    } else {
      this.updateStatusBar("check");
    }
  }

  private createDiagnostic(
    severity: vscode.DiagnosticSeverity,
    input: string,
    rootDir: string
  ): [vscode.Uri, vscode.Diagnostic] | [] {
    const [, file, lineStr, columnStr] =
      input.match(/^([^\s]+)\s(\d+):(\d+)/) ?? [];
    if (file && lineStr && columnStr) {
      const uri = vscode.Uri.file(path.join(rootDir, file));
      const line = parseInt(lineStr, 10) - 1;
      const column = parseInt(columnStr, 10) - 1;
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

  private updateStatusBar(icon: string, percentage?: number) {
    this.statusItem.text = `$(${icon}) ${
      percentage ? `${percentage}% ` : ""
    }webpack`;
  }

  public invalidate() {
    this.diagnostics.clear();
    this.send({
      command: "invalidate",
    });
  }

  public async stop() {
    this.diagnostics.clear();
    this.send({ command: "stop" });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.statusItem.hide();

    if (this.webpack) {
      this.webpack.kill();
      this.webpack = undefined;
    }
  }

  public dispose() {
    console.log(`Stop webpack runner`);
    this.stop();
  }
}
