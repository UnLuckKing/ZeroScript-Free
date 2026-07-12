@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title ZeroScript Güncelleme

set "ROOT=%~dp0"
set "TMP=%TEMP%\ZeroScriptUpdate-%RANDOM%-%RANDOM%"
set "ZIP=%TMP%\zeroscript.zip"
set "SRC=%TMP%\ZeroScript-Free-master"

mkdir "%TMP%" >nul 2>nul

echo.
echo  ==========================================
echo          ZeroScript Tek Tik Guncelleme
echo  ==========================================
echo.
echo Eski Hub, Bridge ve kontrol servisleri kapatiliyor...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports=17613,17614; foreach($port in $ports){Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {try{Stop-Process -Id $_.OwningProcess -Force -ErrorAction Stop}catch{}}}" >nul 2>nul
timeout /t 2 /nobreak >nul

echo GitHub master surumu indiriliyor...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$root=[IO.Path]::GetFullPath('%ROOT%');" ^
  "$tmp='%TMP%'; $zip='%ZIP%'; $src='%SRC%';" ^
  "$keep=@('control_token.txt','hub_settings.json','hub_profiles.json','hub_task_templates.json','config.json');" ^
  "$backup=Join-Path $tmp 'preserve'; New-Item -ItemType Directory -Force -Path $backup | Out-Null;" ^
  "foreach($name in $keep){$p=Join-Path $root $name; if(Test-Path $p){Copy-Item $p (Join-Path $backup $name) -Force}};" ^
  "Invoke-WebRequest -UseBasicParsing 'https://github.com/UnLuckKing/ZeroScript-Free/archive/refs/heads/master.zip' -OutFile $zip;" ^
  "Expand-Archive -Path $zip -DestinationPath $tmp -Force;" ^
  "if(!(Test-Path (Join-Path $src 'zeroscript-extension\manifest.json'))){throw 'Indirilen paket gecersiz.'};" ^
  "Copy-Item (Join-Path $src '*') $root -Recurse -Force;" ^
  "foreach($name in $keep){$p=Join-Path $backup $name; if(Test-Path $p){Copy-Item $p (Join-Path $root $name) -Force}};"

if errorlevel 1 (
  echo.
  echo [HATA] Guncelleme tamamlanamadi. Internet baglantisini kontrol et.
  echo Mevcut dosyalarin korunmustur.
  pause
  rmdir /s /q "%TMP%" >nul 2>nul
  exit /b 1
)

rmdir /s /q "%TMP%" >nul 2>nul

echo.
echo [OK] ZeroScript dosyalari guncellendi.
echo Chrome extension sayfasi aciliyor. ZeroScript kartinda Yeniden Yukle'ye bas.
start "" chrome "chrome://extensions" 2>nul

echo.
echo Hub yeniden baslatiliyor...
start "" "%ROOT%ZeroScript Hub.bat"
timeout /t 2 /nobreak >nul
exit /b 0
