const path = require("path");
const contextMenu = require("electron-context-menu");
const fs = require("fs");
const {
  app,
  BrowserWindow,
  Menu,
  BrowserView,
  ipcMain,
  session,
  clipboard,
  Notification,
  dialog,
} = require("electron");
const { autoUpdater } = require("electron-updater");
let mainWindow;
let browserView;
const TITLEBAR_HEIGHT = 40;
const SITE_URL = "http://10.10.10.5/";

// set URL Protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("intranet", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("intranet");
}
let rightClickText = null;
// Handle browser view opening
function browserViewOpening(path) {
  if (browserView && mainWindow) {
    const contentBounds = mainWindow.getContentBounds();
    browserView.setBounds({
      x: 0,
      y: TITLEBAR_HEIGHT,
      width: contentBounds.width,
      height: contentBounds.height - TITLEBAR_HEIGHT,
    });
    browserView.setAutoResize({ width: true, height: true });
    browserView.webContents.loadURL(`${SITE_URL}${path ?? ""}`);
  }
}

// Handle open app and redirect to page
function handleOpenAppAndRedirectToPage(url) {
  const urlWrapped =
    typeof url === "string" &&
    (url.startsWith("intranet://") || url.startsWith(SITE_URL))
      ? url.replace("intranet://", "").replace(SITE_URL, "")
      : null;

  if (urlWrapped) {
    browserViewOpening(urlWrapped);
  } else if (url.includes("/api/v1/files/exports")) {
    handleDownload({ url });
  }
}
function handleDownload(payload) {
  let properties = payload.properties ? { ...payload.properties } : {};
  const defaultPath = app.getPath(
    properties.directory ? properties.directory : "documents"
  );
  const defaultFileName = properties.filename
    ? properties.filename
    : payload?.url?.split("?")?.[0]?.split("/")?.pop();
  let customURL = dialog.showSaveDialogSync({
    defaultPath: `${defaultPath}/${defaultFileName}`,
  });

  filePath = customURL;
  if (filePath) browserView.webContents.downloadURL(payload.url);
}
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1280,
    minWidth: 600,
    show: false,
    frame: false,
    backgroundColor: "#11101d",
    icon: `${__dirname}/favicon.ico`,
    webPreferences: {
      preload: `${__dirname}/preload.js`,
      // devTools: false,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  browserView = new BrowserView({
    width: 1600,
    height: 900,
    minWidth: 1280,
    minWidth: 600,
    webPreferences: {
      preload: `${__dirname}/preload-browserview.js`,
      // devTools: true,

      sandbox: false,
      contextIsolation: false,
    },
  });
  contextMenu({
    window: browserView,
    showCopyImage: true,
    showCopyImageAddress: true,
    showCopyLink: true,
    showLearnSpelling: true,
    showSaveImage: true,
    showSaveImageAs: true,
    showServices: true,
    showInspectElement: false,
    prepend: () => [
      {
        label: "Copiar Texto",
        visible: Boolean(rightClickText),
        click: () => {
          if (rightClickText) {
            clipboard.writeText(rightClickText);
            const abortController = new AbortController();
            dialog.showMessageBox(null, {
              type: "info",
              // defaultId: 2,
              signal: abortController.signal,
              title: "Texto Copiado!",
              message: `O Texto foi copiado:`,
              detail:
                rightClickText.length > 20
                  ? `${rightClickText.slice(0, 20)}...`
                  : rightClickText,
              icon: `${__dirname}/favicon.ico`,
            });
            setTimeout(() => {
              abortController.abort();
            }, 1500);
          }
        },
      },
    ],
    labels: {
      copy: "Copiar",
      copyImage: "Copiar imagem",
      copyImageAddress: "Copiar endereço do link",
      copyLink: "Copiar endereço do link",
      saveImage: "Salvar imagem",
      saveImageAs: "Salvar imagem como...",
      selectAll: "Selecionar tudo",
    },
  });
  mainWindow.setBrowserView(browserView);
  mainWindow.loadFile(path.join(__dirname, "./src/index.html"));
  mainWindow.webContents.send("isLoading", true);
  if (!app.isPackaged) {
    browserViewOpening();
  }
  function handleWindowChange() {
    const contentBounds = mainWindow.getContentBounds();
    browserView.setBounds({
      x: 0,
      y: TITLEBAR_HEIGHT,
      width: contentBounds.width,
      height: contentBounds.height - TITLEBAR_HEIGHT,
    });
  }
  mainWindow.on("will-resize", handleWindowChange);
  mainWindow.on("maximize", handleWindowChange);
  mainWindow.on("unmaximize", handleWindowChange);

  function handleLoading(isLoading) {
    return () => {
      mainWindow.webContents.send("arrow-navigation", {
        canGoBack: browserView.webContents.canGoBack(),
        canGoForward: browserView.webContents.canGoForward(),
      });
      mainWindow.webContents.send("isLoading", isLoading);
    };
  }
  browserView.webContents.on("did-start-loading", handleLoading(true));
  browserView.webContents.on("did-stop-loading", handleLoading(false));
  browserView.webContents.on("will-navigate", handleLoading(true));
  browserView.webContents.on("did-navigate", handleLoading(false));

  browserView.webContents.setZoomFactor(1.0);
  browserView.webContents
    .setVisualZoomLevelLimits(1, 5)
    .then(console.log("Zoom Levels Have been Set between 100% and 500%"))
    .catch((err) => console.log(err));
  browserView.webContents.on("zoom-changed", (event, zoomDirection) => {
    var currentZoom = browserView.webContents.getZoomFactor();

    if (zoomDirection === "in") {
      browserView.webContents.zoomFactor = currentZoom + 0.2;
    }
    if (zoomDirection === "out") {
      browserView.webContents.zoomFactor = currentZoom - 0.2;
    }
  });
  let filePath = null;
  ipcMain.on("download", async (e, { payload }) => {
    handleDownload(payload);
  });
  browserView.webContents.session.on(
    "will-download",
    (event, item, webContents) => {
      item.setSavePath(filePath);
    }
  );
  ipcMain.on("send-notification", (e, notificationOptions) => {
    try {
      const notification = new Notification(notificationOptions);
      if (notificationOptions.urlNotify) {
        notification.on("click", () => {
          handleOpenAppAndRedirectToPage(notificationOptions.urlNotify);
        });
      }
      notification.show();
    } catch (error) {
      console.error("Error whe sending notification", error);
    }
  });
  ipcMain.on("rightClickApp", (e, el) => {
    rightClickText = el;
  });
  ipcMain.on("copyText", (e, rightClickText) => {
    clipboard.writeText(rightClickText);
    const abortController = new AbortController();
    dialog.showMessageBox(null, {
      type: "info",
      // defaultId: 2,
      signal: abortController.signal,
      title: "Texto Copiado!",
      message: `O Texto foi copiado:`,
      detail:
        rightClickText.length > 20
          ? `${rightClickText.slice(0, 20)}...`
          : rightClickText,
      icon: `${__dirname}/favicon.ico`,
    });
    setTimeout(() => {
      abortController.abort();
    }, 1000);
  });
  ipcMain.on("reinicializeApp", () => {
    const appName = app.getName();
    const getAppPath = path.join(app.getPath("appData"), appName);
    fs.unlink(getAppPath, async () => {
      await session.defaultSession.clearStorageData();
      await session.defaultSession.clearCache();
      app.relaunch();
      app.exit();
    });
  });
  ipcMain.on("reloadApp", () => {
    browserView.webContents.reload();
  });
  ipcMain.on("backApp", () => {
    browserView.webContents.goBack();
  });
  ipcMain.on("forwardApp", () => {
    browserView.webContents.goForward();
  });
  ipcMain.on("minimizeApp", () => {
    mainWindow.minimize();
  });

  ipcMain.on("maximizeApp", () => {
    if (mainWindow.isMaximized()) {
      mainWindow.restore();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on("closeApp", () => {
    mainWindow.close();
  });

  mainWindow.on("ready-to-show", mainWindow.show);
  Menu.setApplicationMenu(null);

  mainWindow.on("closed", function () {
    mainWindow = null;
  });
  // Check if is maximize
  mainWindow.on("maximize", () => {
    mainWindow.webContents.send("isMaximized");
  });
  mainWindow.on("unmaximize", () => {
    mainWindow.webContents.send("isRestored");
  });

  // mainWindow.webContents.openDevTools();
  // browserView.webContents.openDevTools();
  // Protocol handler for win32
  if (process.platform == "win32") {
    handleOpenAppAndRedirectToPage(process.argv.slice(1));
    app.setAppUserModelId("intranet-amaranzero");
  }
}

app.on("ready", createWindow);
// Windows
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine) => {
    event.preventDefault();
    // Protocol handler for win32
    if (process.platform == "win32") {
      handleOpenAppAndRedirectToPage(commandLine[commandLine.length - 1]);
      app.setAppUserModelId(app.name);
    }
    if (mainWindow && mainWindow.isMinimized()) mainWindow.restore();
  });
}
// Protocol handler for OSX
app.on("open-url", function (event, url) {
  event.preventDefault();
  handleOpenAppAndRedirectToPage(url);
});

function showMessage(message) {
  mainWindow.webContents.send("updateMessage", message);
}
app.whenReady().then(() => {
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  if (app.isPackaged) {
    browserView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    autoUpdater.checkForUpdates();
    showMessage({
      text: "Buscando por atualizações...",
      progress: undefined,
    });
  }
});

autoUpdater.on("update-available", (info) => {
  showMessage({
    text: `Atualização Disponível. Versão Atual: ${app.getVersion()}`,
    progress: undefined,
  });
  autoUpdater.downloadUpdate();
});
autoUpdater.on("download-progress", (info) => {
  showMessage({
    text: null,
    progress: info.percent,
  });
});
autoUpdater.on("update-not-available", (info) => {
  showMessage({
    text: `Não há Atualização Disponível. Versão Atual: ${app.getVersion()}`,
    progress: undefined,
  });
  setTimeout(() => {
    showMessage(null);
    browserViewOpening();
  }, 1000);
});

/*Download Completion Message*/
autoUpdater.on("update-downloaded", (info) => {
  showMessage({
    text: `Atualização Concluída. Versão Atual: ${app.getVersion()}`,
    progress: 100,
  });

  setTimeout(() => {
    showMessage(null);
    browserViewOpening();
    autoUpdater.quitAndInstall();
  }, 1000);
});

autoUpdater.on("error", (info) => {
  showMessage({
    text:
      "Parece que ocorreu um erro na atualização! Contate o time de TI" + info,
    progress: undefined,
    erro: true,
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
