#!/usr/bin/env python3
"""
Output a JSON representation of a Python file's structure for QA Monster.
Usage: python parse_python_ast.py <path_to_py_file>
Reads the file, parses with ast, prints ParsedFile-like JSON to stdout.
"""
from __future__ import annotations

import ast
import json
import sys
from pathlib import Path


def get_line_range(node: ast.AST) -> tuple[int, int]:
    if hasattr(node, "end_lineno") and node.end_lineno is not None:
        return (node.lineno or 0, node.end_lineno)
    return (node.lineno or 0, node.lineno or 0)


def param_to_dict(p: ast.arg) -> dict:
    return {
        "name": p.arg,
        "type": ast.unparse(p.annotation) if p.annotation else "",
        "optional": False,
        "defaultValue": None,
    }


def extract_functions(root: ast.AST, content: str, class_prefix: str = "") -> list[dict]:
    functions = []

    for node in ast.walk(root):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            if node.name.startswith("_"):
                continue
            params = []
            for i, p in enumerate(node.args.args):
                if p.arg == "self" or p.arg == "cls":
                    continue
                param = param_to_dict(p)
                if node.args.defaults:
                    default_start = len(node.args.args) - len(node.args.defaults)
                    if i >= default_start:
                        idx = i - default_start
                        param["optional"] = True
                        param["defaultValue"] = ast.unparse(node.args.defaults[idx])
                params.append(param)

            return_ann = ""
            if node.returns:
                return_ann = ast.unparse(node.returns)

            line_start, line_end = get_line_range(node)
            body_slice = content.splitlines()[line_start - 1 : line_end]
            body = "\n".join(body_slice) if body_slice else ""

            functions.append({
                "name": f"{class_prefix}{node.name}" if class_prefix else node.name,
                "parameters": params,
                "returnType": return_ann,
                "isAsync": isinstance(node, ast.AsyncFunctionDef),
                "lineStart": line_start,
                "lineEnd": line_end,
                "body": body,
            })

    return functions


def extract_classes(root: ast.AST, content: str) -> list[dict]:
    classes = []

    for node in ast.walk(root):
        if isinstance(node, ast.ClassDef):
            methods = extract_functions(node, content, class_prefix=f"{node.name}.")
            properties = []
            for n in node.body:
                if isinstance(n, ast.AnnAssign) and isinstance(n.target, ast.Name):
                    properties.append({
                        "name": n.target.id,
                        "type": ast.unparse(n.annotation) if n.annotation else "",
                        "optional": n.value is None,
                    })

            line_start, line_end = get_line_range(node)
            classes.append({
                "name": node.name,
                "methods": methods,
                "properties": properties,
                "lineStart": line_start,
                "lineEnd": line_end,
            })

    return classes


def extract_imports(root: ast.AST) -> list[dict]:
    imports = []

    for node in ast.walk(root):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append({
                    "from": alias.name,
                    "imports": [alias.asname or alias.name],
                    "isTypeOnly": False,
                    "defaultImport": alias.asname if alias.asname else alias.name,
                })
        elif isinstance(node, ast.ImportFrom):
            module = node.module or ""
            if node.level:
                module = "." * node.level + (module or "")
            names = [a.name if not a.asname else f"{a.name} as {a.asname}" for a in node.names]
            default = None
            if any(a.name == "*" for a in node.names):
                default = "*"
                names = ["*"]
            imports.append({
                "from": module,
                "imports": names,
                "isTypeOnly": False,
                "defaultImport": default,
            })

    return imports


def extract_exports(root: ast.AST) -> list[dict]:
    exports = []
    for node in ast.walk(root):
        if isinstance(node, (ast.FunctionDef, ast.ClassDef, ast.AsyncFunctionDef)):
            if node.name.startswith("_"):
                continue
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                exports.append({"name": node.name, "type": "function"})
            elif isinstance(node, ast.ClassDef):
                exports.append({"name": node.name, "type": "class"})
    return exports


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: parse_python_ast.py <filepath>"}), file=sys.stderr)
        sys.exit(1)

    path = Path(sys.argv[1])
    if not path.exists():
        print(json.dumps({"error": f"File not found: {path}"}), file=sys.stderr)
        sys.exit(2)

    content = path.read_text(encoding="utf-8", errors="replace")
    try:
        tree = ast.parse(content)
    except SyntaxError as e:
        print(json.dumps({"error": str(e), "path": str(path)}), file=sys.stderr)
        sys.exit(3)

    result = {
        "path": str(path.resolve()),
        "content": content,
        "functions": extract_functions(tree, content),
        "classes": extract_classes(tree, content),
        "types": [],
        "imports": extract_imports(tree),
        "exports": extract_exports(tree),
    }

    print(json.dumps(result, indent=0))


if __name__ == "__main__":
    main()
