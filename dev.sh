#!/bin/sh
# Dev launcher: ensures the local Node toolchain is on PATH, then runs Next.
export PATH="$HOME/.local/node/bin:$PATH"
cd "$(dirname "$0")" || exit 1
exec npm run dev
