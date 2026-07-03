!macro preInit
  ExecWait 'taskkill /F /IM "KIOSK PONTO IBAV.exe" /T'
  Sleep 1000
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\713b5d1e-25cb-42fe-bd34-f8cf1c9fb8d0"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\713b5d1e-25cb-42fe-bd34-f8cf1c9fb8d0"
!macroend

!macro customInstall
  SetOutPath $INSTDIR
  CreateShortCut "$DESKTOP\KIOSK PONTO IBAV.lnk" "$INSTDIR\KIOSK PONTO IBAV.exe" "" "$INSTDIR\KIOSK PONTO IBAV.exe" 0
  CreateShortCut "$INSTDIR\ToPin.lnk" "$INSTDIR\KIOSK PONTO IBAV.exe" "" "$INSTDIR\KIOSK PONTO IBAV.exe" 0
  
  nsExec::ExecToStack `powershell.exe -STA -NoProfile -WindowStyle Hidden -Command "$$path='$$INSTDIR\ToPin.lnk'; $$o=New-Object -ComObject Shell.Application; $$v=$$o.NameSpace([System.IO.Path]::GetDirectoryName($$path)).ParseName([System.IO.Path]::GetFileName($$path)).Verbs() | ?{$$_.Name -match '[Tt]arefa|taskbar'}; if($$v){$$v.DoIt()}"`
  Delete "$INSTDIR\ToPin.lnk"
!macroend
