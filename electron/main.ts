import { app, BrowserWindow, shell, Menu, Tray, nativeImage, NativeImage, ipcMain, screen, Notification } from 'electron';
import path from 'path';
import Store from 'electron-store';
import { APP_VERSION, GITHUB_REPO, DOWNLOAD_FILENAME } from './version';

// Window state store
interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store: any = new Store({
  name: 'window-state',
  defaults: {
    windowState: {
      width: 1400,
      height: 900,
    },
  },
});

// Use production URL when packaged, development URL otherwise
const isDev = !app.isPackaged;

// URLs for the app - use environment variable or defaults
const DEV_URL = process.env.DEV_URL || 'http://localhost:3000';
const PROD_URL = process.env.PROD_URL || 'https://drawdowndesk.vercel.app';

// Download URL for the app (reserved for future auto-update feature)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _DOWNLOAD_URL = `https://github.com/${GITHUB_REPO}/releases/download/${APP_VERSION}/${DOWNLOAD_FILENAME}`;

// Icon path - uses favicon.ico from the app folder
// Use app.getAppPath() for proper path in both dev and production
const getIconPath = () => {
  // In development, app.getAppPath() returns project root
  // In production, it returns the app.asar location
  const appPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app')
    : app.getAppPath();
  return path.join(appPath, 'src', 'app', 'favicon.ico');
};

// Custom protocol for auth callback
const PROTOCOL_NAME = 'drawdowndesk';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createWindow() {
  // Load saved window state with validation
  const defaultState = { width: 1400, height: 900 };
  let windowState = store.get('windowState') || defaultState;

  // Validate window state - ensure it's on screen
  const displays = screen.getAllDisplays();
  const isOnScreen = displays.some((display: Electron.Display) => {
    const bounds = display.bounds;
    return windowState.x !== undefined &&
           windowState.y !== undefined &&
           windowState.x >= bounds.x - 100 &&
           windowState.x < bounds.x + bounds.width &&
           windowState.y >= bounds.y - 100 &&
           windowState.y < bounds.y + bounds.height;
  });

  // Reset position if not on any screen
  if (!isOnScreen) {
    windowState = { ...windowState, x: undefined, y: undefined };
  }

  // Try to load icon, fallback to undefined if not found
  let icon: NativeImage | undefined;
  try {
    const iconPath = getIconPath();
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      icon = undefined;
    }
  } catch {
    icon = undefined;
  }

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: true,
    },
    show: false,
    backgroundColor: '#0a0a0a',
  };

  // Only set icon if we have a valid icon file
  if (icon) {
    windowOptions.icon = icon;
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Restore maximized state if it was saved
  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  // Debounced window state save
  let saveTimeout: NodeJS.Timeout | null = null;
  const saveWindowState = () => {
    if (!mainWindow) return;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if (!mainWindow) return;
      const bounds = mainWindow.getBounds();
      store.set('windowState', {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        isMaximized: mainWindow.isMaximized(),
      } as WindowState);
    }, 500);
  };

  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);

  // Load the app
  const url = isDev ? DEV_URL : PROD_URL;
  mainWindow.loadURL(url);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    console.log(`DrawdownDesk loaded: ${url}`);
    // Create tray after window is shown (optimized startup)
    createTray();
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
    // Block non-http(s) protocols except our custom protocol
    try {
      const parsedUrl = new URL(url);
      const allowedProtocols = ['https:', 'http:', 'drawdowndesk:'];
      if (!allowedProtocols.includes(parsedUrl.protocol)) {
        event.preventDefault();
        return;
      }
    } catch {
      event.preventDefault();
      return;
    }

    // Allow navigation within the app's own domain (development and production)
    const appUrl = isDev ? DEV_URL : PROD_URL;
    const parsedAppUrl = new URL(appUrl);
    const parsedNavUrl = new URL(url);

    // Check if the URL is on the app's domain (same host)
    const isInternalNavigation = parsedNavUrl.host === parsedAppUrl.host;

    // Allow all Convex and auth-related domains
    const isAuthRelated = url.includes('convex.cloud') ||
                          url.includes('convex.site') ||
                          url.includes('auth.convex') ||
                          url.includes('googleapis') ||
                          url.includes('accounts.google') ||
                          url.includes('google.com/');

    // Only open externally if it's NOT internal navigation AND NOT auth-related AND NOT a file URL
    if (!isInternalNavigation && !isAuthRelated && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
    // If it's internal navigation or auth-related, let it proceed normally (do nothing)
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in development only when explicitly requested
  if (isDev && process.env.ELECTRON_OPEN_DEVTOOLS === 'true') {
    mainWindow.webContents.openDevTools();
  }
}

function createTray() {
  // Try to load tray icon, fallback to empty if not found
  let trayIcon: NativeImage;
  try {
    const iconPath = getIconPath();
    trayIcon = nativeImage.createFromPath(iconPath);
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

  tray.setToolTip(`DrawdownDesk ${APP_VERSION}`);
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
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', accelerator: 'CmdOrCtrl+Z' },
        { role: 'redo', accelerator: 'Shift+CmdOrCtrl+Z' },
        { type: 'separator' },
        { role: 'cut', accelerator: 'CmdOrCtrl+X' },
        { role: 'copy', accelerator: 'CmdOrCtrl+C' },
        { role: 'paste', accelerator: 'CmdOrCtrl+V' },
        { role: 'selectAll', accelerator: 'CmdOrCtrl+A' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', accelerator: 'CmdOrCtrl+R' },
        { role: 'forceReload', accelerator: 'CmdOrCtrl+Shift+R' },
        { role: 'toggleDevTools', accelerator: 'F12' },
        { type: 'separator' },
        { role: 'resetZoom', accelerator: 'CmdOrCtrl+0' },
        { role: 'zoomIn', accelerator: 'CmdOrCtrl+=' },
        { role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
        { type: 'separator' },
        { role: 'togglefullscreen', accelerator: 'F11' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize', accelerator: 'CmdOrCtrl+M' },
        { role: 'close', accelerator: 'CmdOrCtrl+W' },
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
        {
          label: `Version ${APP_VERSION}`,
          enabled: false,
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers for renderer communication
function setupIpcHandlers() {
  ipcMain.handle('get-app-version', () => {
    return APP_VERSION;
  });

  ipcMain.handle('open-external', async (event, url: string) => {
    // Validate URL before opening
    try {
      const parsedUrl = new URL(url);
      // Only allow http/https
      if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
        await shell.openExternal(url);
        return { success: true };
      }
      return { success: false, error: 'Invalid protocol' };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.on('show-notification', (event, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });
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

// Set Windows app user model ID for proper icon handling
if (process.platform === 'win32') {
  app.setAppUserModelId('com.drawdowndesk.app');
}

app.whenReady().then(() => {
  setupIpcHandlers();
  createMenu();
  createWindow();

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
