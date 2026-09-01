<script lang="ts">
  import { onMount } from "svelte";
  import type { EditorView } from "@codemirror/view";
  import {
    onRuntimePhase,
    resetPython,
    runPython,
    stopRuntime,
    type RuntimePhase,
  } from "./pyodide-client";
  import { createPythonEditor, setEditorDoc } from "./python-cm";
  import { onThemeChange, readTheme } from "./plot";
  import type { RunResult } from "./pyodide-types";

  let { starter = "" }: { starter?: string } = $props();

  const DEFAULT_STARTER = `import numpy as np
import matplotlib.pyplot as plt
`;

  function normalizeStarter(value: string) {
    const text = value.trimEnd() || DEFAULT_STARTER.trimEnd();
    return text.endsWith("\n") ? text : `${text}\n`;
  }

  // Mirrors the editor document, which is the real source of truth. Nothing in
  // the markup reads it, so it stays a plain local rather than reactive state;
  // it is seeded from `starter` on mount rather than here, because reading a
  // prop at the top level captures only its initial value.
  let code = "";
  let phase = $state<RuntimePhase>("idle");
  let busy = $state(false);
  let result = $state<RunResult | null>(null);
  let staleFigures = $state(false);
  let editorHost: HTMLDivElement | undefined;
  let view: EditorView | undefined;

  const statusText = $derived.by(() => {
    if (busy && (phase === "loading" || phase === "idle")) {
      return "Loading Python (NumPy, Matplotlib)… first run may take a moment.";
    }
    if (busy && phase === "running") return "Running… press Stop to interrupt.";
    if (result?.stopped) {
      return "Stopped. The Python session was discarded; the next run starts a fresh one.";
    }
    if (result?.error && !result.ready) return "Could not load the Python runtime.";
    if (phase === "idle") {
      return "Press Run to start. The first run downloads Python, NumPy, and Matplotlib (needs a network connection).";
    }
    return "Python is ready. Press Run or Ctrl/⌘+Enter.";
  });

  async function reset() {
    if (busy) return;
    const next = normalizeStarter(starter);
    code = next;
    result = null;
    staleFigures = false;
    if (view) setEditorDoc(view, next);
    // Names and figures from earlier runs would otherwise survive the reset.
    busy = true;
    try {
      await resetPython();
    } finally {
      busy = false;
    }
  }

  function stop() {
    stopRuntime();
  }

  async function run() {
    if (busy) return;
    busy = true;
    result = null;
    staleFigures = false;
    const source = view?.state.doc.toString() ?? code;
    code = source;
    try {
      result = await runPython(source, readTheme());
    } catch (err) {
      result = {
        stdout: "",
        stderr: "",
        figures: [],
        error: err instanceof Error ? err.message : String(err),
        ready: phase === "ready",
      };
    } finally {
      busy = false;
    }
  }

  onMount(() => {
    code = normalizeStarter(starter);
    if (editorHost) {
      view = createPythonEditor({
        parent: editorHost,
        doc: code,
        onChange: (next) => {
          code = next;
        },
        onRun: () => {
          void run();
        },
      });
    }
    const stopPhase = onRuntimePhase((next) => {
      phase = next;
    });
    // Figures are PNGs baked with the colours of the theme that was active when
    // they were drawn, so a theme switch leaves them behind.
    const stopTheme = onThemeChange(() => {
      if (result?.figures?.length) staleFigures = true;
    });
    return () => {
      stopPhase();
      stopTheme();
      view?.destroy();
      view = undefined;
    };
  });
</script>

<div class="interactive python-playground">
  <p class="interactive-title">Python</p>
  <p class="interactive-caption">
    NumPy and Matplotlib run in the browser. Use this editor for the programming
    exercises above. First run downloads the runtime and needs a network connection.
  </p>
  <div bind:this={editorHost} class="python-editor"></div>
  <div class="python-toolbar">
    <button type="button" onclick={() => void run()} disabled={busy}>Run</button>
    <button type="button" onclick={stop} disabled={!busy}>Stop</button>
    <button type="button" onclick={() => void reset()} disabled={busy}>Reset</button>
    <p class="python-status" aria-live="polite">{statusText}</p>
  </div>
  {#if result?.stdout}
    <pre class="python-output">{result.stdout}</pre>
  {/if}
  {#if result?.stderr}
    <pre class="python-output python-stderr">{result.stderr}</pre>
  {/if}
  {#if result?.error}
    <pre class="python-output python-error">{result.error}</pre>
  {/if}
  {#if result?.figures?.length}
    {#if staleFigures}
      <p class="python-note">
        These figures were drawn in the previous theme. Run again to redraw them.
      </p>
    {/if}
    <div class="python-figures" class:is-stale={staleFigures}>
      {#each result.figures as src, i}
        <img src="data:image/png;base64,{src}" alt="Matplotlib figure {i + 1}" />
      {/each}
    </div>
  {/if}
</div>
