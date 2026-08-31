export type PlotTheme = {
  fg: string;
  bg: string;
  muted: string;
  accent: string;
  rule: string;
};

export type WorkerRequest =
  | { type: "reset"; id: number }
  | { type: "run"; id: number; code: string; theme?: PlotTheme };

export type WorkerStatus = "loading" | "ready";

export type WorkerResponse =
  | { type: "status"; id: number; status: WorkerStatus }
  | {
      type: "result";
      id: number;
      stdout: string;
      stderr: string;
      figures: string[];
      error: string | null;
      ready: boolean;
    };

export type RunResult = {
  stdout: string;
  stderr: string;
  figures: string[];
  error: string | null;
  ready: boolean;
  /** True when the run was cut short by Stop rather than finishing on its own. */
  stopped?: boolean;
};
