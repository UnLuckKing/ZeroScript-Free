@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title ZeroScript One Kurulum

set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY where python >nul 2>nul && set "PY=python"
if not defined PY (
  where winget >nul 2>nul || (
    echo Python ve winget bulunamadi. Python 3.12 kurup tekrar calistir.
    pause
    exit /b 1
  )
  winget install --id Python.Python.3.12 --source winget --accept-package-agreements --accept-source-agreements
  set "PY=py -3"
)

%PY% -m pip install --user websockets
%PY% tools\install_studio_panel.py
powershell -NoProfile -ExecutionPolicy Bypass -Command "$w=New-Object -ComObject WScript.Shell; $s=$w.CreateShortcut([Environment]::GetFolderPath('Desktop')+'\ZeroScript One.lnk'); $s.TargetPath='%~dp0ZeroScript One.bat'; $s.WorkingDirectory='%~dp0'; $s.Description='ZeroScript One'; $s.Save()" >nul 2>nul
start "" chrome "chrome://extensions" 2>nul
start "" explorer "%~dp0zeroscript-extension"
start "" "%~dp0ZeroScript One.bat"
echo Kurulum tamamlandi. Chrome'da Paketlenmemis oge yukle ile zeroscript-extension klasorunu sec.
pause
