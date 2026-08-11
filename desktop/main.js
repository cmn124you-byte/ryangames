const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const fs = require("fs");

const siteDir = app.isPackaged
  ? path.join(process.resourcesPath, "site")
  : path.resolve(__dirname, "..");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 420,
    minHeight: 640,
    title: "Ryan Games — ريان ألعاب",
    backgroundColor: "#0f172a",
    icon: path.join(siteDir, "icons", "icon-512.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.setWindowOpenHandler(function ({ url }) {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", function (e, url) {
    const isLocal = url.indexOf("file://") === 0 || url.indexOf("http://localhost") === 0;
    if (!isLocal) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  const index = path.join(siteDir, "index.html");
  if (!fs.existsSync(index)) {
    mainWindow.loadURL("data:text/html;charset=utf-8," +
      encodeURIComponent("<h1>Ryan Games</h1><p>تعذر العثور على ملفات الموقع. أعد تثبيت التطبيق.</p>"));
    return;
  }
  mainWindow.loadFile(index);
  mainWindow.on("closed", function () { mainWindow = null; });
}

app.whenReady().then(function () {
  createWindow();
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
