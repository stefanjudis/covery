'use strict';

const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  screen
} = require('electron');
const { parsePhoneNumberFromString } = require('libphonenumber-js');

function createCoveryWindow({ options, text }) {
  const number = parsePhoneNumberFromString(text);

  const display = screen.getPrimaryDisplay();

  let win = new BrowserWindow({
    width: display.bounds.width * 0.85,
    height: 225,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: {
      nodeIntegration: true
    }
  });

  win.center();

  win.on('closed', () => {
    win = null;
  });

  win.loadURL(`data:text/html;charset=UTF-8,<!DOCTYPE html>
  <html>
    <head>
      <title>Coverext</title>
      <meta charset="UTF-8">
      <style>
        html, body {
          margin: 0;
          padding: 0;
          text-align: center;
          font-family: sans-serif;
          background: rgba(0, 0, 0, 0.55);
          color: rgba(255, 255, 255, 1);
          height: 100%;
        }

        .top-left {
          position: absolute;
          top: 0;
          left: 0;
        }

        button {
          background: transparent;
          padding: 0.5em 0.375em;
          color: rgba(255, 255, 255, 0.5);
          border: none;
          font-size: .75em;
          outline: none;
        }

        .top-right {
          position: absolute;
          top: 0;
          right: 0;
        }

        h1 {
          padding: 1rem;
          margin: 0;
        }
      </style>
    </head>
    <body>
      <button class="top-left" type="button">⌘←</button>
      <button class="top-right" type="button">⌘→</button>
      <h1>${number.formatNational()}</h1>
      <script>
        (function(){
          const { ipcRenderer } = require('electron')

          var addEvent = function (el, type, fn) {
            if (el.addEventListener)
              el.addEventListener(type, fn, false);
            else
              el.attachEvent('on'+type, fn);
          };

          var extend = function(obj,ext){
            for(var key in ext)
              if(ext.hasOwnProperty(key))
                obj[key] = ext[key];
            return obj;
          };

          window.fitText = function (el, kompressor, options) {
            var settings = extend({
              'minFontSize' : -1/0,
              'maxFontSize' : 1/0
            },options);

            var fit = function (el) {
              var compressor = kompressor || 1;

              var resizer = function () {
                el.style.fontSize = Math.max(Math.min(el.clientWidth / (compressor*10), parseFloat(settings.maxFontSize)), parseFloat(settings.minFontSize)) + 'px';
                const { height, width } = el.getBoundingClientRect();
                // ipcRenderer.send('update-text', width, height);
              };

              // Call once to set.
              resizer();

              // Bind events
              // If you have any js library which support Events, replace this part
              // and remove addEvent function (or use original jQuery version)
              addEvent(window, 'resize', resizer);
              addEvent(window, 'orientationchange', resizer);
            };

            if (el.length)
              for(var i=0; i<el.length; i++)
                fit(el[i]);
            else
              fit(el);

            // return set of elements
            return el;
          };

          // -------

          window.fitText( document.querySelector("h1"), 0.8 );

          document.querySelector('.top-left').addEventListener('click', () => {
            ipcRenderer.send('pin-top-left');
          })
          document.querySelector('.top-right').addEventListener('click', () => {
            ipcRenderer.send('pin-top-right');
          })
        })();
      </script>
    </body>
  </html>`);

  ipcMain.on('update-text', (event, width, height) => {
    win.setSize(width, height);
  });

  function pinTopLeft() {
    const newWidth = display.bounds.width * 0.4;
    win.setSize(newWidth, 120);
    win.setPosition(0, 0);
  }

  ipcMain.on('pin-top-left', event => pinTopLeft());

  function pinTopRight() {
    const newWidth = display.bounds.width * 0.4;
    win.setSize(newWidth, 120);
    win.setPosition(display.bounds.width - newWidth, 0);
  }

  function centerWindow() {
    win.setSize(display.bounds.width * 0.85, 225);
    win.center();
  }

  ipcMain.on('pin-top-right', event => pinTopRight());

  const isMac = process.platform === 'darwin';
  const template = [
    // { role: 'appMenu' }
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideothers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }
        ]
      : []),
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Pin top left',
          accelerator: 'CmdOrCtrl+left',
          click: () => pinTopLeft()
        },
        {
          label: 'Pin top right',
          accelerator: 'CmdOrCtrl+right',
          click: () => pinTopRight()
        },
        {
          label: 'Center',
          accelerator: 'CmdOrCtrl+enter',
          click: () => centerWindow()
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' }
            ]
          : [{ role: 'close' }])
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://electronjs.org');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

try {
  // run the app like sooo 👇
  // open release/mac/Covery.app --args +49176...
  const text = process.argv[1];
  console.log(process.argv, text);
  if (!text) {
    return dialog.showErrorBox(
      'Please use covery from the command line',
      'You can find more info in the docs section at github.com/stefanjudis/covery'
    );
  }

  app.on('ready', () => {
    createCoveryWindow({ text });
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
} catch (e) {
  console.error(e);
}
