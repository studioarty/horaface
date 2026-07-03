import { ExternalLink, Monitor, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import KioskMonitor from "@/components/features/KioskMonitor";

export default function KiosksAdmin() {
    const { toast } = useToast();
    const baseUrl = window.location.origin;

    const downloadInstaller = () => {
        const kioskUrl = `${baseUrl}/quiosque`;
        const batContent = `@echo off
echo ==============================================
echo HORAFACE - INSTALADOR DE QUIOSQUE WINDOWS
echo ==============================================
echo Configurando PC para Modo Quiosque Exclusivo...
echo.
echo ATENCAO: Todas as janelas abertas do Google Chrome serao fechadas agora
echo para garantir a inicializacao limpa do Terminal!
timeout /t 3 /nobreak >nul
taskkill /F /IM chrome.exe /T >nul 2>&1
echo.

:: Procura o Chrome em 3 lugares diferentes
set "CHROME_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
if not exist "%CHROME_PATH%" (
  set "CHROME_PATH=C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
)
if not exist "%CHROME_PATH%" (
  set "CHROME_PATH=%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe"
)

:: Criar atalho na inicializacao do Windows
set STARTUP_DIR=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup
echo set WshShell = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo set oShellLink = WshShell.CreateShortcut("%STARTUP_DIR%\\HoraFace_Quiosque.lnk") >> CreateShortcut.vbs
echo oShellLink.TargetPath = "%CHROME_PATH%" >> CreateShortcut.vbs
echo oShellLink.Arguments = "--kiosk ${kioskUrl}" >> CreateShortcut.vbs
echo oShellLink.Save >> CreateShortcut.vbs
cscript //nologo CreateShortcut.vbs
del CreateShortcut.vbs

:: Criar Desinstalador na Area de Trabalho
set DESKTOP_DIR=%USERPROFILE%\\Desktop
echo set WshShell = WScript.CreateObject("WScript.Shell") > CreateUndo.vbs
echo set oShellLink = WshShell.CreateShortcut("%DESKTOP_DIR%\\Desativar_Quiosque.lnk") >> CreateUndo.vbs
echo oShellLink.TargetPath = "cmd.exe" >> CreateUndo.vbs
echo oShellLink.Arguments = "/c del \"%STARTUP_DIR%\\HoraFace_Quiosque.lnk\" & taskkill /F /IM chrome.exe & echo Quiosque Desativado! & pause" >> CreateUndo.vbs
echo oShellLink.IconLocation = "shell32.dll,27" >> CreateUndo.vbs
echo oShellLink.Save >> CreateUndo.vbs
cscript //nologo CreateUndo.vbs
del CreateUndo.vbs

echo.
echo Tudo Pronto! O HoraFace vai abrir em Tela Cheia agora.
echo Para fechar e fazer manutencao: 
echo 1. Aperte ALT + F4 no teclado.
echo 2. Na Area de Trabalho, use o icone "Desativar Quiosque" para ele nao voltar a abrir sozinho.
echo.

start "" "%CHROME_PATH%" --kiosk "${kioskUrl}"
`;

        const blob = new Blob([batContent], { type: 'application/bat' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Instalar_Quiosque_HoraFace.bat';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
            title: "Instalador Baixado!",
            description: "Envie este arquivo para o PC que será o quiosque e execute-o.",
        });
    };

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="mb-4 sm:mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-heading text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 drop-shadow-sm">
                        Monitor de Quiosques
                    </h1>
                    <p className="text-xs sm:text-sm text-text-secondary">
                        Gerencie os terminais de registro ativos e configure os displays
                    </p>
                </div>
                
                <button
                    onClick={downloadInstaller}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all font-medium text-sm"
                >
                    <Download className="size-4" />
                    Baixar Instalador Windows
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Painel Central: Monitor */}
                <div className="lg:col-span-12 space-y-6">
                    <KioskMonitor />
                </div>
            </div>
        </div>
    );
}
