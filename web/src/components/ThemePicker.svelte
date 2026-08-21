<script>
  import { onMount } from "svelte";

  const THEMES = [
    { id: "paper", name: "Paper", swatch: "#f3eee4" },
    { id: "folio", name: "Folio", swatch: "#fbfbf9" },
    { id: "solarized-light", name: "Solarized Light", swatch: "#fdf6e3" },
    { id: "ink", name: "Ink", swatch: "#161310" },
    { id: "nord", name: "Nord", swatch: "#2e3440" },
    { id: "solarized-dark", name: "Solarized Dark", swatch: "#002b36" },
  ];

  let theme = $state("paper");
  let open = $state(false);

  const current = $derived(THEMES.find((t) => t.id === theme) ?? THEMES[0]);

  function apply(next) {
    theme = next;
    document.documentElement.dataset.theme = next;
    localStorage.setItem("fm-theme", next);
    document.documentElement.dispatchEvent(new CustomEvent("themechange", { detail: next }));
    open = false;
  }

  onMount(() => {
    const stored = localStorage.getItem("fm-theme");
    if (stored && THEMES.some((t) => t.id === stored)) {
      theme = stored;
    } else {
      theme = document.documentElement.dataset.theme || "paper";
    }
  });
</script>

<details class="theme-picker" bind:open>
  <summary>
    <span class="swatch" style:background={current.swatch}></span>
    <span>{current.name}</span>
  </summary>
  <div class="theme-menu" role="listbox" aria-label="Color theme">
    {#each THEMES as t}
      <button
        type="button"
        role="option"
        aria-current={t.id === theme}
        onclick={() => apply(t.id)}
      >
        <span class="swatch" style:background={t.swatch}></span>
        {t.name}
      </button>
    {/each}
  </div>
</details>
