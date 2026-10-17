#!/usr/bin/env bash
# 在全新克隆上按顺序应用补丁；加 --tree 时，再和已验证的工作目录逐文件比较（含二进制文件）。
# 比较时跳过本地生成、不进仓库的东西：依赖、构建产物、Python 缓存、.DS_Store。
# 用法：verify_patch.sh <远端地址> <补丁1> [补丁2 ...] [--tree <工作目录>]
set -euo pipefail
if [ $# -lt 2 ]; then echo "用法：$0 <远端地址> <补丁...> [--tree <工作目录>]" >&2; exit 2; fi
REPO=$1; shift
PATCHES=(); TREE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --tree) TREE=$(cd "$2" && pwd); shift 2 ;;
    *) PATCHES+=("$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"); shift ;;
  esac
done
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
git clone -q "$REPO" "$TMP/repo"
cd "$TMP/repo"
BASE=$(git log -1 --format='%h %s')
for p in "${PATCHES[@]}"; do
  git -c user.name=verify -c user.email=verify@example.com am -q --3way "$p"
done
echo "OK：${#PATCHES[@]} 个补丁已干净应用在「$BASE」上"
if [ -n "$TREE" ]; then
  if diff -rq --exclude=.git --exclude=node_modules --exclude=dist --exclude=unpackage --exclude=__pycache__ --exclude="*.pyc" --exclude=.DS_Store "$TMP/repo" "$TREE"; then
    echo "OK：应用后的文件和 $TREE 完全一致（含二进制文件）"
  else
    echo "不一致：应用后的文件和 $TREE 有差异（见上）" >&2
    exit 1
  fi
fi
