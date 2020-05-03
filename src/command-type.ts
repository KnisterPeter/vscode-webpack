import type { Serializable } from "child_process";
import type { Stats } from "webpack";

export type Command =
  | {
      command: "log";
      data: Serializable[];
    }
  | {
      command: "log-error";
      data: Serializable[];
    }
  | {
      command: "start";
      cwd: string;
      configFile: string;
    }
  | {
      command: "stop";
    }
  | {
      command: "invalidate";
    }
  | {
      command: "webpack-result-error";
      error: Serializable;
    }
  | {
      command: "webpack-result-stats";
      stats: Stats.ToJsonOutput;
    }
  | {
      command: "webpack-compile";
      progress: number;
      done: boolean;
    };
