#!/usr/bin/env node

import * as path from "path";
import "source-map-support/register";
import type * as webpack from "webpack";
import type { Command } from "./command-type";

// don't terminate script
process.stdin.resume();

function send(command: Command) {
  process.send?.(command);
}

console.log = function (...data) {
  send({
    command: "log",
    data,
  });
};

console.error = function (...data) {
  send({
    command: "log-error",
    data,
  });
};

let watching: webpack.Compiler.Watching | undefined;

async function startWebpack({
  cwd,
  configFile,
}: {
  cwd: string;
  configFile: string;
}) {
  try {
    // note: we use require here to import the workspace webpack version
    const webpackPath = require.resolve("webpack", { paths: [cwd] });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const webpack = require(webpackPath);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config: webpack.Configuration = require(path.join(cwd, configFile));

    config.mode = "development";
    config.plugins = config.plugins ?? [];
    config.plugins.push(
      new webpack.ProgressPlugin((percentage: number) => {
        send({
          command: "webpack-compile",
          progress: Math.floor(percentage * 100),
          done: false,
        });
      }),
      new (class VscodeWebpackPlugin {
        apply(compiler: webpack.Compiler): void {
          compiler.hooks.watchRun.tap("VscodeWebpackPlugin", () => {
            send({
              command: "webpack-compile",
              progress: 0,
              done: false,
            });
          });
          compiler.hooks.done.tap("VscodeWebpackPlugin", () => {
            send({
              command: "webpack-compile",
              progress: 100,
              done: true,
            });
          });
        }
      })()
    );

    const compiler: webpack.Compiler = webpack(config);
    watching = compiler.watch({}, (error, stats) => {
      if (error) {
        send({
          command: "webpack-result-error",
          error: error,
        });
      }
      send({
        command: "webpack-result-stats",
        stats: stats.toJson({ all: false, errors: true, warnings: true }, true),
      });
    });
  } catch (e) {
    console.error(e.message, e.stack);
  }
}

function invalidate() {
  watching?.invalidate();
}

function stopWebpack() {
  if (watching) {
    watching.close(() => {
      watching = undefined;
    });
  }
}

process.on("message", (data: Command) => {
  switch (data.command) {
    case "log":
      // no need to log in the forked process
      return;
    case "start":
      startWebpack(data);
      break;
    case "invalidate":
      invalidate();
      break;
    case "stop":
      stopWebpack();
      break;
    default:
      console.log(data, typeof data);
  }
});
