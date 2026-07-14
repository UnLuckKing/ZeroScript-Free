@echo off
setlocal
cd /d "%~dp0.."
set "PY=py -3"
%PY% --version >nul 2>nul
if errorlevel 1 set "PY=python"
%PY% tools\build_release.py
if errorlevel 1 (
  echo Release build failed.
  pause
  exit /b 1
)
explorer "%~dp0..\dist"
