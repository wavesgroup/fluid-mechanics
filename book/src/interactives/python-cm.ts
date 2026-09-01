import {
  defaultKeymap,
  history,
  historyKeymap,
  indentLess,
  indentMore,
} from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, highlightActiveLine, keymap } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

const highlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: "var(--astro-code-token-keyword)" },
  { tag: t.controlKeyword, color: "var(--astro-code-token-keyword)" },
  { tag: t.moduleKeyword, color: "var(--astro-code-token-keyword)" },
  { tag: t.operatorKeyword, color: "var(--astro-code-token-keyword)" },
  { tag: t.definitionKeyword, color: "var(--astro-code-token-keyword)" },
  { tag: t.comment, color: "var(--astro-code-token-comment)", fontStyle: "italic" },
  { tag: t.lineComment, color: "var(--astro-code-token-comment)", fontStyle: "italic" },
  { tag: t.string, color: "var(--astro-code-token-string)" },
  { tag: t.special(t.string), color: "var(--astro-code-token-string-expression)" },
  { tag: t.number, color: "var(--astro-code-token-constant)" },
  { tag: t.bool, color: "var(--astro-code-token-constant)" },
  { tag: t.null, color: "var(--astro-code-token-constant)" },
  { tag: t.function(t.variableName), color: "var(--astro-code-token-function)" },
  { tag: t.function(t.propertyName), color: "var(--astro-code-token-function)" },
  { tag: t.definition(t.variableName), color: "var(--astro-code-token-parameter)" },
  { tag: t.variableName, color: "var(--astro-code-foreground)" },
  { tag: t.propertyName, color: "var(--astro-code-foreground)" },
  { tag: t.className, color: "var(--astro-code-token-function)" },
  { tag: t.typeName, color: "var(--astro-code-token-function)" },
  { tag: t.operator, color: "var(--astro-code-token-punctuation)" },
  { tag: t.punctuation, color: "var(--astro-code-token-punctuation)" },
  { tag: t.bracket, color: "var(--astro-code-token-punctuation)" },
  { tag: t.meta, color: "var(--astro-code-token-comment)" },
  { tag: t.self, color: "var(--astro-code-token-keyword)" },
]);

const editorTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--code-bg)",
    color: "var(--fg)",
    fontSize: "0.86rem",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    lineHeight: "1.45",
    minHeight: "16rem",
  },
  ".cm-content": {
    caretColor: "var(--fg)",
    padding: "0.85rem 1rem",
    fontFamily: "var(--font-mono)",
  },
  ".cm-line": {
    padding: "0",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--fg)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "color-mix(in srgb, var(--accent) 22%, transparent)",
  },
  ".cm-activeLine": {
    backgroundColor: "color-mix(in srgb, var(--fg) 5%, transparent)",
  },
  ".cm-gutters": {
    display: "none",
  },
});

/**
 * Tab indents inside the editor, which would otherwise trap keyboard users. Esc
 * releases it so the next Tab moves focus on as usual; any other key re-arms it.
 */
function tabEscapeKeymap() {
  let released = false;
  const keys = [
    {
      key: "Escape",
      run: () => {
        released = true;
        return true;
      },
    },
    {
      key: "Tab",
      run: (view: EditorView) => {
        if (released) {
          released = false;
          return false;
        }
        return indentMore(view);
      },
      shift: (view: EditorView) => {
        if (released) {
          released = false;
          return false;
        }
        return indentLess(view);
      },
    },
  ];
  const rearm = EditorView.domEventHandlers({
    keydown: (event) => {
      if (event.key !== "Tab" && event.key !== "Escape") released = false;
      return false;
    },
  });
  return [keymap.of(keys), rearm];
}

export function createPythonEditor(options: {
  parent: HTMLElement;
  doc: string;
  onChange: (code: string) => void;
  onRun: () => void;
}): EditorView {
  return new EditorView({
    parent: options.parent,
    state: EditorState.create({
      doc: options.doc,
      extensions: [
        python(),
        indentUnit.of("    "),
        EditorState.tabSize.of(4),
        history(),
        highlightActiveLine(),
        syntaxHighlighting(highlightStyle),
        editorTheme,
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              options.onRun();
              return true;
            },
          },
        ]),
        tabEscapeKeymap(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) options.onChange(update.state.doc.toString());
        }),
        EditorView.contentAttributes.of({
          "aria-label": "Python code. Press Escape then Tab to leave the editor.",
        }),
      ],
    }),
  });
}

export function setEditorDoc(view: EditorView, doc: string) {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: doc },
  });
}
