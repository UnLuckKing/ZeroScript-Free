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
echo          ZeroScript One Guncelleme
echo  ==========================================
echo.
echo Eski Hub, Bridge ve kontrol servisleri kapatiliyor...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$self=$PID;" ^
  "Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {$_.ProcessId -ne $self -and $_.CommandLine -match 'zeroscript_hub_launcher\.py|zeroscript_hub\.py|zeroscript_one_launcher\.pyw'} | ForEach-Object {try{Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop}catch{}};" ^
  "$ports=17613,17614; foreach($port in $ports){Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {try{Stop-Process -Id $_.OwningProcess -Force -ErrorAction Stop}catch{}}}" >nul 2>nul
timeout /t 2 /nobreak >nul

echo GitHub master surumu indiriliyor...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$root=[IO.Path]::GetFullPath('%ROOT%');" ^
  "$tmp='%TMP%'; $zip='%ZIP%'; $src='%SRC%';" ^
  "$keep=@('control_token.txt','hub_settings.json','hub_profiles.json','hub_task_templates.json','zeroscript_memory.db','zeroscript_memory.db-wal','zeroscript_memory.db-shm','config.json');" ^
  "$obsolete=@('RELEASE_1.22.md','RELEASE_1.23.md','RELEASE_NOTES_1.21.md','RELEASE_NOTES_1.26.md','RELEASE_NOTES_1.27.md','RELEASE_NOTES_1.28.md','RELEASE_NOTES_1.29.md','RELEASE_NOTES_1.30.md','RELEASE_NOTES_1.31.md','RELEASE_NOTES_1.32.md','RELEASE_NOTES_1.33.md');" ^
  "$backup=Join-Path $tmp 'preserve'; New-Item -ItemType Directory -Force -Path $backup | Out-Null;" ^
  "foreach($name in $keep){$p=Join-Path $root $name; if(Test-Path $p){Copy-Item $p (Join-Path $backup $name) -Force}};" ^
  "Invoke-WebRequest -UseBasicParsing 'https://github.com/UnLuckKing/ZeroScript-Free/archive/refs/heads/master.zip' -OutFile $zip;" ^
  "Expand-Archive -Path $zip -DestinationPath $tmp -Force;" ^
  "if(!(Test-Path (Join-Path $src 'zeroscript-extension\manifest.json'))){throw 'Indirilen paket gecersiz.'};" ^
  "Copy-Item (Join-Path $src '*') $root -Recurse -Force;" ^
  "foreach($name in $obsolete){$p=Join-Path $root $name; if(Test-Path $p){Remove-Item $p -Force}};" ^
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
echo Studio Workspace ve Command Palette guncelleniyor...
where py >nul 2>nul
if not errorlevel 1 (
  py -3 "%ROOT%install_studio_panel.py" >nul 2>nul
) else (
  where python >nul 2>nul
  if not errorlevel 1 python "%ROOT%install_studio_panel.py" >nul 2>nul
)

echo.
echo [OK] ZeroScript One, Golden Templates ve Memory Vault guncellendi.
echo Eski root release dosyalari temizlendi; dokumanlar docs\releases altinda.
echo Chrome extension sayfasi aciliyor. ZeroScript One kartinda Yeniden Yukle'ye bas.
echo Roblox Studio aciksa yeni Workspace icin Studio'yu yeniden baslat.
start "" chrome "chrome://extensions" 2>nul

echo.
echo ZeroScript One yeniden baslatiliyor...
if exist "%ROOT%ZeroScript One.bat" (
  start "" "%ROOT%ZeroScript One.bat"
) else (
  start "" "%ROOT%ZeroScript Hub.bat"
)
timeout /t 2 /nobreak >nul
exit /b 0
