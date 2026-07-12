@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo   === ZeroScript Bridge + Studio Panel ===
echo.

set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY (
  where python >nul 2>nul && set "PY=python"
)
if not defined PY (
  echo   Python was not found. Running the normal installer first...
  call "%~dp0start.bat"
  exit /b %errorlevel%
)

if not exist "%~dp0control_api.py" (
  echo   ERROR: control_api.py is missing.
  pause
  exit /b 1
)

REM Replace an earlier side-channel listener if one is still holding port 17614.
set "CONTROLPID="
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :17614 ^| findstr LISTENING 2^>nul') do set "CONTROLPID=%%a"
if defined CONTROLPID taskkill /F /T /PID %CONTROLPID% >nul 2>nul

start "ZeroScript Studio Panel API" /min cmd /c %PY% "%~dp0control_api.py"
timeout /t 1 /nobreak >nul

if exist "%~dp0control_token.txt" (
  echo   Studio panel API started.
  echo   Token file: %~dp0control_token.txt
  echo   Paste that token into both the Chrome popup and Studio widget.
) else (
  echo   WARNING: control_token.txt was not created yet.
  echo   Check the minimized Studio Panel API window for an error.
)

echo.
call "%~dp0start.bat"
exit /b %errorlevel%
