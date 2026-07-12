@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title ZeroScript Kurulum

echo.
echo  ==========================================
echo       ZeroScript Hub Kolay Kurulum
echo  ==========================================
echo.

set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY (
  where python >nul 2>nul && set "PY=python"
)

if not defined PY (
  echo [1/3] Python bulunamadi. Otomatik kuruluyor...
  where winget >nul 2>nul
  if errorlevel 1 (
    echo Python ve winget bulunamadi.
    echo Python 3.12 kurup bu dosyayi tekrar ac: https://www.python.org/downloads/
    pause
    exit /b 1
  )
  winget install --id Python.Python.3.12 --source winget --accept-package-agreements --accept-source-agreements
  if errorlevel 1 (
    echo Python kurulumu basarisiz oldu.
    pause
    exit /b 1
  )
  set "PY=py -3"
) else (
  echo [1/3] Python hazir.
)

echo [2/3] Masaustu kisayolu olusturuluyor...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$w=New-Object -ComObject WScript.Shell; $s=$w.CreateShortcut([Environment]::GetFolderPath('Desktop')+'\ZeroScript Hub.lnk'); $s.TargetPath='%~dp0ZeroScript Hub.bat'; $s.WorkingDirectory='%~dp0'; $s.Description='ZeroScript Hub'; $s.Save()" >nul 2>nul

echo [3/3] Chrome extension kurulumu aciliyor...
start "" chrome "chrome://extensions" 2>nul
start "" explorer "%~dp0zeroscript-extension"

echo.
echo Chrome'da sadece ilk sefer:
echo  1. Gelistirici modu ac
echo  2. Paketlenmemis oge yukle'ye bas
echo  3. Acilan zeroscript-extension klasorunu sec
echo.
echo Sonraki gunlerde yalnizca masaustundeki ZeroScript Hub kisayolunu acman yeterli.
echo.
start "" "%~dp0ZeroScript Hub.bat"
pause
