// Setwerk für Windows – WinForms-Fenster mit WebView2 (Edge-Engine).
// Die Web-App liegt im Ordner "web" neben der exe und wird über https://setwerk.app/ geladen
// (feste Herkunft → Bibliothek, Crates und Sets bleiben dauerhaft gespeichert).
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Setwerk
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }

    sealed class MainForm : Form
    {
        const string Host = "setwerk.app";
        const string WebView2Download = "https://go.microsoft.com/fwlink/p/?LinkId=2124703";
        readonly WebView2 web = new WebView2 { Dock = DockStyle.Fill, DefaultBackgroundColor = Color.FromArgb(13, 15, 20) };

        [DllImport("dwmapi.dll")]
        static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int value, int size);

        public MainForm()
        {
            Text = "Setwerk";
            Width = 1320; Height = 880;
            MinimumSize = new Size(760, 560);
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = Color.FromArgb(11, 13, 17);
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
            Controls.Add(web);
            Load += async (s, e) => await InitAsync();
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            int on = 1; // dunkle Titelleiste (Windows 10 20H1+ / Windows 11)
            try { DwmSetWindowAttribute(Handle, 20, ref on, 4); } catch { }
        }

        async Task InitAsync()
        {
            try
            {
                string data = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Setwerk", "WebView2");
                var env = await CoreWebView2Environment.CreateAsync(null, data);
                await web.EnsureCoreWebView2Async(env);
            }
            catch (Exception ex)
            {
                var r = MessageBox.Show(this,
                    "Setwerk braucht die „Microsoft Edge WebView2-Runtime“ (bei Windows 11 bereits enthalten).\n\nJetzt die Download-Seite öffnen?\n\nDetails: " + ex.Message,
                    "Setwerk", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
                if (r == DialogResult.Yes) OpenExternal(WebView2Download);
                Close();
                return;
            }

            CoreWebView2 core = web.CoreWebView2;
            string root = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "web");
            core.SetVirtualHostNameToFolderMapping(Host, root, CoreWebView2HostResourceAccessKind.Allow);
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.AreDevToolsEnabled = true;
            await core.AddScriptToExecuteOnDocumentCreatedAsync("window.__SETWERK_NATIVE__=true;");

            // Externe Links im Standardbrowser öffnen
            core.NewWindowRequested += (s, e) => { e.Handled = true; OpenExternal(e.Uri); };
            core.NavigationStarting += (s, e) =>
            {
                Uri u;
                if (Uri.TryCreate(e.Uri, UriKind.Absolute, out u) && (u.Scheme == "http" || u.Scheme == "https") && u.Host != Host)
                {
                    e.Cancel = true; OpenExternal(e.Uri);
                }
            };

            // Exporte (M3U8, Rekordbox-XML, Serato-Crate, PDF) mit „Speichern unter“-Dialog
            core.DownloadStarting += (s, e) =>
            {
                CoreWebView2Deferral deferral = e.GetDeferral();
                BeginInvoke(new Action(() =>
                {
                    try
                    {
                        using (var dlg = new SaveFileDialog
                        {
                            FileName = Path.GetFileName(e.ResultFilePath),
                            InitialDirectory = Path.GetDirectoryName(e.ResultFilePath),
                            OverwritePrompt = true,
                            Title = "Export speichern"
                        })
                        {
                            if (dlg.ShowDialog(this) == DialogResult.OK) { e.ResultFilePath = dlg.FileName; e.Handled = true; }
                            else e.Cancel = true;
                        }
                    }
                    finally { deferral.Complete(); }
                }));
            };

            core.Navigate("https://" + Host + "/index.html");
        }

        static void OpenExternal(string url)
        {
            try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); } catch { }
        }
    }
}
