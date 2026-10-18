#!/usr/bin/env bash
set -euo pipefail

readonly RUST_VERSION="1.98.0"
readonly WASM_PACK_VERSION="0.15.0"
readonly WASM_TARGET="wasm32-unknown-unknown"

load_cargo_environment() {
  local cargo_env="${CARGO_HOME:-$HOME/.cargo}/env"

  if [[ -f "$cargo_env" ]]; then
    source "$cargo_env"
  fi
}

install_rustup() (
  if ! command -v curl >/dev/null 2>&1; then
    printf 'Error: curl es necesario para instalar rustup.\n' >&2
    exit 1
  fi

  local installer
  installer="$(mktemp)"
  trap 'rm -f "$installer"' EXIT

  curl \
    --proto '=https' \
    --tlsv1.2 \
    --fail \
    --silent \
    --show-error \
    --location \
    https://sh.rustup.rs \
    --output "$installer"

  sh "$installer" \
    -y \
    --profile minimal \
    --default-toolchain none
)

load_cargo_environment

if ! command -v rustup >/dev/null 2>&1; then
  install_rustup
  load_cargo_environment
fi

if ! command -v rustup >/dev/null 2>&1; then
  printf 'Error: rustup no está disponible en PATH después de la instalación.\n' >&2
  exit 1
fi

rustup toolchain install "$RUST_VERSION" \
  --profile minimal \
  --component rustfmt \
  --component clippy \
  --target "$WASM_TARGET"

installed_wasm_pack_version=""

if command -v wasm-pack >/dev/null 2>&1; then
  installed_wasm_pack_version="$(wasm-pack --version)"
fi

if [[ "$installed_wasm_pack_version" != "wasm-pack $WASM_PACK_VERSION" ]]; then
  cargo "+$RUST_VERSION" install wasm-pack \
    --version "$WASM_PACK_VERSION" \
    --locked \
    --force
fi

rustc "+$RUST_VERSION" --version
cargo "+$RUST_VERSION" --version
wasm-pack --version
