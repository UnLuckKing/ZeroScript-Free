@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>nul
if not errorlevel 1 (
  start "" /b py -3w "%~dp0zeroscript_one_launcher.pyw"
  exit /b 0
)

where pythonw >nul 2>nul
if not errorlevel 1 (
  start "" /b pythonw "%~dp0zeroscript_one_launcher.pyw"
  exit /b 0
)

where python >nul 2>nul
if not errorlevel 1 (
  start "" /b python "%~dp0zeroscript_one_launcher.pyw"
  exit /b 0
)

echo Python bulunamadi. Once ZeroScript Kurulum.bat dosyasini calistir.
pause
