import { app, BrowserWindow, shell, ipcMain, nativeTheme, Tray, Menu, Notification, nativeImage } from 'electron';
import { release } from 'os';
import { join } from 'path';
import Store from 'electron-store';
import './samples/npm-esm-packages';
import pkg from '../../package.json'
import { Row } from '@/store/mainStore';


// Conditionally include the dev tools installer to load React Dev Tools
let installExtension: any, REDUX_DEVTOOLS: any; // NEW!
if (!app.isPackaged) {
  const devTools = require("electron-devtools-installer");
  installExtension = devTools.default;
  REDUX_DEVTOOLS = devTools.REDUX_DEVTOOLS;
}
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

const { setupTitlebar, attachTitlebarToWindow } = require("custom-electron-titlebar/main");

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let win: BrowserWindow | null = null;

const store = new Store();
if (pkg.env.VITRON_CUSTOM_TITLEBAR) setupTitlebar();

async function createWindow() {
  let windowState: any = await store.get("windowState")
  if (!pkg.env.VITRON_SAVE_WINDOWSIZE) windowState = null
  win = new BrowserWindow({
    title: 'io',
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: pkg.env.VITRON_CUSTOM_TITLEBAR ? "hidden" : "default",
    x: windowState?.x || 0,
    y: windowState?.y || 0,
    width: windowState?.width || 1000,
    height: windowState?.height || 600,
    webPreferences: {
      nodeIntegration: true,
      preload: join(__dirname, '../preload/index.cjs'),
    },
  });

  if (app.isPackaged) {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  } else {
    // 🚧 Use ['ENV_NAME'] avoid vite:define plugin
    const url = `http://${process.env['VITE_DEV_SERVER_HOST']}:${process.env['VITE_DEV_SERVER_PORT']}`;

    win.loadURL(url);
    // win.webContents.openDevTools({mode: 'detach'});
  }

  // Test active push message to Renderer-process
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('close', () => {
    const windowState = win?.getBounds()
    if (pkg.env.VITRON_SAVE_WINDOWSIZE) store.set("windowState", windowState);
  });

  win.once('ready-to-show', () => {
    win?.show();
  });

  if (pkg.env.VITRON_CUSTOM_TITLEBAR) attachTitlebarToWindow(win);
}

const NOTIFICATION_TITLE = 'io - by Blade'
const NOTIFICATION_BODY = 'Testing Notification from the Main process'

function showNotification() {
  new Notification({ title: NOTIFICATION_TITLE, body: NOTIFICATION_BODY }).show()
}

let tray = null as any

app.whenReady().then(createWindow).then(async () => {
  if (!app.isPackaged) {
    await installExtension(REDUX_DEVTOOLS)
      .then((name: any) => console.log(`Added Extension:  ${name}`))
      .catch((error: any) => console.log(`An error occurred: , ${error}`));
  }
  if (pkg.env.VITRON_TRAY && tray === null) {
    const icon = nativeImage.createFromPath(join(__dirname, '../../resources/icon@5x.png'))
    tray = new Tray(join(__dirname, '../../resources/icon@5x.png'))

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show', click: () => win?.show() },
      { label: 'Minimize', click: () => win?.minimize() },
      { label: 'Minimize to tray', click: () => win?.hide() },
      { label: 'Test Notifiation', click: () => showNotification() },
      { label: 'seperator', type: 'separator' },
      { label: 'Dev', click: () => win?.webContents.openDevTools() },
      { label: 'seperator', type: 'separator' },
      { label: 'Restart io', click: () => { app.relaunch(); app.exit() } },
      { label: 'seperator', type: 'separator' },
      { label: 'Exit', click: () => app.quit() }
    ])
    tray.setToolTip('io by Blade')
    tray.setContextMenu(contextMenu)
    tray.setIgnoreDoubleClickEvents(true)
    tray.on('click', () => win?.show())
  }
  win?.webContents.once("did-finish-load", async function () {
    const express = require("express");
    const webapp = express(); // create express webapp
    const cors = require('cors')


    webapp.use(cors())
    webapp.get("/rows", async (req: any, res: any) => {
      const rows = await store.get("rows")
      if (req.query && req.query.id && req.query.update) {
        win?.webContents.send('update-row', {
          id: req.query.id,
          icon: decodeURIComponent(req.query.icon),
          label: decodeURIComponent(req.query.label),
          settings: {
            buttonColor: decodeURIComponent(req.query.buttonColor),
            iconColor: decodeURIComponent(req.query.iconColor),
            textColor: decodeURIComponent(req.query.textColor),
            variant: decodeURIComponent(req.query.variant)
          }
        });
        res.json(req.query);
      } else if (req.query && req.query.id) {
        win?.webContents.send('trigger-row', { id: req.query.id });
        res.json(req.query);
      } else {
        res.json(rows);
      }
    });
    webapp.get("/restart", async (req: any, res: any) => {
      res.json({ message: 'ok' });
      app.relaunch()
      app.exit()
    });

    // add middleware

    webapp.use('/', express.static(join(__dirname, '../renderer')));
    webapp.use('/deck', express.static(join(__dirname, '../renderer')));

    // start express server on port 1337
    webapp.listen(1337, () => {
      console.log("server started on port 1337");
    });

  });

});

app.on('window-all-closed', () => {
  win = null;
  if (tray !== null) tray.destroy();
  if (process.platform !== 'darwin') app.quit();
});

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});

ipcMain.on('set', async (event, arg) => {
  // console.log(arg[0], arg[1]);
  await store.set(arg[0], arg[1]);
  event.sender.send('ping-pong', `[ipcMain] "${arg}" received asynchronously.`);
});
ipcMain.on('get', async (event, arg) => {
  const res: any = await store.get(arg);
  event.sender.send('get', res);
});

ipcMain.on('ping-pong', async (event, arg) => {
  event.sender.send('ping-pong', `[ipcMain] "${arg}" received asynchronously.`);
});
const wemore = require('wemore')
let device = null as any
ipcMain.on('emulate-alexa-devices', (event, devices) => {
  devices.map((d: string, i: number) => {
    // if (device === null) {
    device = wemore.Emulate({ friendlyName: d, port: 9001 + i })
    device.on('listening', function () {
      console.log(d + ' listening on', 9001 + i)
    })

    device.on('on', function (_self: any, _sender: any) {
      win?.webContents.send('alexa-device', { device: d, state: 'on' });
      console.log(d + ' on')
    })

    device.on('off', function (_self: any, _sender: any) {
      win?.webContents.send('alexa-device', { device: d, state: 'off' });
      console.log(d + ' off')
    })
    // }

  })
  event.returnValue = `[ipcMain] "${devices}" received synchronously.`;
});

process.on('uncaughtException', function (error) {
  // Handle the error
  if (!error.message.startsWith('listen EADDRINUSE: address already in use'))
    console.log(error)
})

ipcMain.on('run-shell', (event, arg) => {
  const { exec } = require("child_process");
  exec(arg, (error: any, stdout: any, stderr: any) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    win?.webContents.send('run-shell-answer', { result: stdout });
    console.log(`stdout: ${stdout}`);
  });
  event.returnValue = `[ipcMain] "${arg}" received synchronously.`;
});
ipcMain.on('ping-pong-sync', (event, arg) => {
  event.returnValue = `[ipcMain] "${arg}" received synchronously.`;
});

ipcMain.on('get-darkmode', (event) => {
  event.returnValue = nativeTheme.shouldUseDarkColors ? "yes" : "no";
});
ipcMain.on('toggle-darkmode', (event) => {
  const res = nativeTheme.themeSource === 'system' ? (nativeTheme.shouldUseDarkColors ? 'light' : 'dark') : nativeTheme.themeSource === 'dark' ? 'light' : 'dark';
  event.returnValue = res === 'dark'
  nativeTheme.themeSource = res
  if (pkg.env.VITRON_CUSTOM_TITLEBAR) win?.reload();
});
ipcMain.on('restart-app', (event) => {
  // win?.reload()
  app.relaunch()
  app.exit()
});
