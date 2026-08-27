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

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message || err.toString();
  return String(err);
}

function hexColor(value: string | undefined, fallback: string): string {
  if (value && /^#[0-9a-fA-F]{3,8}$/.test(value)) return value;
  return fallback;
}

async function loadRuntime(id: number): Promise<PyodideAPI> {
  if (pyodide) return pyodide;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    post({ type: "status", id, status: "loading" });
    const { loadPyodide } = (await import(
      /* @vite-ignore */
      "https://cdn.jsdelivr.net/pyodide/v314.0.6/full/pyodide.mjs"
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
    await applyTheme(runtime, theme);
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

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "init") {
    try {
      await loadRuntime(data.id);
      post({
        type: "result",
        id: data.id,
        stdout: "",
        stderr: "",
        figures: [],
        error: null,
        ready: true,
      });
    } catch (err) {
      post({
        type: "result",
        id: data.id,
        stdout: "",
        stderr: "",
        figures: [],
        error:
          formatError(err) ||
          "Failed to load the Python runtime. Check your network connection and try again.",
        ready: false,
      });
    }
    return;
  }
  if (data.type === "run") {
    await handleRun(data.id, data.code, data.theme);
  }
};
