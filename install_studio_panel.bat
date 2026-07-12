@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo   === ZeroScript Studio Panel Installer ===
echo.

set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY (
  where python >nul 2>nul && set "PY=python"
)
if not defined PY (
  echo   ERROR: Python was not found.
  echo   Run start.bat once first, or install Python 3.9+.
  pause
  exit /b 1
)

%PY% "%~dp0install_studio_panel.py"
set "EXITCODE=%errorlevel%"
echo.
if not "%EXITCODE%"=="0" (
  echo   Installation failed with code %EXITCODE%.
) else (
  echo   Installation complete. Restart Roblox Studio.
)
pause
exit /b %EXITCODE%
