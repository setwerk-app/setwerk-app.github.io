// Setwerk Admin – kleine Mac-App, die das Admin-Panel (Downloads, Besucher, Herkunft) öffnet.
import Cocoa
import WebKit

let adminURL = URL(string: "https://zthsydnhbt-hub.github.io/setwerk/admin/")!
let repoAPI = "https://api.github.com/repos/zthsydnhbt-hub/setwerk"

// Holt GitHub-Statistiken mit der vorhandenen GitHub-Anmeldung dieses Macs (gh CLI).
// Der Zugangsschlüssel bleibt in der App und wird nie an die Webseite weitergegeben.
// Erlaubt sind ausschließlich die Statistik-Endpunkte dieses einen Repositorys.
final class GitHubBridge: NSObject, WKScriptMessageHandlerWithReply {
    static let allowed: Set<String> = ["/traffic/views", "/traffic/clones", "/traffic/popular/referrers", "/traffic/popular/paths"]
    static var cachedToken: String?
    static func token() -> String? {
        if let t = cachedToken { return t }
        for path in ["/opt/homebrew/bin/gh", "/usr/local/bin/gh", "/usr/bin/gh"] where FileManager.default.isExecutableFile(atPath: path) {
            let p = Process(); p.executableURL = URL(fileURLWithPath: path); p.arguments = ["auth", "token", "-h", "github.com"]
            let out = Pipe(); p.standardOutput = out; p.standardError = Pipe()
            do { try p.run() } catch { continue }
            p.waitUntilExit()
            if p.terminationStatus == 0, let t = String(data: out.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8)?
                .trimmingCharacters(in: .whitespacesAndNewlines), !t.isEmpty { cachedToken = t; return t }
        }
        return nil
    }
    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard let path = message.body as? String, GitHubBridge.allowed.contains(path) else { replyHandler(nil, "nicht erlaubt"); return }
        DispatchQueue.global(qos: .userInitiated).async {
            guard let token = GitHubBridge.token() else {
                DispatchQueue.main.async { replyHandler(nil, "Keine GitHub-Anmeldung auf diesem Mac gefunden") }; return
            }
            var req = URLRequest(url: URL(string: repoAPI + path)!)
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
            URLSession.shared.dataTask(with: req) { data, resp, _ in
                let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
                DispatchQueue.main.async {
                    if code == 200, let d = data, let s = String(data: d, encoding: .utf8) { replyHandler(s, nil) }
                    else { replyHandler(nil, "GitHub antwortet mit \(code)") }
                }
            }.resume()
        }
    }
}

final class AdminWindow: NSWindowController, WKNavigationDelegate, WKUIDelegate {
    let web: WKWebView
    init() {
        let cfg = WKWebViewConfiguration()
        cfg.websiteDataStore = .default()
        cfg.userContentController.addScriptMessageHandler(GitHubBridge(), contentWorld: .page, name: "gh")
        web = WKWebView(frame: .zero, configuration: cfg)
        web.setValue(false, forKey: "drawsBackground")
        let w = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1240, height: 860),
                         styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
                         backing: .buffered, defer: false)
        w.title = "Setwerk Admin"; w.titlebarAppearsTransparent = true
        w.appearance = NSAppearance(named: .darkAqua)
        w.backgroundColor = NSColor(red: 0.043, green: 0.051, blue: 0.067, alpha: 1)
        w.minSize = NSSize(width: 700, height: 500); w.contentView = web
        w.setFrameAutosaveName("SetwerkAdmin"); if !w.setFrameUsingName("SetwerkAdmin") { w.center() }
        super.init(window: w)
        web.navigationDelegate = self; web.uiDelegate = self
        load()
    }
    required init?(coder: NSCoder) { fatalError() }
    func load() { web.load(URLRequest(url: adminURL, cachePolicy: .reloadRevalidatingCacheData)) }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        webView.evaluateJavaScript("document.querySelector('header')&&(document.querySelector('header').style.paddingTop='34px')", completionHandler: nil)
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        webView.loadHTMLString("""
        <body style="background:#0b0d11;color:#e8ebf2;font:15px -apple-system;display:flex;align-items:center;justify-content:center;height:90vh;text-align:center">
        <div><div style="font-size:44px">📡</div><h2>Keine Verbindung</h2><p style="color:#8b93a7">Das Admin-Panel lädt die Zahlen live von GitHub.<br>Bitte Internetverbindung prüfen und mit ⌘R neu laden.</p></div></body>
        """, baseURL: nil)
    }
    // Links (Releases, GitHub, Token-Seite) im Standardbrowser öffnen
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let u = action.request.url, action.navigationType == .linkActivated || action.targetFrame == nil, u.host != adminURL.host {
            NSWorkspace.shared.open(u); decisionHandler(.cancel); return
        }
        decisionHandler(.allow)
    }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let u = action.request.url { NSWorkspace.shared.open(u) }; return nil
    }
    @objc func reloadPage(_ sender: Any?) { load() }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    var win: AdminWindow!
    func applicationDidFinishLaunching(_ n: Notification) {
        let bar = NSMenu()
        func sub(_ t: String, _ items: [NSMenuItem]) { let top = NSMenuItem(); let m = NSMenu(title: t); items.forEach { m.addItem($0) }; top.submenu = m; bar.addItem(top) }
        func item(_ t: String, _ a: Selector?, _ k: String = "", _ mods: NSEvent.ModifierFlags = [.command]) -> NSMenuItem { let i = NSMenuItem(title: t, action: a, keyEquivalent: k); i.keyEquivalentModifierMask = mods; return i }
        sub("Setwerk Admin", [item("Über Setwerk Admin", #selector(NSApplication.orderFrontStandardAboutPanel(_:))), .separator(),
                              item("Setwerk Admin ausblenden", #selector(NSApplication.hide(_:)), "h"), .separator(),
                              item("Setwerk Admin beenden", #selector(NSApplication.terminate(_:)), "q")])
        sub("Bearbeiten", [item("Widerrufen", Selector(("undo:")), "z"), item("Wiederholen", Selector(("redo:")), "z", [.command, .shift]), .separator(),
                           item("Ausschneiden", #selector(NSText.cut(_:)), "x"), item("Kopieren", #selector(NSText.copy(_:)), "c"),
                           item("Einsetzen", #selector(NSText.paste(_:)), "v"), item("Alles auswählen", #selector(NSText.selectAll(_:)), "a")])
        sub("Ansicht", [item("Neu laden", #selector(AdminWindow.reloadPage(_:)), "r")])
        sub("Fenster", [item("Im Dock ablegen", #selector(NSWindow.performMiniaturize(_:)), "m")])
        NSApp.mainMenu = bar
        win = AdminWindow(); win.showWindow(nil); NSApp.activate(ignoringOtherApps: true)
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ s: NSApplication) -> Bool { true }
}
let app = NSApplication.shared; let delegate = AppDelegate(); app.delegate = delegate; app.setActivationPolicy(.regular); app.run()
