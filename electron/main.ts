import { app, BrowserWindow, shell, Menu, Tray, nativeImage, NativeImage, protocol } from 'electron';
import path from 'path';
import { APP_VERSION, GITHUB_REPO, DOWNLOAD_FILENAME } from './version';

// Use production URL when packaged, development URL otherwise
const isDev = !app.isPackaged;

// URLs for the app - use environment variable or defaults
const DEV_URL = process.env.DEV_URL || 'http://localhost:3000';
const PROD_URL = process.env.PROD_URL || 'https://drawdowndesk.vercel.app';

// Download URL for the app
const DOWNLOAD_URL = `https://github.com/${GITHUB_REPO}/releases/download/${APP_VERSION}/${DOWNLOAD_FILENAME}`;

// Icon path - uses favicon.ico from the app folder
const ICON_PATH = path.join(__dirname, '..', 'src', 'app', 'favicon.ico');

// Custom protocol for auth callback
const PROTOCOL_NAME = 'drawdowndesk';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createWindow() {
  // Try to load icon, fallback to undefined if not found
  let icon: NativeImage | undefined;
  try {
    icon = nativeImage.createFromPath(ICON_PATH);
    if (icon.isEmpty()) {
      icon = undefined;
    }
  } catch {
    icon = undefined;
  }

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
    show: false,
    backgroundColor: '#0a0a0a',
  };

  // Only set icon if we have a valid icon file
  if (icon) {
    windowOptions.icon = icon;
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Load the app
  const url = isDev ? DEV_URL : PROD_URL;
  mainWindow.loadURL(url);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    console.log(`DrawdownDesk loaded: ${url}`);
  });

  // Handle popup windows - open in new Electron window for OAuth
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // If it's an OAuth URL, open in a new window within Electron
    if (url.includes('auth.convex') || url.includes('googleapis') || url.includes('accounts.google') || url.includes('oauth')) {
      const authWindow = new BrowserWindow({
        width: 500,
        height: 600,
        parent: mainWindow || undefined,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
        },
      });
      authWindow.loadURL(url);
      return { action: 'deny' };
    }

    // For other popups, open externally
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle navigation - allow auth redirects to stay within webview
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow all Convex and auth-related domains
    const isAuthRelated = url.includes('convex.cloud') ||
                          url.includes('convex.site') ||
                          url.includes('auth.convex') ||
                          url.includes('googleapis') ||
                          url.includes('accounts.google') ||
                          url.includes('google.com/');

    // Only block truly external non-auth sites
    if (!isAuthRelated && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

function createTray() {
  // Try to load tray icon, fallback to empty if not found
  let trayIcon: NativeImage;
  try {
    trayIcon = nativeImage.createFromPath(ICON_PATH);
    if (trayIcon.isEmpty()) {
      // Create a simple 16x16 default icon if file not found
      trayIcon = nativeImage.createEmpty();
    }
    // Resize for tray (16x16)
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  } catch {
    trayIcon = nativeImage.createEmpty();
  }
  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open DrawdownDesk',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip('DrawdownDesk');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://drawdowndesk.com');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Register custom protocol for OAuth callback
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL_NAME, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL_NAME);
}

// Handle protocol URL on Windows
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    // Handle protocol URL from second instance
    const url = commandLine.find(arg => arg.startsWith(`${PROTOCOL_NAME}://`));
    if (url && mainWindow) {
      mainWindow.loadURL(url.replace(`${PROTOCOL_NAME}://`, PROD_URL + '/'));
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Handle open-url event (macOS)
  app.on('open-url', (event, url) => {
    event.preventDefault();
    if (mainWindow) {
      mainWindow.loadURL(url.replace(`${PROTOCOL_NAME}://`, PROD_URL + '/'));
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  createMenu();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
