import type {
  PlotTheme,
  RunResult,
  WorkerRequest,
  WorkerResponse,
  WorkerStatus,
} from "./pyodide-types";

export type RuntimePhase = "idle" | WorkerStatus | "running";

type Pending = {
  resolve: (value: RunResult) => void;
  reject: (reason: unknown) => void;
};

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();
const statusListeners = new Set<(phase: RuntimePhase) => void>();
let phase: RuntimePhase = "idle";
let queue: Promise<unknown> = Promise.resolve();

function setPhase(next: RuntimePhase) {
  if (phase === next) return;
  phase = next;
  for (const listener of statusListeners) listener(phase);
}

export function getRuntimePhase(): RuntimePhase {
  return phase;
}

export function onRuntimePhase(listener: (phase: RuntimePhase) => void): () => void {
  statusListeners.add(listener);
  listener(phase);
  return () => {
    statusListeners.delete(listener);
  };
}

function onWorkerMessage(event: MessageEvent<WorkerResponse>) {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "status") {
    if (data.status === "loading" && phase !== "running") setPhase("loading");
    if (data.status === "ready" && phase === "loading") setPhase("running");
    return;
  }
  if (data.type === "result") {
    const waiter = pending.get(data.id);
    if (!waiter) return;
    pending.delete(data.id);
    waiter.resolve({
      stdout: data.stdout,
      stderr: data.stderr,
      figures: data.figures,
      error: data.error,
      ready: data.ready,
    });
  }
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./pyodide-worker.ts", import.meta.url), {
    type: "module",
  });
  worker.addEventListener("message", onWorkerMessage);
  worker.addEventListener("error", (event) => {
    const message = event.message || "The Python runtime worker failed.";
    for (const [id, waiter] of pending) {
      pending.delete(id);
      waiter.resolve({
        stdout: "",
        stderr: "",
        figures: [],
        error: message,
        ready: false,
      });
    }
    worker = null;
    setPhase("idle");
  });
  return worker;
}

function request(msg: Omit<WorkerRequest, "id">): Promise<RunResult> {
  const id = nextId++;
  const body = { ...msg, id } as WorkerRequest;
  return new Promise<RunResult>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage(body);
  });
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function ensureRuntime(): Promise<RunResult> {
  return enqueue(async () => {
    if (phase === "ready") {
      return { stdout: "", stderr: "", figures: [], error: null, ready: true };
    }
    setPhase("loading");
    const result = await request({ type: "init" });
    setPhase(result.ready ? "ready" : "idle");
    return result;
  });
}

export function runPython(code: string, theme?: PlotTheme): Promise<RunResult> {
  return enqueue(async () => {
    setPhase(phase === "ready" ? "running" : "loading");
    const result = await request({ type: "run", code, theme });
    setPhase(result.ready ? "ready" : "idle");
    return result;
  });
}
