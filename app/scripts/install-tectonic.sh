#!/usr/bin/env bash
set -euo pipefail

TECTONIC_VERSION="${TECTONIC_VERSION:-0.15.0}"
INSTALL_DIR="${TECTONIC_INSTALL_DIR:-$(pwd)/bin}"
ARCHIVE="tectonic-${TECTONIC_VERSION}-x86_64-unknown-linux-gnu.tar.gz"
URL="https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${TECTONIC_VERSION}/${ARCHIVE}"

mkdir -p "$INSTALL_DIR"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

curl --fail --location --silent --show-error "$URL" --output "$TMP_DIR/$ARCHIVE"
tar -xzf "$TMP_DIR/$ARCHIVE" -C "$TMP_DIR"
install -m 0755 "$TMP_DIR/tectonic" "$INSTALL_DIR/tectonic"
"$INSTALL_DIR/tectonic" --version
