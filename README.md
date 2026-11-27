# Setwerk – DJ-Set-Planer

Du nennst die Stimmung – Setwerk baut das Set.

- Import: Rekordbox-XML, Traktor-NML, Serato DJ Pro (`database V2`, `.crate`, ganzer `_Serato_`-Ordner)
- Sets nach Tonart (Camelot), BPM und Energiekurve – 7 Stimmungen, 5 Energiekurven
- Smart Crates, Crates zusammenführen, mehrere Crates als Quelle kombinieren
- Export: M3U8, Rekordbox-XML, Serato-Crate, PDF-Trackliste mit eigenem Branding
- Installierbar (PWA) und offline nutzbar. Alle Daten bleiben lokal im Browser.

## Benutzen

- **Web-App:** https://zthsydnhbt-hub.github.io/setwerk/ (über „App installieren“ als App auf Mac, PC, iPhone und Android)
- **Mac-App (DMG):** [neueste Version herunterladen](https://github.com/zthsydnhbt-hub/setwerk/releases/latest)
  Die App ist nicht von Apple signiert. Beim ersten Start: Systemeinstellungen → Datenschutz & Sicherheit → „Trotzdem öffnen“
  (oder `xattr -dr com.apple.quarantine /Applications/Setwerk.app`).

Mac-App selbst bauen: `./mac/build.sh 1.0.0` (benötigt die Xcode Command Line Tools).
