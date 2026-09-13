#!/usr/bin/env python3
"""Package the project (source only) into public/shahriar-complex.zip for self-hosting.

Excludes node_modules, dist, env files, .git, and platform-only dev artifacts.
"""
import os
import shutil
import zipfile

STAGE = "/tmp/shahriar-stage"
OUT = "public/shahriar-complex.zip"
SKIP_DIRS = {"node_modules", "dist", ".git", ".turbo", ".cache", ".vite"}
ZIP_EXCLUDES = ("shahriar-complex.zip",)

if os.path.exists(STAGE):
    shutil.rmtree(STAGE)
os.makedirs(STAGE)

# Stage source files (whitelist; never copy env/secret files)
for item in os.listdir("."):
    if item in SKIP_DIRS or item.endswith(".env") or item.endswith(".env.local"):
        continue
    s = os.path.join(".", item)
    d = os.path.join(STAGE, item)
    if os.path.isdir(s):
        shutil.copytree(s, d, ignore=shutil.ignore_patterns(*(SKIP_DIRS | {"*.env", "*.env.local"})))
    else:
        shutil.copy2(s, d)

# Remove platform-only dependencies from the staged copy
main = os.path.join(STAGE, "src", "main.tsx")
if os.path.exists(main):
    with open(main, "r", encoding="utf-8") as f:
        src = f.read()
    src = src.replace('import { VlyToolbar } from "../vly-toolbar-readonly.tsx";\n', "")
    src = src.replace("<VlyToolbar />", "")
    src = src.replace("inert error-boundary", "error-boundary")
    with open(main, "w", encoding="utf-8") as f:
        f.write(src)

# Zip it up
if os.path.exists(OUT):
    os.remove(OUT)
count = 0
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(STAGE):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in files:
            if name.endswith(ZIP_EXCLUDES):
                continue
            p = os.path.join(root, name)
            zf.write(p, os.path.relpath(p, STAGE))
            count += 1

print(f"OK: {OUT} — {count} files")
