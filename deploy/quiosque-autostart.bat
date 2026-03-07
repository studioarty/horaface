@echo off
:loop
start /wait "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --start-fullscreen "https://instituto.onspace.build/quiosque?id=entrada-principal&name=Entrada Principal&location=Térreo"
timeout /t 5
goto loop