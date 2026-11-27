#!/bin/bash
# Baut Setwerk für Windows (Setwerk.exe + WebView2) und den Installer Setwerk-Windows-Setup.exe.
# Läuft auf macOS/Linux: braucht das .NET SDK (brew install dotnet) und NSIS (brew install makensis).
set -euo pipefail
cd "$(dirname "$0")"
VERSION="${1:-1.2.0}"
ROOT="$(cd .. && pwd)"
rm -rf build && mkdir -p build/app/web/icons
dotnet build Setwerk/Setwerk.csproj -c Release -p:Version="$VERSION" -o build/bin -nologo -v:q
# Programmdateien (ohne Debug-Symbole)
cp build/bin/Setwerk.exe build/bin/Setwerk.exe.config build/app/
cp build/bin/Microsoft.Web.WebView2.*.dll build/app/
for d in runtimes x86 x64 arm64; do [ -d "build/bin/$d" ] && cp -R "build/bin/$d" build/app/; done
# Web-App
cp "$ROOT/app/index.html" "$ROOT/app/extra.js" "$ROOT/app/manifest.webmanifest" build/app/web/
cp "$ROOT/config.js" build/app/web/
cp "$ROOT"/icons/*.png build/app/web/icons/
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 makensis -V2 -INPUTCHARSET UTF8 -DVERSION="$VERSION" setwerk.nsi
echo "✓ $(pwd)/build/Setwerk-Windows-Setup.exe ($(du -h build/Setwerk-Windows-Setup.exe | cut -f1))"
