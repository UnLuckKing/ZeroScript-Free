@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title ZeroScript One Kurulum

echo.
echo  ==========================================
echo       ZeroScript One Kolay Kurulum
echo  ==========================================
echo.

set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY (
  where python >nul 2>nul && set "PY=python"
)

if not defined PY (
  echo [1/4] Python bulunamadi. Otomatik kuruluyor...
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
  echo [1/4] Python hazir.
)

if not exist "%~dp0ZeroScript One.bat" (
  echo [HATA] ZeroScript One.bat bulunamadi. ZIP paketini tamamen cikardigindan emin ol.
  pause
  exit /b 1
)

echo [2/4] Masaustu kisayolu olusturuluyor...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$w=New-Object -ComObject WScript.Shell; $s=$w.CreateShortcut([Environment]::GetFolderPath('Desktop')+'\ZeroScript One.lnk'); $s.TargetPath='%~dp0ZeroScript One.bat'; $s.WorkingDirectory='%~dp0'; $s.Description='ZeroScript One - Roblox Studio Prototype Accelerator'; $s.Save()" >nul 2>nul

echo [3/4] Roblox Studio araclari kuruluyor...
%PY% "%~dp0install_studio_panel.py"
if errorlevel 1 (
  echo [UYARI] Studio paneli kurulamadi. Kuruluma uygulama ve extension ile devam ediliyor.
)

echo [4/4] Chrome extension kurulumu aciliyor...
start "" chrome "chrome://extensions" 2>nul
start "" explorer "%~dp0zeroscript-extension"

echo.
echo Chrome'da sadece ilk sefer:
echo  1. Gelistirici modu ac
echo  2. Paketlenmemis oge yukle'ye bas
echo  3. Acilan zeroscript-extension klasorunu sec
echo.
echo Roblox Studio aciksa kapatip yeniden ac.
echo Sonraki gunlerde yalnizca masaustundeki ZeroScript One kisayolunu acman yeterli.
echo.
start "" "%~dp0ZeroScript One.bat"
pause
