#!/bin/bash
# Baut Setwerk.app (Universal: Apple Silicon + Intel) und Setwerk-<version>.dmg
# Voraussetzung: Xcode Command Line Tools (xcode-select --install)
set -euo pipefail
cd "$(dirname "$0")"
VERSION="${1:-1.0.0}"
ROOT="$(cd .. && pwd)"
OUT="$ROOT/mac/build"
APP="$OUT/Setwerk.app"
MIN_MACOS=13.0

rm -rf "$OUT"; mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/web/icons"

echo "▸ Kompiliere (arm64 + x86_64) …"
for ARCH in arm64 x86_64; do
  swiftc -O -target "$ARCH-apple-macos$MIN_MACOS" -framework Cocoa -framework WebKit \
    Setwerk.swift -o "$OUT/Setwerk-$ARCH"
done
lipo -create "$OUT/Setwerk-arm64" "$OUT/Setwerk-x86_64" -output "$APP/Contents/MacOS/Setwerk"
rm "$OUT"/Setwerk-arm64 "$OUT"/Setwerk-x86_64

echo "▸ Ressourcen …"
cp "$ROOT/index.html" "$ROOT/manifest.webmanifest" "$APP/Contents/Resources/web/"
cp "$ROOT"/icons/*.png "$APP/Contents/Resources/web/icons/"
cp Setwerk.icns "$APP/Contents/Resources/"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Setwerk</string>
  <key>CFBundleDisplayName</key><string>Setwerk</string>
  <key>CFBundleIdentifier</key><string>io.github.setwerk</string>
  <key>CFBundleExecutable</key><string>Setwerk</string>
  <key>CFBundleIconFile</key><string>Setwerk</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>$VERSION</string>
  <key>CFBundleVersion</key><string>$VERSION</string>
  <key>CFBundleDevelopmentRegion</key><string>de</string>
  <key>LSMinimumSystemVersion</key><string>$MIN_MACOS</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.music</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSHumanReadableCopyright</key><string>Setwerk – Du nennst die Stimmung, Setwerk baut das Set.</string>
</dict></plist>
PLIST

echo "▸ Ad-hoc-Signatur (nötig, damit die App auf Apple Silicon startet) …"
codesign --force --deep --sign - "$APP"

echo "▸ DMG …"
STAGE="$OUT/dmg"; mkdir -p "$STAGE"
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Programme"
cat > "$STAGE/Zuerst lesen.txt" <<TXT
Setwerk installieren
====================
1. Setwerk.app auf den Ordner „Programme“ ziehen.
2. Beim ersten Start meldet macOS, dass die App nicht überprüft werden kann
   (sie ist nicht von Apple signiert). So öffnest du sie trotzdem:
   • Systemeinstellungen → Datenschutz & Sicherheit → ganz unten bei
     „Setwerk wurde blockiert“ auf „Trotzdem öffnen“ klicken.
   • Oder im Terminal:  xattr -dr com.apple.quarantine /Applications/Setwerk.app
Das ist nur beim ersten Start nötig.
TXT
DMG="$OUT/Setwerk-$VERSION.dmg"
hdiutil create -volname "Setwerk" -srcfolder "$STAGE" -ov -format UDZO -fs HFS+ "$DMG" >/dev/null
rm -rf "$STAGE"
echo "✓ $DMG ($(du -h "$DMG" | cut -f1))"
