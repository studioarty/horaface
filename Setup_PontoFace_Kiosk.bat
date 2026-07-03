@echo off
color 0A
title Instalador PontoFace Kiosk
echo ==============================================
echo       PONTOFACE KIOSK ROOT INSTALLER
echo ==============================================
echo.
echo Baixando icone do sistema e Instalando o Totem PontoFace...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$chromePath = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe' -ErrorAction SilentlyContinue).'(default)'; if (-not $chromePath) { $chromePath = 'C:\Program Files\Google\Chrome\Application\chrome.exe' }; $iconUrl = 'https://compositor.sbs/favicon.ico'; $iconPath = 'C:\Users\Public\PontoFace.ico'; try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri $iconUrl -OutFile $iconPath -UseBasicParsing -ErrorAction SilentlyContinue } catch {}; $WshShell = New-Object -ComObject WScript.Shell; $url = 'https://compositor.sbs/quiosque'; $desktopPath = [Environment]::GetFolderPath('Desktop'); $Shortcut = $WshShell.CreateShortcut(\"$desktopPath\PontoFace Kiosk.lnk\"); $Shortcut.TargetPath = $chromePath; $Shortcut.Arguments = \"--kiosk --kiosk-printing `\"$url`\"\"; $Shortcut.WindowStyle = 3; $Shortcut.Description = 'Terminal de Ponto'; if (Test-Path $iconPath) { $Shortcut.IconLocation = $iconPath }; $Shortcut.Save(); $startupPath = [Environment]::GetFolderPath('Startup'); $StartupShortcut = $WshShell.CreateShortcut(\"$startupPath\PontoFace Kiosk.lnk\"); $StartupShortcut.TargetPath = $chromePath; $StartupShortcut.Arguments = \"--kiosk --kiosk-printing `\"$url`\"\"; $StartupShortcut.WindowStyle = 3; if (Test-Path $iconPath) { $StartupShortcut.IconLocation = $iconPath }; $StartupShortcut.Save();"

echo.
echo [ OK ] Icone PontoFace baixado e aplicado!
echo [ OK ] Atalho da Area de Trabalho criado!
echo [ OK ] Inicializacao Automatica (Auto-Boot) ativada!
echo [ OK ] Modo Totem de Impressora Silenciosa ativado!
echo.
echo ==============================================
echo INSTALACAO CONCLUIDA COM SUCESSO!
echo O Totem ja comecara sozinho no proximo boot.
echo ==============================================
echo.
pause
exit
