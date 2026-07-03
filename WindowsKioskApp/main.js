const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');

const userDataPath = path.join(app.getPath('appData'), 'IgrejaKioskApp');
app.setPath('userData', userDataPath);

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        kiosk: true, // Força Tela Cheia absoluta (Modo Quiosque do Windows)
        autoHideMenuBar: true, // Esconde os menus (Arquivo, Editar, etc)
        frame: false, // Remove as bordas clássicas do Windows
        alwaysOnTop: true, // Impede que o usuário minimize a tela facilmente
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            devTools: false, // Desabilita F12 em produção
            partition: 'persist:kioskSession' // Garante que o LocalStorage/Cookies sobrevivam ao app.quit()
        }
    });

    // Forçar retenção de cache e cookies de sessão permanentes no AppData
    mainWindow.webContents.session.allowNTLMCredentialsForDomains('*');

    const fs = require('fs');
    const urlFile = path.join(userDataPath, 'last_url.txt');
    let targetUrl = 'https://compositor.sbs/quiosque';

    if (fs.existsSync(urlFile)) {
        targetUrl = fs.readFileSync(urlFile, 'utf8').trim() || targetUrl;
    }

    // Carrega a URL do Cliente (seja novohost ou já com ID)
    mainWindow.loadURL(targetUrl);

    // Rastreador implacável: Toda vez que o React redirecionar a tela pós-cadastro (KioskSetup), guardara a URL
    mainWindow.webContents.on('did-navigate', (event, url) => {
        if (url.startsWith('https://compositor.sbs/quiosque')) {
            fs.writeFileSync(urlFile, url);
        }
    });

    mainWindow.webContents.on('did-navigate-in-page', (event, url) => {
        if (url.startsWith('https://compositor.sbs/quiosque')) {
            fs.writeFileSync(urlFile, url);
        }
    });

    // Desabilita a função de impressão na página inteira (botões que chamam window.print)
    mainWindow.webContents.on('dom-ready', () => {
        mainWindow.webContents.executeJavaScript('window.print = function() {};');
    });

    // Previne que o Kiosk saia de tela cheia se algo tentar maximizar diferente
    mainWindow.on('leave-full-screen', () => {
        mainWindow.setKiosk(true);
    });

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    // Bloqueios Extras contra Fugas (Prevenções de Atalho)
    globalShortcut.register('CommandOrControl+W', () => { /* Bloqueia Ctrl+W */ });
    globalShortcut.register('CommandOrControl+Shift+I', () => { /* Bloqueia Inspetor */ });
    globalShortcut.register('CommandOrControl+R', () => { /* Bloqueia Refresh Acidental */ });
    globalShortcut.register('CommandOrControl+P', () => { /* Bloqueia a tela de Impressão */ });

    // ATALHO SECRETO DE MANUTENÇÃO: Pressionar Ctrl + Alt + F4 para fechar o Kiosk e voltar pro Windows
    globalShortcut.register('CommandOrControl+Alt+F4', () => {
        app.quit();
    });

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
