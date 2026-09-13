#!/usr/bin/env python3
"""Pack the staged project copy into public/shahriar-complex.zip.

Skips: node_modules, dist, .git, build outputs, and secret/credential files
(.env*, *.pem, *.key, secrets*) so no platform secrets ever ship.
"""
import os
import zipfile

STAGE = "/tmp/shahriar-stage"
OUT = "/home/user/codebase/public/shahriar-complex.zip"

SKIP_DIRS = {"node_modules", "dist", ".git", "build", "out", ".cache"}
SKIP_FILES = {"out.zip", "pack-zip.py"}
SKIP_SUFFIXES = (".env", ".env.local", ".env.production", ".pem", ".key", ".p12", ".pfx")


def is_secret(name: str) -> bool:
    if name in SKIP_FILES:
        return True
    if name.endswith(SKIP_SUFFIXES):
        return True
    if "secret" in name.lower() or name.startswith(".env"):
        return True
    return False


def main() -> None:
    zf = zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED)
    count = 0
    for root, dirs, files in os.walk(STAGE):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
        for f in sorted(files):
            if is_secret(f):
                print("skip:", f)
                continue
            p = os.path.join(root, f)
            rel = os.path.relpath(p, STAGE)
            zf.write(p, rel)
            count += 1
    zf.close()
    print(f"packed {count} files -> {OUT}")


if __name__ == "__main__":
    main()
