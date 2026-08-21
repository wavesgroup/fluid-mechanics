#!/usr/bin/env python3
"""Convert fluid-mechanics-book.tex into Markdown chapters for the web book."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TEX_PATH = ROOT / "fluid-mechanics-book.tex"
BIB_PATH = ROOT / "references.bib"
ASSETS = ROOT / "assets"
OUT_CHAPTERS = ROOT / "web" / "src" / "chapters"
OUT_DATA = ROOT / "web" / "src" / "data"
OUT_FIGURES = ROOT / "web" / "public" / "figures"
OUT_PUBLIC = ROOT / "web" / "public"

SLUGS = {
    "Preface": "preface",
    "Introduction": "introduction",
    "Review of vector calculus": "vector-calculus",
    "Fluid kinematics": "kinematics",
    "Conservation of mass and momentum": "conservation",
    "Rotating flows": "rotation",
    "Stratified flows": "stratification",
    "Shallow water systems": "shallow-water",
    "Turbulence": "turbulence",
    "Boundary layers": "boundary-layers",
    "Surface gravity waves": "waves",
    "Quick reference": "quick-reference",
    "Definition of symbols": "symbols",
}

INTERACTIVES_AFTER = {
    "fig:static_instability_oscillation": "parcel-oscillation",
    "fig:channel_flow_laminar_u": "channel-flow",
    "fig:wave_dispersion": "wave-dispersion",
}

DROP_CMDS = {
    "newpage",
    "clearpage",
    "centering",
    "noindent",
    "maketitle",
    "tableofcontents",
    "printindex",
    "appendix",
    "hfill",
    "vfill",
    "large",
    "Large",
    "LARGE",
    "small",
    "footnotesize",
    "normalsize",
    "sloppy",
    "fussy",
    "leavevmode",
}

DROP_CMDS_WITH_ARG = {
    "vspace",
    "hspace",
    "thispagestyle",
    "renewcommand",
    "setcounter",
    "bibliographystyle",
    "bibliography",
    "hypersetup",
    "pagenumbering",
    "enlargethispage",
}


def read_brace(s: str, i: int) -> tuple[str, int]:
    if i >= len(s) or s[i] != "{":
        raise ValueError(f"expected '{{' at {i}: {s[i : i + 40]!r}")
    depth = 0
    j = i
    while j < len(s):
        c = s[j]
        if c == "\\" and j + 1 < len(s):
            j += 2
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return s[i + 1 : j], j + 1
        j += 1
    raise ValueError("unmatched brace")


def read_bracket(s: str, i: int) -> tuple[str, int]:
    if i >= len(s) or s[i] != "[":
        raise ValueError("expected '['")
    depth = 0
    j = i
    while j < len(s):
        c = s[j]
        if c == "\\" and j + 1 < len(s):
            j += 2
            continue
        if c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                return s[i + 1 : j], j + 1
        j += 1
    raise ValueError("unmatched bracket")


def skip_ws(s: str, i: int) -> int:
    while i < len(s) and s[i] in " \t":
        i += 1
    return i


def parse_command(s: str, i: int) -> tuple[str, bool, str | None, list[str], int]:
    assert s[i] == "\\"
    j = i + 1
    if j < len(s) and s[j].isalpha():
        while j < len(s) and s[j].isalpha():
            j += 1
        name = s[i + 1 : j]
    else:
        name = s[j] if j < len(s) else ""
        j += 1
    starred = False
    if j < len(s) and s[j] == "*":
        starred = True
        j += 1
    j = skip_ws(s, j)
    opt = None
    if j < len(s) and s[j] == "[":
        opt, j = read_bracket(s, j)
        j = skip_ws(s, j)
    args: list[str] = []
    while j < len(s) and s[j] == "{":
        arg, j = read_brace(s, j)
        args.append(arg)
        if name != "href":
            break
        peeked = skip_ws(s, j)
        if peeked < len(s) and s[peeked] == "{":
            j = peeked
            continue
        break
    return name, starred, opt, args, j


def find_env_end(s: str, env: str, start: int) -> tuple[str, int]:
    open_pat = f"\\begin{{{env}}}"
    close_pat = f"\\end{{{env}}}"
    depth = 1
    i = start
    while i < len(s):
        if s.startswith(open_pat, i):
            depth += 1
            i += len(open_pat)
            continue
        if s.startswith(close_pat, i):
            depth -= 1
            if depth == 0:
                return s[start:i], i + len(close_pat)
            i += len(close_pat)
            continue
        i += 1
    raise ValueError(f"unclosed environment {env}")


def strip_comments(text: str) -> str:
    out: list[str] = []
    i = 0
    n = len(text)
    while i < n:
        if text[i] == "%" and (i == 0 or text[i - 1] != "\\"):
            while i < n and text[i] != "\n":
                i += 1
        else:
            out.append(text[i])
            i += 1
    return "".join(out)


def protect_minted(text: str) -> tuple[str, list[tuple[str, str]]]:
    blocks: list[tuple[str, str]] = []

    def repl(m: re.Match[str]) -> str:
        blocks.append((m.group("lang"), m.group("code")))
        return f"<<<MINTED{len(blocks) - 1}>>>"

    pattern = re.compile(
        r"\\begin\{minted\}(?:\[[^\]]*\])?\{(?P<lang>\w+)\}(?P<code>.*?)\\end\{minted\}",
        re.DOTALL,
    )
    return pattern.sub(repl, text), blocks


def latex_unescape_text(s: str) -> str:
    s = s.replace("~", "\u00a0")
    s = s.replace("---", "—")
    s = s.replace("--", "–")
    s = s.replace("``", "“")
    s = s.replace("''", "”")
    s = s.replace("\\,", "\u202f")
    s = s.replace("\\;", " ")
    s = s.replace("\\:", " ")
    s = s.replace("\\%", "%")
    s = s.replace("\\&", "&")
    s = s.replace("\\_", "_")
    s = s.replace("\\#", "#")
    s = s.replace("\\$", "$")
    s = s.replace("\\{", "{")
    s = s.replace("\\}", "}")
    return s


def latex_to_plain(s: str) -> str:
    s = re.sub(r"\\[\"'`^~=.]\{([A-Za-z])\}", r"\1", s)
    s = s.replace('\\"o', "ö").replace('\\"O', "Ö")
    s = s.replace('\\"u', "ü").replace('\\"U', "Ü")
    s = s.replace("\\'e", "é")
    s = re.sub(r"\{([^{}]+)\}", r"\1", s)
    return s.strip()


def slugify(text: str) -> str:
    text = re.sub(r"\$[^$]*\$", lambda m: re.sub(r"[\\{}_^]", "", m.group(0)), text)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    text = re.sub(r"[-\s]+", "-", text).strip("-")
    return text


def web_figure_name(path: str) -> str:
    name = Path(path).name
    if name.lower().endswith(".pdf"):
        return name[:-4] + ".svg"
    return name


class Converter:
    def __init__(self) -> None:
        self.index_terms: list[dict] = []
        self.slug = ""
        self.heading_id = ""
        self.minted: list[tuple[str, str]] = []

    def convert_inline(self, s: str) -> str:
        out: list[str] = []
        text_buf: list[str] = []

        def flush_text() -> None:
            if text_buf:
                out.append(latex_unescape_text("".join(text_buf)))
                text_buf.clear()

        i = 0
        n = len(s)
        while i < n:
            if s.startswith("<<<MINTED", i):
                m = re.match(r"<<<MINTED(\d+)>>>", s[i:])
                assert m
                flush_text()
                idx = int(m.group(1))
                lang, code = self.minted[idx]
                code = code.strip("\n")
                out.append(f"\n\n```{lang}\n{code}\n```\n\n")
                i += m.end()
                continue
            if s[i] == "$":
                flush_text()
                math, j = self._read_math(s, i)
                out.append(math)
                i = j
                continue
            if s.startswith("\\\\", i):
                flush_text()
                out.append("\n")
                i += 2
                continue
            if s[i] != "\\":
                text_buf.append(s[i])
                i += 1
                continue
            name, starred, opt, args, j = parse_command(s, i)
            replacement, consumed = self._handle_command(
                name, starred, opt, args, s, i, j
            )
            flush_text()
            out.append(replacement)
            i = consumed if consumed is not None else j
        flush_text()
        return "".join(out)

    def _read_math(self, s: str, i: int) -> tuple[str, int]:
        if s.startswith("$$", i):
            k = s.find("$$", i + 2)
            if k < 0:
                return s[i:], len(s)
            return s[i : k + 2], k + 2
        j = i + 1
        while j < len(s):
            if s[j] == "\\" and j + 1 < len(s):
                j += 2
                continue
            if s[j] == "$":
                return s[i : j + 1], j + 1
            j += 1
        return s[i:], len(s)

    def _handle_command(
        self,
        name: str,
        starred: bool,
        opt: str | None,
        args: list[str],
        s: str,
        i: int,
        j: int,
    ) -> tuple[str, int | None]:
        if name in DROP_CMDS:
            return "", None
        if name in DROP_CMDS_WITH_ARG:
            if not args and j < len(s) and s[j] == "{":
                _, j2 = read_brace(s, j)
                return "", j2
            return "", None
        if name == "begin":
            env = args[0] if args else ""
            k = j
            if k < len(s) and s[k] == "[":
                _, k = read_bracket(s, k)
            body, end = find_env_end(s, env, k)
            return self._convert_env(env, body, opt), end
        if name == "end":
            return "", None
        if name in {"textbf"} and args:
            return f"<strong>{self.convert_inline(args[0])}</strong>", None
        if name in {"textit", "emph", "textsl"} and args:
            inner = self.convert_inline(args[0])
            return f"<em>{inner}</em>", None
        if name == "texttt" and args:
            return f"`{args[0]}`", None
        if name == "underline" and args:
            return f"<u>{self.convert_inline(args[0])}</u>", None
        if name == "url" and args:
            return f"[{args[0]}]({args[0]})", None
        if name == "href" and len(args) >= 2:
            return f"[{self.convert_inline(args[1])}]({args[0]})", None
        if name in {"citep", "citet", "cite"}:
            keys = args[0] if args else ""
            keys = re.sub(r"\s+", " ", keys).strip()
            mode = "narrative" if name == "citet" else "paren"
            return f'<cite data-keys="{keys}" data-mode="{mode}"></cite>', None
        if name in {"ref", "eqref"}:
            key = args[0].strip() if args else ""
            kind = "eq" if name == "eqref" or key.startswith("eq:") else "ref"
            cls = "eqref" if kind == "eq" or key.startswith("eq:") else "ref"
            return f'<a class="{cls}" data-key="{key}"></a>', None
        if name == "index" and args:
            term = args[0]
            parts = term.split("!", 1)
            self.index_terms.append(
                {
                    "term": parts[0],
                    "sub": parts[1] if len(parts) > 1 else None,
                    "slug": self.slug,
                    "anchor": self.heading_id,
                }
            )
            return "", None
        if name == "label" and args:
            # leftover labels (section labels handled separately)
            return "", None
        if name == "includegraphics":
            return "", None
        if name == "caption":
            return self.convert_inline(args[0]) if args else "", None
        if name in {"quad", "qquad", " "} or name == ",":
            return " ", None
        if name == "S":
            return "§", None
        if name == "\\":
            return "\n", None
        if name in {"item"}:
            return "", None
        if name in {"hline", "toprule", "midrule", "bottomrule"}:
            return "", None
        if name == "multicolumn" and len(args) >= 3:
            return self.convert_inline(args[-1]), None
        if name == "text" and args:
            return args[0], None
        # unknown: keep argument text if present
        if args:
            return self.convert_inline(args[0]), None
        if len(name) == 1:
            return "\\" + name, None
        return "", None

    def _convert_env(self, env: str, body: str, opt: str | None) -> str:
        env = env.strip()
        if env == "equation":
            return self._convert_equation(body)
        if env == "figure":
            return self._convert_figure(body)
        if env == "listing":
            return self._convert_listing(body)
        if env in {"enumerate", "itemize"}:
            return self._convert_list(env, body)
        if env == "table":
            return self._convert_table(body)
        if env == "tabular":
            return self._convert_tabular(body)
        if env in {"center", "quotation", "quote", "minipage"}:
            return self.convert_body(body)
        if env == "titlepage":
            return ""
        if env == "split":
            return body
        if env == "document":
            return self.convert_body(body)
        return self.convert_body(body)

    def _convert_equation(self, body: str) -> str:
        labels = re.findall(r"\\label\{([^}]+)\}", body)
        math = re.sub(r"\\label\{[^}]+\}", "", body)
        math = math.strip()
        math = re.sub(r"\n[ \t]+", "\n", math)
        id_attr = f' id="{labels[0]}"' if labels else ""
        return (
            f'\n\n<div class="display-math"{id_attr}>\n\n$$\n{math}\n$$\n\n</div>\n\n'
        )

    def _convert_figure(self, body: str) -> str:
        img = re.search(r"\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}", body)
        cap_m = re.search(r"\\caption\{", body)
        label_m = re.search(r"\\label\{([^}]+)\}", body)
        caption = ""
        if cap_m:
            cap, _ = read_brace(body, cap_m.end() - 1)
            caption = self.convert_inline(cap).strip()
            caption = re.sub(r"\s+", " ", caption)
        src = ""
        if img:
            src = "/figures/" + web_figure_name(img.group(1))
        label = label_m.group(1) if label_m else ""
        id_attr = f' id="{label}"' if label else ""
        alt = re.sub(r"\$.*?\$", "", caption)
        alt = re.sub(r"<[^>]+>", "", alt)
        alt = re.sub(r"\s+", " ", alt).strip()[:120] if caption else "Figure"
        html = (
            f'\n\n<figure class="book-figure"{id_attr}>\n'
            f'  <img src="{src}" alt="{alt.replace(chr(34), "")}" />\n'
            f"  <figcaption>\n\n{caption}\n\n  </figcaption>\n"
            f"</figure>\n"
        )
        extra = ""
        if label in INTERACTIVES_AFTER:
            name = INTERACTIVES_AFTER[label]
            extra = (
                f'\n\n<div class="interactive-slot" data-interactive="{name}"></div>\n'
            )
        return html + extra + "\n"

    def _convert_listing(self, body: str) -> str:
        labels = re.findall(r"\\label\{([^}]+)\}", body)
        inner = re.sub(r"\\label\{[^}]+\}", "", body)
        inner = self.convert_body(inner).strip()
        id_attr = f' id="{labels[0]}"' if labels else ""
        return f'\n\n<figure class="book-listing"{id_attr}>\n\n{inner}\n\n</figure>\n\n'

    def _convert_list(self, env: str, body: str) -> str:
        parts = re.split(r"\\item\b", body)
        items = [p.strip() for p in parts[1:] if p.strip()]
        chunks: list[str] = []
        for i, item in enumerate(items, 1):
            content = self.convert_body(item).strip()
            prefix = f"{i}. " if env == "enumerate" else "- "
            lines = content.split("\n")
            out = prefix + lines[0]
            rest = "\n".join(("    " + ln if ln else "") for ln in lines[1:])
            if rest.strip():
                out += "\n" + rest
            chunks.append(out)
        return "\n\n" + "\n\n".join(chunks) + "\n\n"

    def _convert_table(self, body: str) -> str:
        cap_m = re.search(r"\\caption\{", body)
        caption = ""
        if cap_m:
            cap, _ = read_brace(body, cap_m.end() - 1)
            caption = self.convert_inline(cap).strip()
        tab_m = re.search(r"\\begin\{tabular\}", body)
        table_html = ""
        if tab_m:
            k = tab_m.end()
            k = skip_ws(body, k)
            if k < len(body) and body[k] == "{":
                _, k = read_brace(body, k)
            tab_body, _ = find_env_end(body, "tabular", k)
            table_html = self._tabular_to_html(tab_body)
        cap_html = f"<caption>{caption}</caption>" if caption else ""
        return f'\n\n<table class="book-table">{cap_html}{table_html}</table>\n\n'

    def _convert_tabular(self, body: str) -> str:
        # body includes column spec if not stripped; try to drop leading {cols}
        s = body.lstrip()
        if s.startswith("{"):
            _, j = read_brace(s, 0)
            s = s[j:]
        return f'\n\n<table class="book-table">{self._tabular_to_html(s)}</table>\n\n'

    def _tabular_to_html(self, body: str) -> str:
        rows = self._split_tabular_rows(body)
        html: list[str] = []
        header_done = False
        for row in rows:
            row = row.strip()
            if not row or row == "\\hline":
                continue
            row = re.sub(r"\\hline", "", row).strip()
            if not row:
                continue
            cells = self._split_row_cells(row)
            converted = [self.convert_inline(c).strip() for c in cells]
            if not any(converted):
                continue
            tag = "th" if not header_done else "td"
            html.append(
                "<tr>" + "".join(f"<{tag}>{c}</{tag}>" for c in converted) + "</tr>"
            )
            if not header_done:
                header_done = True
        if not html:
            return ""
        thead = html[0]
        tbody = "".join(html[1:])
        return f"<thead>{thead}</thead><tbody>{tbody}</tbody>"

    def _split_tabular_rows(self, body: str) -> list[str]:
        rows: list[str] = []
        current: list[str] = []
        i = 0
        n = len(body)
        while i < n:
            if body[i] == "$":
                math, j = self._read_math(body, i)
                current.append(math)
                i = j
                continue
            if body.startswith("\\\\", i):
                rows.append("".join(current))
                current = []
                i += 2
                continue
            current.append(body[i])
            i += 1
        if current:
            rows.append("".join(current))
        return rows

    def _split_row_cells(self, row: str) -> list[str]:
        cells: list[str] = []
        current: list[str] = []
        i = 0
        n = len(row)
        while i < n:
            if row[i] == "$":
                math, j = self._read_math(row, i)
                current.append(math)
                i = j
                continue
            if row[i] == "&":
                cells.append("".join(current))
                current = []
                i += 1
                continue
            current.append(row[i])
            i += 1
        cells.append("".join(current))
        return cells

    def convert_body(self, s: str) -> str:
        # Attach \label after headings
        def heading_repl(m: re.Match[str]) -> str:
            cmd = m.group(1)
            title = m.group(2)
            rest = m.group(3) or ""
            level = {"section": 1, "subsection": 2, "subsubsection": 3}[cmd]
            label_m = re.match(r"\s*\\label\{([^}]+)\}", rest)
            title_md = self.convert_inline(title).strip()
            hid = slugify(re.sub(r"\$", "", title))
            if label_m:
                hid = label_m.group(1)
                rest = rest[label_m.end() :]
            self.heading_id = hid
            hashes = "#" * (level + 1) if level > 1 else "##"
            # chapter title is in frontmatter; skip \section inside chapter body
            if cmd == "section":
                return rest
            return f"\n\n{'#' * (level + 0)} {title_md} {{#{hid}}}\n\n{rest}"

        # We handle headings in the walker via \subsection commands.
        return self.convert_inline(self._convert_headings(s))

    def _convert_headings(self, s: str) -> str:
        out: list[str] = []
        i = 0
        n = len(s)
        heading_cmds = {"section", "subsection", "subsubsection", "paragraph"}
        while i < n:
            if s.startswith("<<<MINTED", i) or (s[i] == "$"):
                if s.startswith("<<<MINTED", i):
                    m = re.match(r"<<<MINTED(\d+)>>>", s[i:])
                    assert m
                    out.append(m.group(0))
                    i += m.end()
                    continue
                math, j = self._read_math(s, i)
                out.append(math)
                i = j
                continue
            if s[i] == "\\" and i + 1 < n and s[i + 1].isalpha():
                name, starred, opt, args, j = parse_command(s, i)
                if name == "index" and args:
                    term = args[0]
                    parts = term.split("!", 1)
                    self.index_terms.append(
                        {
                            "term": parts[0],
                            "sub": parts[1] if len(parts) > 1 else None,
                            "slug": self.slug,
                            "anchor": self.heading_id,
                        }
                    )
                    i = j
                    continue
                if name in heading_cmds and args:
                    title = args[0]
                    # consume following label
                    k = j
                    while k < len(s) and s[k] in " \t\n":
                        k += 1
                    hid = None
                    if s.startswith("\\label{", k):
                        lab, k3 = read_brace(s, k + 6)
                        hid = lab
                        j = k3
                    title_md = self.convert_inline(title).strip()
                    if hid is None:
                        hid = slugify(re.sub(r"\$", "", title_md))
                    self.heading_id = hid
                    if name == "section":
                        # chapter title lives in frontmatter
                        out.append("\n")
                        i = j
                        continue
                    level = {"subsection": 2, "subsubsection": 3, "paragraph": 4}[name]
                    # Empty <a> tags are unreliable as fragment targets; a span
                    # keeps the LaTeX label without replacing the heading's slug.
                    if hid.startswith("sec:") or hid.startswith("eq:"):
                        out.append(
                            f'\n\n<span id="{hid}" class="sec-anchor"></span>\n\n'
                        )
                    out.append(f"\n\n{'#' * level} {title_md}\n\n")
                    i = j
                    continue
            out.append(s[i])
            i += 1
        return "".join(out)


def split_chapters(body: str) -> list[dict]:
    pattern = re.compile(r"\\(section|appendix)(?![a-zA-Z])")
    matches = list(pattern.finditer(body))
    chapters: list[dict] = []
    appendix = False
    appendix_n = 0
    chapter_n = 0
    for i, m in enumerate(matches):
        cmd = m.group(1)
        if cmd == "appendix":
            appendix = True
            continue
        j = m.end()
        starred = False
        if j < len(body) and body[j] == "*":
            starred = True
            j += 1
        j = skip_ws(body, j)
        title, content_start = read_brace(body, j)
        end = len(body)
        for m2 in matches:
            if m2.start() <= m.start():
                continue
            if m2.group(1) == "section":
                end = m2.start()
                break
        content = body[content_start:end]
        lead = re.match(r"\s*\\label\{(sec:[^}]+)\}", content)
        sec_label = lead.group(1) if lead else None
        if starred:
            number = None
            kind = "front"
            order_base = 0
        elif appendix:
            appendix_n += 1
            number = chr(ord("A") + appendix_n - 1)
            kind = "appendix"
            order_base = 100 + appendix_n
        else:
            chapter_n += 1
            number = str(chapter_n)
            kind = "chapter"
            order_base = chapter_n
        slug = SLUGS.get(title)
        if not slug:
            slug = slugify(title)
        chapters.append(
            {
                "title": title,
                "slug": slug,
                "content": content,
                "number": number,
                "kind": kind,
                "order": order_base,
                "starred": starred,
                "label": sec_label,
            }
        )
    return chapters


def parse_bib(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    entries: dict[str, dict] = {}
    i = 0
    while True:
        m = re.search(r"@(\w+)\{", text[i:])
        if not m:
            break
        typ = m.group(1)
        brace = i + m.end() - 1
        # key until comma
        rest_start = brace + 1
        comma = text.find(",", rest_start)
        key = text[rest_start:comma].strip()
        # find matching closing brace of entry
        depth = 1
        j = rest_start
        while j < len(text) and depth:
            if text[j] == "{":
                depth += 1
            elif text[j] == "}":
                depth -= 1
            j += 1
        fields_blob = text[comma + 1 : j - 1]
        fields = _parse_bib_fields(fields_blob)
        authors = _bib_authors(fields.get("author", ""))
        year = fields.get("year", "")
        cite, narrative = _cite_forms(authors, year)
        entries[key] = {
            "type": typ.lower(),
            "title": latex_to_plain(fields.get("title", "")),
            "authors": authors,
            "year": year,
            "journal": latex_to_plain(fields.get("journal", "")),
            "publisher": latex_to_plain(fields.get("publisher", "")),
            "volume": fields.get("volume", ""),
            "pages": fields.get("pages", ""),
            "cite": cite,
            "narrative": narrative,
        }
        entries[key.lower()] = entries[key]
        i = j
    return entries


def _parse_bib_fields(blob: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    i = 0
    n = len(blob)
    while i < n:
        while i < n and blob[i] in " \t\n,":
            i += 1
        if i >= n:
            break
        eq = blob.find("=", i)
        if eq < 0:
            break
        name = blob[i:eq].strip().lower()
        j = eq + 1
        while j < n and blob[j].isspace():
            j += 1
        if j < n and blob[j] == "{":
            val, j = read_brace(blob, j)
        elif j < n and blob[j] == '"':
            k = blob.find('"', j + 1)
            val = blob[j + 1 : k]
            j = k + 1
        else:
            k = j
            while k < n and blob[k] not in ",\n":
                k += 1
            val = blob[j:k].strip()
            j = k
        fields[name] = val.strip()
        i = j
    return fields


def _bib_authors(field: str) -> list[str]:
    field = field.strip()
    if not field:
        return []
    parts = re.split(r"\s+and\s+", field)
    names: list[str] = []
    for p in parts:
        p = latex_to_plain(p)
        if "," in p:
            last, first = p.split(",", 1)
            names.append(f"{first.strip()} {last.strip()}".strip())
        else:
            names.append(p.strip())
    return names


def _cite_forms(authors: list[str], year: str) -> tuple[str, str]:
    def last(name: str) -> str:
        return name.split()[-1] if name else "Unknown"

    if not authors:
        return (f"({year})", "Unknown")
    lasts = [last(a) for a in authors]
    if len(lasts) == 1:
        nar = lasts[0]
        cite = f"{lasts[0]}, {year}"
    elif len(lasts) == 2:
        nar = f"{lasts[0]} and {lasts[1]}"
        cite = f"{lasts[0]} and {lasts[1]}, {year}"
    else:
        nar = f"{lasts[0]} et al."
        cite = f"{lasts[0]} et al., {year}"
    return cite, nar


def dump_frontmatter(meta: dict) -> str:
    lines = ["---"]
    for k, v in meta.items():
        if v is None:
            lines.append(f"{k}: null")
        elif isinstance(v, bool):
            lines.append(f"{k}: {str(v).lower()}")
        elif isinstance(v, int):
            lines.append(f"{k}: {v}")
        else:
            text = str(v).replace('"', '\\"')
            lines.append(f'{k}: "{text}"')
    lines.append("---\n")
    return "\n".join(lines)


def tidy_markdown(text: str) -> str:
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def convert_figures() -> None:
    OUT_FIGURES.mkdir(parents=True, exist_ok=True)
    if not ASSETS.exists():
        print("No assets/ directory; skipping figures", file=sys.stderr)
        return
    for src in sorted(ASSETS.iterdir()):
        if src.name.startswith("."):
            continue
        if src.suffix.lower() == ".pdf":
            dst = OUT_FIGURES / (src.stem + ".svg")
            if dst.exists():
                continue
            try:
                subprocess.run(
                    ["pdftocairo", "-svg", str(src), str(dst)],
                    check=True,
                    capture_output=True,
                )
                print(f"svg {src.name} -> {dst.name}")
            except (subprocess.CalledProcessError, FileNotFoundError) as exc:
                png = OUT_FIGURES / (src.stem + ".png")
                subprocess.run(
                    [
                        "pdftocairo",
                        "-png",
                        "-singlefile",
                        "-r",
                        "144",
                        str(src),
                        str(png.with_suffix("")),
                    ],
                    check=True,
                )
                print(f"png fallback {src.name}: {exc}")
        elif src.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}:
            dst = OUT_FIGURES / src.name
            if dst.exists():
                continue
            shutil.copy2(src, dst)
            print(f"copy {src.name}")
    cover = ASSETS / "cover.png"
    if cover.exists():
        shutil.copy2(cover, OUT_PUBLIC / "cover.png")


def main() -> None:
    raw = TEX_PATH.read_text(encoding="utf-8")
    protected, minted = protect_minted(raw)
    stripped = strip_comments(protected)
    begin = stripped.find("\\begin{document}")
    end = stripped.rfind("\\end{document}")
    body = stripped[begin + len("\\begin{document}") : end]

    chapters = split_chapters(body)
    OUT_CHAPTERS.mkdir(parents=True, exist_ok=True)
    OUT_DATA.mkdir(parents=True, exist_ok=True)

    # clear old chapters
    for old in OUT_CHAPTERS.glob("*.md"):
        old.unlink()

    conv = Converter()
    conv.minted = minted
    all_index: list[dict] = []

    for ch in chapters:
        conv.slug = ch["slug"]
        conv.heading_id = ch["slug"]
        conv.index_terms = []
        md_body = conv.convert_body(ch["content"])
        md_body = tidy_markdown(md_body)
        fm_data = {
            "title": ch["title"],
            "order": ch["order"],
            "number": ch["number"],
            "kind": ch["kind"],
        }
        if ch.get("label"):
            fm_data["label"] = ch["label"]
        fm = dump_frontmatter(fm_data)
        path = OUT_CHAPTERS / f"{ch['slug']}.md"
        path.write_text(fm + "\n" + md_body, encoding="utf-8")
        print(f"wrote {path.relative_to(ROOT)} ({len(md_body)} chars)")
        all_index.extend(conv.index_terms)

    (OUT_DATA / "index-terms.json").write_text(
        json.dumps(all_index, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    bib = parse_bib(BIB_PATH)
    # store unique keys only (drop lowercase aliases for output)
    unique = {k: v for k, v in bib.items() if k.lower() != k or k in bib}
    # actually keep a clean map of original keys
    clean = {}
    for k, v in bib.items():
        if k != k.lower() or k.lower() not in [x.lower() for x in clean]:
            if k[0].islower() and any(x.lower() == k.lower() and x != k for x in bib):
                continue
            clean[k] = v
    (OUT_DATA / "bib.json").write_text(
        json.dumps(clean, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    convert_figures()
    print(f"index terms: {len(all_index)}")
    print(f"bib entries: {len(clean)}")


if __name__ == "__main__":
    main()
