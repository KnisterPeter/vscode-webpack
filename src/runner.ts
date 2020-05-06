import { ChildProcess, fork } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import type { Stats } from "webpack";
import type { Command } from "./command-type";
import { createDiagnostic } from "./diagnostics";

export type RunnerBuildStatus = "idle" | "running" | "success" | "failure";

/**
 * @param current The current value
 * @param next The new value (or in case of undefined its counted as unchanged)
 */
function changed<T>(current: T, next: T): boolean {
  return next !== undefined && current !== next;
}

export class Runner implements vscode.Disposable {
  private activeEmitter = new vscode.EventEmitter<{
    status: "enabled" | "disabled";
  }>();

  public readonly onActive = this.activeEmitter.event;

  private progressBuildEmitter = new vscode.EventEmitter<{
    status: RunnerBuildStatus;
    progress?: number;
  }>();

  public readonly onProgressBuild = this.progressBuildEmitter.event;

  private webpack: ChildProcess | undefined;

  public get isActive(): boolean {
    return this.webpack !== undefined;
  }

  private workingDirectory: string | undefined;

  private configFile: string | undefined;

  private diagnostics!: vscode.DiagnosticCollection;

  private channel!: vscode.OutputChannel;

  public async configure({
    workingDirectory,
    configFile,
    diagnostics,
    channel,
  }: {
    workingDirectory?: string | undefined;
    configFile?: string;
    diagnostics?: vscode.DiagnosticCollection;
    channel?: vscode.OutputChannel;
  }) {
    if (
      !changed(this.workingDirectory, workingDirectory) &&
      !changed(this.configFile, configFile) &&
      !changed(this.diagnostics, diagnostics) &&
      !changed(this.channel, channel)
    ) {
      return;
    }

    this.workingDirectory =
      workingDirectory === null
        ? undefined
        : workingDirectory ?? this.workingDirectory;
    this.configFile =
      configFile === null ? undefined : configFile ?? this.configFile;
    this.diagnostics = diagnostics ?? this.diagnostics;
    this.channel = channel ?? this.channel;

    this.diagnostics.clear();

    if (this.isActive) {
      await this.stop();
      await this.start();
    }
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
        `Defined webpack configuration file '${vscode.workspace.asRelativePath(
          configFile
        )}' doesn't exist`
      );
      return;
    }

    if (this.isActive) {
      return;
    }

    this.webpack = fork(path.join(__dirname, "webpack.js"), [], {
      cwd: workingDirectory,
    });
    this.webpack.on("error", (e) => {
      vscode.window.showErrorMessage(`webpack error: '${e.message}'`);
      this.webpack = undefined;
    });
    this.webpack.on("exit", (code) => {
      if (code && code > 0) {
        vscode.window.showErrorMessage(
          `webpack terminated unexpected with code: ${code}`
        );
      }
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

          this.progressBuildEmitter.fire({
            status: "failure",
          });
          break;
        case "webpack-result-stats":
          this.handleStats(data.stats, workingDirectory);
          break;
        case "webpack-compile":
          this.progressBuildEmitter.fire({
            status: "running",
            progress: data.progress,
          });
          break;
        default:
          throw new Error(`Unknown command '${data.command}'`);
      }
    });

    this.send({
      command: "start",
      cwd: workingDirectory,
      configFile: this.configFile,
    });

    this.activeEmitter.fire({ status: "enabled" });
  }

  private handleStats(stats: Stats.ToJsonOutput, rootDir: string) {
    this.diagnostics.clear();

    this.channel.appendLine(JSON.stringify(stats, null, 2));

    if (stats.errors.length || stats.warnings.length) {
      const diagnostics = new Map<vscode.Uri, vscode.Diagnostic[]>();

      for (const error of stats.errors) {
        this.channel.appendLine(error);

        const [uri, diagnostic] = createDiagnostic(
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

        const [uri, diagnostic] = createDiagnostic(
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

      this.progressBuildEmitter.fire({
        status: "failure",
      });
    } else {
      this.progressBuildEmitter.fire({
        status: "success",
      });
    }
  }

  public invalidate() {
    this.diagnostics.clear();
    this.send({
      command: "invalidate",
    });
  }

  public stop() {
    this.diagnostics.clear();
    this.send({ command: "stop" });

    if (this.webpack) {
      this.webpack.kill();
      this.webpack = undefined;
    }

    this.activeEmitter.fire({ status: "disabled" });
  }

  public dispose() {
    console.log(`Stop webpack runner`);
    this.stop();
  }
}
