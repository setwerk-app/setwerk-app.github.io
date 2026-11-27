; Setwerk – Windows-Installer (NSIS, Modern UI 2)
; Installiert pro Benutzer (keine Admin-Rechte nötig) nach %LOCALAPPDATA%\Programs\Setwerk
Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"

!ifndef VERSION
  !define VERSION "1.1.0"
!endif
!define APPNAME "Setwerk"
!define UNINST "Software\Microsoft\Windows\CurrentVersion\Uninstall\Setwerk"
!define WV2 "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"

Name "${APPNAME}"
OutFile "build/Setwerk-Windows-Setup.exe"
InstallDir "$LOCALAPPDATA\Programs\Setwerk"
InstallDirRegKey HKCU "Software\Setwerk" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "Setwerk ${VERSION}"
ShowInstDetails nevershow
ShowUninstDetails nevershow

VIProductVersion "${VERSION}.0"
VIAddVersionKey /LANG=1031 "ProductName" "Setwerk"
VIAddVersionKey /LANG=1031 "FileDescription" "Setwerk Installer"
VIAddVersionKey /LANG=1031 "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=1031 "ProductVersion" "${VERSION}"
VIAddVersionKey /LANG=1031 "CompanyName" "Setwerk"
VIAddVersionKey /LANG=1031 "LegalCopyright" "Setwerk"

!define MUI_ICON "Setwerk/setwerk.ico"
!define MUI_UNICON "Setwerk/setwerk.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "installer/wizard.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "installer/wizard.bmp"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Willkommen bei Setwerk ${VERSION}"
!define MUI_WELCOMEPAGE_TEXT "Du nennst die Stimmung – Setwerk baut das Set.$\r$\n$\r$\nSetwerk plant DJ-Sets aus deiner Serato-, Rekordbox- oder Traktor-Bibliothek nach Tonart, Tempo und Energiekurve – mit Mix-Coach, Live-Assistent und DJ-Schule.$\r$\n$\r$\nDeine Bibliothek bleibt ausschließlich auf diesem PC.$\r$\n$\r$\nKlicke auf „Weiter“, um fortzufahren."
!define MUI_COMPONENTSPAGE_NODESC
!define MUI_FINISHPAGE_TITLE "Setwerk ist installiert"
!define MUI_FINISHPAGE_TEXT "Du findest Setwerk jetzt im Startmenü.$\r$\n$\r$\nSo legst du los: Bibliothek öffnen → „Ordner importieren“ → deinen _Serato_-Ordner wählen (oder Rekordbox-XML / Traktor-NML hineinziehen) → im Set-Builder auf „Set bauen“ klicken."
!define MUI_FINISHPAGE_RUN "$INSTDIR\Setwerk.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Setwerk jetzt starten"
!define MUI_FINISHPAGE_LINK "Anleitung & Neuigkeiten auf der Website"
!define MUI_FINISHPAGE_LINK_LOCATION "https://zthsydnhbt-hub.github.io/setwerk/"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "German"

Section "Setwerk (erforderlich)" SecMain
  SectionIn RO
  SetOutPath "$INSTDIR"
  File /r "build/app/*.*"
  WriteUninstaller "$INSTDIR\Deinstallieren.exe"
  CreateShortcut "$SMPROGRAMS\Setwerk.lnk" "$INSTDIR\Setwerk.exe" "" "$INSTDIR\Setwerk.exe" 0
  WriteRegStr HKCU "Software\Setwerk" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNINST}" "DisplayName" "Setwerk"
  WriteRegStr HKCU "${UNINST}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINST}" "Publisher" "Setwerk"
  WriteRegStr HKCU "${UNINST}" "DisplayIcon" "$INSTDIR\Setwerk.exe"
  WriteRegStr HKCU "${UNINST}" "URLInfoAbout" "https://zthsydnhbt-hub.github.io/setwerk/"
  WriteRegStr HKCU "${UNINST}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINST}" "UninstallString" "$\"$INSTDIR\Deinstallieren.exe$\""
  WriteRegDWORD HKCU "${UNINST}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST}" "NoRepair" 1
  Call CheckWebView2
SectionEnd

Section "Verknüpfung auf dem Desktop" SecDesktop
  CreateShortcut "$DESKTOP\Setwerk.lnk" "$INSTDIR\Setwerk.exe" "" "$INSTDIR\Setwerk.exe" 0
SectionEnd

Function CheckWebView2
  ReadRegStr $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\${WV2}" "pv"
  ${If} $0 == ""
    ReadRegStr $0 HKLM "SOFTWARE\Microsoft\EdgeUpdate\Clients\${WV2}" "pv"
  ${EndIf}
  ${If} $0 == ""
    ReadRegStr $0 HKCU "Software\Microsoft\EdgeUpdate\Clients\${WV2}" "pv"
  ${EndIf}
  ${If} $0 == ""
  ${OrIf} $0 == "0.0.0.0"
    MessageBox MB_YESNO|MB_ICONINFORMATION "Setwerk braucht die kostenlose „Microsoft Edge WebView2-Runtime“ (bei Windows 11 bereits enthalten).$\r$\n$\r$\nJetzt die Download-Seite von Microsoft öffnen?" IDNO +2
    ExecShell "open" "https://go.microsoft.com/fwlink/p/?LinkId=2124703"
  ${EndIf}
FunctionEnd

Section "Uninstall"
  Delete "$SMPROGRAMS\Setwerk.lnk"
  Delete "$DESKTOP\Setwerk.lnk"
  Delete "$INSTDIR\Setwerk.exe"
  Delete "$INSTDIR\Setwerk.exe.config"
  Delete "$INSTDIR\*.dll"
  RMDir /r "$INSTDIR\web"
  RMDir /r "$INSTDIR\runtimes"
  RMDir /r "$INSTDIR\x86"
  RMDir /r "$INSTDIR\x64"
  RMDir /r "$INSTDIR\arm64"
  Delete "$INSTDIR\Deinstallieren.exe"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "${UNINST}"
  DeleteRegKey HKCU "Software\Setwerk"
SectionEnd
