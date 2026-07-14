@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title ZeroScript Bridge

set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY where python >nul 2>nul && set "PY=python"
if not defined PY (
  echo Python bulunamadi. Kok klasordeki ZeroScript Kurulum.bat dosyasini calistir.
  pause
  exit /b 1
)

%PY% -c "import websockets" >nul 2>nul
if errorlevel 1 %PY% -m pip install --user websockets
if errorlevel 1 (
  echo websockets kurulamadı.
  pause
  exit /b 1
)

%PY% "%~dp0bridge.py"
if errorlevel 1 (
  echo Bridge hata ile durdu. ..\logs\bridge_debug.log dosyasini kontrol et.
  pause
)
