import type { PlotTheme, WorkerRequest, WorkerResponse } from "./pyodide-types";

const PYODIDE_VERSION = "314.0.6";
const PYODIDE_INDEX = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

type PyodideAPI = {
  loadPackage: (names: string[]) => Promise<unknown>;
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (options: { batched: (text: string) => void }) => void;
  setStderr: (options: { batched: (text: string) => void }) => void;
};

let pyodide: PyodideAPI | null = null;
let loadPromise: Promise<PyodideAPI> | null = null;
let stdoutBuf = "";
let stderrBuf = "";

function post(msg: WorkerResponse) {
  self.postMessage(msg);
}

/** Frames from inside Pyodide's own runner, which mean nothing to a reader. */
function isInternalFrame(file: string): boolean {
  return file.includes("/_pyodide/") || file.includes("/pyodide/");
}

/**
 * Drop the Pyodide plumbing from the top of a traceback so the first frame a
 * reader sees is their own code.
 */
function trimTraceback(text: string): string {
  if (!text.includes("Traceback (most recent call last)")) return text;
  const lines = text.split("\n");
  const kept: string[] = [];
  let dropping = false;
  for (const line of lines) {
    const frame = /^\s+File "([^"]*)", line /.exec(line);
    if (frame) {
      dropping = isInternalFrame(frame[1]);
      if (!dropping) kept.push(line);
      continue;
    }
    // Source/context lines belong to the frame above them.
    if (dropping && /^\s/.test(line)) continue;
    dropping = false;
    kept.push(line);
  }
  return kept.join("\n");
}

function formatError(err: unknown): string {
  const text = err instanceof Error ? err.message || err.toString() : String(err);
  return trimTraceback(text);
}

/**
 * Only the four hex forms CSS and Matplotlib both accept -- #RGB, #RGBA,
 * #RRGGBB, #RRGGBBAA. Anything else falls back, and the result is interpolated
 * into a Python string literal below, so this doubles as the injection guard.
 */
function hexColor(value: string | undefined, fallback: string): string {
  if (value && /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) {
    return value;
  }
  return fallback;
}

async function loadRuntime(id: number): Promise<PyodideAPI> {
  if (pyodide) return pyodide;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    post({ type: "status", id, status: "loading" });
    const { loadPyodide } = (await import(
      /* @vite-ignore */
      `${PYODIDE_INDEX}pyodide.mjs`
    )) as {
      loadPyodide: (opts?: { indexURL?: string }) => Promise<PyodideAPI>;
    };
    const runtime = await loadPyodide({ indexURL: PYODIDE_INDEX });
    runtime.setStdout({
      batched: (text) => {
        stdoutBuf += text.endsWith("\n") ? text : `${text}\n`;
      },
    });
    runtime.setStderr({
      batched: (text) => {
        stderrBuf += text.endsWith("\n") ? text : `${text}\n`;
      },
    });
    await runtime.loadPackage(["numpy", "matplotlib"]);
    await runtime.runPythonAsync(`
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
_fm_baseline = set(globals().keys()) | {"_fm_baseline"}
`);
    pyodide = runtime;
    post({ type: "status", id, status: "ready" });
    return runtime;
  })();

  try {
    return await loadPromise;
  } catch (err) {
    loadPromise = null;
    throw err;
  }
}

/** Forget everything the reader's code defined, without reloading Pyodide. */
async function resetNamespace(runtime: PyodideAPI) {
  await runtime.runPythonAsync(`
_fm_stale = [k for k in list(globals().keys()) if k not in _fm_baseline]
for _fm_key in _fm_stale:
    globals().pop(_fm_key, None)
globals().pop("_fm_stale", None)
globals().pop("_fm_key", None)
import matplotlib.pyplot as plt
plt.close("all")
`);
}

async function applyTheme(runtime: PyodideAPI, theme?: PlotTheme) {
  if (!theme) return;
  const fg = hexColor(theme.fg, "#1c1915");
  const bg = hexColor(theme.bg, "#f7f3eb");
  const muted = hexColor(theme.muted, "#5e574c");
  const accent = hexColor(theme.accent, "#8a2e2e");
  const rule = hexColor(theme.rule, "#d3c9b6");
  await runtime.runPythonAsync(`
import matplotlib as _mpl
_mpl.rcParams.update({
    "figure.facecolor": "${bg}",
    "axes.facecolor": "${bg}",
    "savefig.facecolor": "${bg}",
    "savefig.edgecolor": "${bg}",
    "text.color": "${fg}",
    "axes.labelcolor": "${fg}",
    "xtick.color": "${fg}",
    "ytick.color": "${fg}",
    "axes.edgecolor": "${rule}",
    "axes.titlecolor": "${fg}",
    "legend.facecolor": "${bg}",
    "legend.edgecolor": "${rule}",
    "grid.color": "${rule}",
    "axes.prop_cycle": _mpl.cycler(color=["${accent}", "${fg}", "${muted}"]),
})
`);
}

async function captureFigures(runtime: PyodideAPI): Promise<string[]> {
  const raw = await runtime.runPythonAsync(`
import json, io, base64
_figures = []
try:
    import matplotlib.pyplot as plt
    for _num in list(plt.get_fignums()):
        _fig = plt.figure(_num)
        _buf = io.BytesIO()
        _fig.savefig(_buf, format="png", dpi=140, bbox_inches="tight")
        _figures.append(base64.b64encode(_buf.getvalue()).decode("ascii"))
    plt.close("all")
except Exception:
    pass
json.dumps(_figures)
`);
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

async function handleRun(id: number, code: string, theme?: PlotTheme) {
  stdoutBuf = "";
  stderrBuf = "";
  let error: string | null = null;
  let figures: string[] = [];
  try {
    const runtime = await loadRuntime(id);
    try {
      await applyTheme(runtime, theme);
    } catch {
      // Cosmetic only -- never fail a reader's run over plot colours.
    }
    stdoutBuf = "";
    stderrBuf = "";
    try {
      const result = await runtime.runPythonAsync(code);
      if (result && typeof result === "object" && "destroy" in result) {
        (result as { destroy: () => void }).destroy();
      }
    } catch (err) {
      error = formatError(err);
    }
    figures = await captureFigures(runtime);
  } catch (err) {
    error =
      formatError(err) ||
      "Failed to load the Python runtime. Check your network connection and try again.";
  }
  post({
    type: "result",
    id,
    stdout: stdoutBuf,
    stderr: stderrBuf,
    figures,
    error,
    ready: pyodide !== null,
  });
}

async function handleReset(id: number) {
  let error: string | null = null;
  // Never pull the runtime down just to reset it.
  if (pyodide) {
    try {
      await resetNamespace(pyodide);
    } catch (err) {
      error = formatError(err);
    }
  }
  post({
    type: "result",
    id,
    stdout: "",
    stderr: "",
    figures: [],
    error,
    ready: pyodide !== null,
  });
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "reset") {
    await handleReset(data.id);
    return;
  }
  if (data.type === "run") {
    await handleRun(data.id, data.code, data.theme);
  }
};
