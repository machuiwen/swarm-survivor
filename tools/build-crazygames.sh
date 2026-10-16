#!/usr/bin/env bash
# Builds dist/neon-hive-survivors-crazygames.zip for upload to CrazyGames.
# index.html sits at the zip root; README, tools, dist, .git and package.json are left out.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
out="$root/dist"
zip_name="neon-hive-survivors-crazygames.zip"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT

cd "$root"
cp index.html style.css "$stage/"
cp -R js fonts "$stage/"
find "$stage" -name '.DS_Store' -delete

# the build must not pull anything from other domains except the CrazyGames SDK
if grep -rEho 'https?://[^"'"'"' )]+' "$stage" --include='*.html' --include='*.css' --include='*.js' \
    | grep -v '^https://sdk\.crazygames\.com/' | grep -v '^http://www\.w3\.org/' ; then
  echo "error: external URL found in build (see above)" >&2
  exit 1
fi

mkdir -p "$out"
rm -f "$out/$zip_name"
(cd "$stage" && zip -qr -X "$out/$zip_name" .)

echo "built $out/$zip_name ($(du -h "$out/$zip_name" | cut -f1 | tr -d ' '), $(unzip -Z1 "$out/$zip_name" | grep -vc '/$') files)"
