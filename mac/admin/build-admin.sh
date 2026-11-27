#!/bin/bash
# Baut "Setwerk Admin.app" (Universal) und Setwerk-Admin.dmg
set -euo pipefail
cd "$(dirname "$0")"
OUT="$(pwd)/build"; APP="$OUT/Setwerk Admin.app"; MIN_MACOS=13.0
rm -rf "$OUT"; mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
for ARCH in arm64 x86_64; do
  swiftc -O -target "$ARCH-apple-macos$MIN_MACOS" -framework Cocoa -framework WebKit Admin.swift -o "$OUT/a-$ARCH" 2>/dev/null
done
lipo -create "$OUT/a-arm64" "$OUT/a-x86_64" -output "$APP/Contents/MacOS/SetwerkAdmin"; rm "$OUT"/a-*
cp Admin.icns "$APP/Contents/Resources/"
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Setwerk Admin</string>
  <key>CFBundleDisplayName</key><string>Setwerk Admin</string>
  <key>CFBundleIdentifier</key><string>io.github.setwerk.admin</string>
  <key>CFBundleExecutable</key><string>SetwerkAdmin</string>
  <key>CFBundleIconFile</key><string>Admin</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>$MIN_MACOS</string>
  <key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST
codesign --force --deep --sign - "$APP"
STAGE="$OUT/dmg"; mkdir -p "$STAGE"; cp -R "$APP" "$STAGE/"; ln -s /Applications "$STAGE/Programme"
hdiutil create -volname "Setwerk Admin" -srcfolder "$STAGE" -ov -format UDZO -fs HFS+ "$OUT/Setwerk-Admin.dmg" >/dev/null 2>&1
rm -rf "$STAGE"
echo "✓ $OUT/Setwerk-Admin.dmg"
