#!/usr/bin/env bash
set -euo pipefail

if ! command -v rustup >/dev/null 2>&1; then
  installer="$(mktemp)"
  trap 'rm -f "$installer"' EXIT

  curl --proto '=https' --tlsv1.2 -fsSL \
    https://sh.rustup.rs \
    -o "$installer"

  sh "$installer" \
    -y \
    --profile minimal \
    --default-toolchain none
fi

if [[ -f "$HOME/.cargo/env" ]]; then
  source "$HOME/.cargo/env"
fi

rustup toolchain install 1.98.0 \
  --profile minimal \
  --component rustfmt \
  --component clippy \
  --target wasm32-unknown-unknown

if ! command -v wasm-pack >/dev/null 2>&1; then
  cargo install wasm-pack --version 0.15.0 --locked
elif [[ "$(wasm-pack --version)" != "wasm-pack 0.15.0" ]]; then
  cargo install wasm-pack --version 0.15.0 --locked --force
fi

rustc --version
cargo --version
wasm-pack --version
