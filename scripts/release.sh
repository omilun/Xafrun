#!/usr/bin/env bash
# scripts/release.sh — Create a new Xafrun release
#
# Usage:
#   ./scripts/release.sh           # auto-bump patch (0.1.6 → 0.1.7)
#   ./scripts/release.sh 0.2.0     # specific version
#   ./scripts/release.sh --minor   # bump minor (0.1.x → 0.2.0)
#   ./scripts/release.sh --major   # bump major (0.x.y → 1.0.0)
#
# What it does:
#   1. Bumps VERSION file
#   2. Builds linux/amd64 + linux/arm64 images locally (native arm64 fast, amd64 via Rosetta/buildx)
#   3. Pushes multi-arch manifest to ghcr.io
#   4. Commits VERSION, creates git tag v<version>
#   5. Pushes tag → triggers GitHub Actions release workflow (Trivy + GitHub Release)

set -euo pipefail

REGISTRY="ghcr.io/omilun"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── Version bump ───────────────────────────────────────────────────────────────
current_version() { cat "$REPO_ROOT/VERSION" | tr -d '[:space:]'; }

bump_version() {
  local mode="$1"
  local v; v=$(current_version)
  local major minor patch
  IFS='.' read -r major minor patch <<< "$v"

  case "$mode" in
    patch) patch=$((patch + 1)) ;;
    minor) minor=$((minor + 1)); patch=0 ;;
    major) major=$((major + 1)); minor=0; patch=0 ;;
  esac
  echo "${major}.${minor}.${patch}"
}

# Parse args
MODE="patch"
EXPLICIT_VERSION=""

for arg in "${@:-}"; do
  case "$arg" in
    --minor) MODE="minor" ;;
    --major) MODE="major" ;;
    --patch) MODE="patch" ;;
    [0-9]*) EXPLICIT_VERSION="$arg" ;;
  esac
done

if [ -n "$EXPLICIT_VERSION" ]; then
  NEW_VERSION="$EXPLICIT_VERSION"
else
  NEW_VERSION=$(bump_version "$MODE")
fi

OLD_VERSION=$(current_version)

echo ""
echo "  🚀  Xafrun Release Builder"
echo "  ─────────────────────────────────────────────"
echo "  Current version : $OLD_VERSION"
echo "  New version     : $NEW_VERSION"
echo "  Platforms       : linux/amd64 + linux/arm64"
echo "  Registry        : $REGISTRY"
echo ""

# Guard against uncommitted changes
if ! git -C "$REPO_ROOT" diff --quiet HEAD -- ':!VERSION'; then
  echo "  ❌  Uncommitted changes detected. Commit or stash before releasing."
  exit 1
fi

read -p "  Continue? [y/N] " -n 1 -r; echo
[[ "$REPLY" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

# ── 1. Update VERSION ────────────────────────────────────────────────────────
echo ""
echo "  📝  Updating VERSION to $NEW_VERSION"
echo "$NEW_VERSION" > "$REPO_ROOT/VERSION"

# ── 2. Build multi-platform images ──────────────────────────────────────────
echo "  🔨  Building linux/amd64 + linux/arm64 images..."
echo ""

# Ensure buildx builder with multi-platform support exists
docker buildx inspect xafrun-builder &>/dev/null || \
  docker buildx create --name xafrun-builder --use --bootstrap

# Login to ghcr.io
echo "  🔑  Logging in to ghcr.io..."
gh auth token | docker login ghcr.io -u omilun --password-stdin

for component in backend frontend; do
  echo "  📦  Building $component..."
  docker buildx build \
    --builder xafrun-builder \
    --platform linux/amd64,linux/arm64 \
    --tag "$REGISTRY/xafrun-${component}:${NEW_VERSION}" \
    --tag "$REGISTRY/xafrun-${component}:latest" \
    --push \
    "$REPO_ROOT/$component"
  echo "  ✅  $component pushed"
done

# ── 3. Commit VERSION and tag ────────────────────────────────────────────────
echo ""
echo "  🏷️   Committing VERSION and tagging v${NEW_VERSION}..."

cd "$REPO_ROOT"
git add VERSION
git commit -m "chore: release v${NEW_VERSION}

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"
git push origin master
git push origin "v${NEW_VERSION}"

echo ""
echo "  ✅  Tag v${NEW_VERSION} pushed!"
echo "  ⏳  GitHub Actions will now:"
echo "      • Run Trivy security scan on both images"
echo "      • Upload results to GitHub Security tab"
echo "      • Create GitHub Release with compatibility notes"
echo ""
echo "  👀  Watch at: https://github.com/omilun/Xafrun/actions"
echo "  📋  Release:  https://github.com/omilun/Xafrun/releases/tag/v${NEW_VERSION}"
echo ""
