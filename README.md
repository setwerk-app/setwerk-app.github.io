# Setwerk – DJ-Set-Planer

Du nennst die Stimmung – Setwerk baut das Set.

- Import: Rekordbox-XML, Traktor-NML, Serato DJ Pro (`database V2`, `.crate`, ganzer `_Serato_`-Ordner)
- Sets nach Tonart (Camelot), BPM und Energiekurve – 7 Stimmungen, 5 Energiekurven
- Smart Crates, Crates zusammenführen, mehrere Crates als Quelle kombinieren
- Export: M3U8, Rekordbox-XML, Serato-Crate, PDF-Trackliste mit eigenem Branding
- Installierbar (PWA) und offline nutzbar. Alle Daten bleiben lokal im Browser.

## Benutzen

- **Web-App:** https://zthsydnhbt-hub.github.io/setwerk/ (über „App installieren“ als App auf Mac, PC, iPhone und Android)
- **Mac-App:** [neueste Version herunterladen](https://github.com/zthsydnhbt-hub/setwerk/releases/latest) – als Installer (`.pkg`, empfohlen) oder Disk-Image (`.dmg`).
  Nicht von Apple signiert: beim ersten Öffnen Systemeinstellungen → Datenschutz & Sicherheit → „Trotzdem öffnen“.

Mac-App, DMG und PKG selbst bauen: `./mac/build.sh 1.0.0` (benötigt die Xcode Command Line Tools).
