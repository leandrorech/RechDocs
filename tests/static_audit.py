#!/usr/bin/env python3
"""Auditoria estática mínima para HTML single-file do RechDocs."""
from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
import tempfile
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

SCRIPT_RE = re.compile(r"<script(?:\s[^>]*)?>(.*?)</script>", re.I | re.S)
DANGEROUS = ("eval(", "new Function(", "document.write(")


class IdCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for key, value in attrs:
            if key.lower() == "id" and value:
                self.ids.append(value)


def audit(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    failures: list[str] = []

    collector = IdCollector()
    collector.feed(text)
    ids = collector.ids
    duplicates = sorted(k for k, v in Counter(ids).items() if v > 1)
    if duplicates:
        failures.append(f"IDs duplicados: {duplicates}")

    for token in DANGEROUS:
        if token in text:
            failures.append(f"Padrão perigoso encontrado: {token}")

    scripts = SCRIPT_RE.findall(text)
    if not scripts:
        failures.append("Nenhum script inline encontrado")
    elif shutil.which("node"):
        joined = "\n;\n".join(scripts)
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as f:
            f.write(joined)
            js_path = Path(f.name)
        try:
            proc = subprocess.run(["node", "--check", str(js_path)], capture_output=True, text=True)
            if proc.returncode != 0:
                failures.append("JavaScript inválido:\n" + (proc.stderr or proc.stdout))
        finally:
            js_path.unlink(missing_ok=True)
    else:
        print("AVISO: Node.js ausente; teste sintático JS não executado.")

    print(f"Arquivo: {path}")
    print(f"IDs: {len(ids)} | scripts inline: {len(scripts)}")
    if failures:
        print("FALHOU")
        for item in failures:
            print(f"- {item}")
        return 1
    print("PASSOU na auditoria estática mínima")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("html", type=Path)
    args = parser.parse_args()
    if not args.html.is_file():
        print(f"Arquivo inexistente: {args.html}", file=sys.stderr)
        return 2
    return audit(args.html)


if __name__ == "__main__":
    raise SystemExit(main())
