:: SPDX-License-Identifier: GPL-3.0-or-later
@echo off
setlocal
cd /d "%~dp0"
title ZeroScript Release Builder

set "PY=py -3"
%PY% --version >nul 2>nul
if errorlevel 1 set "PY=python"
%PY% --version >nul 2>nul
if errorlevel 1 (
  echo Python was not found. Install Python 3 and try again.
  pause
  exit /b 1
)

%PY% build_release.py
if errorlevel 1 (
  echo.
  echo Release build failed. Read the error above.
  pause
  exit /b 1
)

echo.
echo Release package is ready in the dist folder.
explorer "%~dp0dist"
pause
