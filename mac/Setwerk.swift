// Setwerk – native macOS app.
// A small Cocoa shell around WKWebView that serves the bundled web app from
// the custom scheme setwerk://app/ (stable origin → localStorage persists),
// with native file open panels, save dialogs for exports and a regular menu bar.

import Cocoa
import WebKit

let appScheme = "setwerk"
let appHost = "app"

// MARK: - Serve bundled files under setwerk://app/

final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    private let root: URL
    init(root: URL) { self.root = root.standardizedFileURL }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let file = root.appendingPathComponent(String(path.dropFirst())).standardizedFileURL
        guard file.path.hasPrefix(root.path), let data = try? Data(contentsOf: file) else {
            let r = HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: nil)!
            task.didReceive(r); task.didReceive(Data()); task.didFinish(); return
        }
        let r = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1",
                                headerFields: ["Content-Type": mime(file.pathExtension), "Content-Length": "\(data.count)",
                                               "Cache-Control": "no-cache"])!
        task.didReceive(r); task.didReceive(data); task.didFinish()
    }
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    private func mime(_ ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "js": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json", "webmanifest": return "application/json"
        case "png": return "image/png"
        case "svg": return "image/svg+xml"
        default: return "application/octet-stream"
        }
    }
}

// MARK: - Main window

final class MainWindowController: NSWindowController, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate, NSWindowDelegate {
    let webView: WKWebView
    private var downloadTargets: [ObjectIdentifier: URL] = [:]

    init() {
        let cfg = WKWebViewConfiguration()
        let webRoot = Bundle.main.resourceURL!.appendingPathComponent("web")
        cfg.setURLSchemeHandler(BundleSchemeHandler(root: webRoot), forURLScheme: appScheme)
        cfg.websiteDataStore = .default()
        cfg.preferences.setValue(true, forKey: "developerExtrasEnabled")
        let flag = WKUserScript(source: "window.__SETWERK_NATIVE__=true;", injectionTime: .atDocumentStart, forMainFrameOnly: true)
        cfg.userContentController.addUserScript(flag)

        webView = WKWebView(frame: .zero, configuration: cfg)
        webView.setValue(false, forKey: "drawsBackground") // no white flash; page paints its own dark background
        if #available(macOS 13.3, *) { webView.isInspectable = true }

        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1320, height: 880),
                              styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
                              backing: .buffered, defer: false)
        window.title = "Setwerk"
        window.titlebarAppearsTransparent = true
        window.backgroundColor = NSColor(red: 0.043, green: 0.051, blue: 0.067, alpha: 1)
        window.appearance = NSAppearance(named: .darkAqua)
        window.minSize = NSSize(width: 760, height: 560)
        window.contentView = webView
        window.setFrameAutosaveName("SetwerkMain")
        if !window.setFrameUsingName("SetwerkMain") { window.center() }
        super.init(window: window)
        window.delegate = self
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.load(URLRequest(url: URL(string: "\(appScheme)://\(appHost)/index.html")!))
    }
    required init?(coder: NSCoder) { fatalError() }

    // Keep page content below the transparent title bar
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        webView.evaluateJavaScript("document.documentElement.style.setProperty('--titlebar','28px');document.querySelector('header')&&(document.querySelector('header').style.paddingTop='34px');", completionHandler: nil)
    }

    // Links to the web open in the default browser; blob/data links become downloads
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 preferences: WKWebpagePreferences,
                 decisionHandler: @escaping (WKNavigationActionPolicy, WKWebpagePreferences) -> Void) {
        if action.shouldPerformDownload { decisionHandler(.download, preferences); return }
        if let url = action.request.url, ["http", "https", "mailto"].contains(url.scheme ?? ""),
           action.navigationType == .linkActivated || action.targetFrame == nil {
            NSWorkspace.shared.open(url); decisionHandler(.cancel, preferences); return
        }
        decisionHandler(.allow, preferences)
    }
    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse,
                 decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        decisionHandler(response.canShowMIMEType ? .allow : .download)
    }
    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { download.delegate = self }
    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) { download.delegate = self }

    // target=_blank
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url { NSWorkspace.shared.open(url) }
        return nil
    }

    // MARK: Downloads (exports) → native save dialog
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse,
                  suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = suggestedFilename
        panel.directoryURL = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first
        panel.canCreateDirectories = true
        panel.beginSheetModal(for: window!) { result in
            guard result == .OK, let url = panel.url else { completionHandler(nil); return }
            try? FileManager.default.removeItem(at: url) // user already confirmed "Replace"
            self.downloadTargets[ObjectIdentifier(download)] = url
            completionHandler(url)
        }
    }
    func downloadDidFinish(_ download: WKDownload) {
        if let url = downloadTargets.removeValue(forKey: ObjectIdentifier(download)) {
            NSWorkspace.shared.activateFileViewerSelecting([url])
        }
    }
    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        downloadTargets.removeValue(forKey: ObjectIdentifier(download))
        let a = NSAlert(); a.messageText = "Export fehlgeschlagen"; a.informativeText = error.localizedDescription
        a.beginSheetModal(for: window!)
    }

    // MARK: File inputs → native open panel (files and folders, e.g. _Serato_)
    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.canChooseDirectories = parameters.allowsDirectories
        panel.canChooseFiles = !parameters.allowsDirectories
        panel.showsHiddenFiles = false
        panel.message = parameters.allowsDirectories ? "Wähle deinen _Serato_-Ordner (oder einen anderen Ordner)" : "Wähle Bibliotheks- oder Crate-Dateien"
        panel.beginSheetModal(for: window!) { r in completionHandler(r == .OK ? panel.urls : nil) }
    }

    // MARK: JS dialogs
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let a = NSAlert(); a.messageText = message
        a.beginSheetModal(for: window!) { _ in completionHandler() }
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let a = NSAlert(); a.messageText = message
        a.addButton(withTitle: "OK"); a.addButton(withTitle: "Abbrechen")
        a.beginSheetModal(for: window!) { r in completionHandler(r == .alertFirstButtonReturn) }
    }

    @objc func reloadPage(_ sender: Any?) { webView.reload() }
    @objc func showTab(_ sender: NSMenuItem) {
        webView.evaluateJavaScript("document.querySelector('nav button[data-tab=\"\(sender.representedObject as? String ?? "build")\"]')?.click()", completionHandler: nil)
    }
}

// MARK: - App

final class AppDelegate: NSObject, NSApplicationDelegate {
    var main: MainWindowController!

    func applicationDidFinishLaunching(_ n: Notification) {
        buildMenu()
        main = MainWindowController()
        main.showWindow(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ app: NSApplication) -> Bool { true }

    private func buildMenu() {
        let bar = NSMenu()
        func sub(_ title: String, _ items: [NSMenuItem]) {
            let top = NSMenuItem(); let m = NSMenu(title: title)
            items.forEach { m.addItem($0) }; top.submenu = m; bar.addItem(top)
        }
        func item(_ t: String, _ a: Selector?, _ k: String = "", _ mods: NSEvent.ModifierFlags = [.command]) -> NSMenuItem {
            let i = NSMenuItem(title: t, action: a, keyEquivalent: k); i.keyEquivalentModifierMask = mods; return i
        }
        sub("Setwerk", [
            item("Über Setwerk", #selector(NSApplication.orderFrontStandardAboutPanel(_:))),
            .separator(),
            item("Setwerk ausblenden", #selector(NSApplication.hide(_:)), "h"),
            item("Andere ausblenden", #selector(NSApplication.hideOtherApplications(_:)), "h", [.command, .option]),
            .separator(),
            item("Setwerk beenden", #selector(NSApplication.terminate(_:)), "q"),
        ])
        sub("Bearbeiten", [
            item("Widerrufen", Selector(("undo:")), "z"),
            item("Wiederholen", Selector(("redo:")), "z", [.command, .shift]),
            .separator(),
            item("Ausschneiden", #selector(NSText.cut(_:)), "x"),
            item("Kopieren", #selector(NSText.copy(_:)), "c"),
            item("Einsetzen", #selector(NSText.paste(_:)), "v"),
            item("Alles auswählen", #selector(NSText.selectAll(_:)), "a"),
        ])
        let tabs: [(String, String, String)] = [("Set-Builder", "build", "1"), ("Bibliothek", "lib", "2"), ("Smart Crates", "crates", "3")]
        sub("Ansicht", tabs.map { t in
            let i = item(t.0, #selector(MainWindowController.showTab(_:)), t.2); i.representedObject = t.1; return i
        } + [.separator(),
             item("Neu laden", #selector(MainWindowController.reloadPage(_:)), "r"),
             item("Vollbild", #selector(NSWindow.toggleFullScreen(_:)), "f", [.command, .control])])
        sub("Fenster", [
            item("Im Dock ablegen", #selector(NSWindow.performMiniaturize(_:)), "m"),
            item("Zoomen", #selector(NSWindow.performZoom(_:))),
        ])
        NSApp.mainMenu = bar
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
