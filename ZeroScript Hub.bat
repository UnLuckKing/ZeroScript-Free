@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title ZeroScript Hub

if not exist "%~dp0zeroscript_hub.py" (
  echo ERROR: zeroscript_hub.py bulunamadi.
  echo Tum ZIP dosyasini cikardigindan emin ol.
  pause
  exit /b 1
)

where pyw >nul 2>nul
if not errorlevel 1 (
  start "" pyw -3 "%~dp0zeroscript_hub.py"
  exit /b 0
)

where pythonw >nul 2>nul
if not errorlevel 1 (
  start "" pythonw "%~dp0zeroscript_hub.py"
  exit /b 0
)

where py >nul 2>nul
if not errorlevel 1 (
  py -3 "%~dp0zeroscript_hub.py"
  exit /b %errorlevel%
)

where python >nul 2>nul
if not errorlevel 1 (
  python "%~dp0zeroscript_hub.py"
  exit /b %errorlevel%
)

echo Python bulunamadi. Once start.bat dosyasini bir kez calistir; Python otomatik kurulacak.
pause
exit /b 1
