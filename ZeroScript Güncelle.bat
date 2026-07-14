@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title ZeroScript One Guncelleme

set "ROOT=%~dp0"
set "TMP=%TEMP%\ZeroScriptUpdate-%RANDOM%-%RANDOM%"
set "ZIP=%TMP%\zeroscript.zip"
set "SRC=%TMP%\ZeroScript-Free-master"
mkdir "%TMP%" >nul 2>nul

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$self=$PID; Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {$_.ProcessId -ne $self -and $_.CommandLine -match 'app\\entry\.pyw|zeroscript_hub|bridge\\bridge\.py'} | ForEach-Object {try{Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop}catch{}}; $ports=17613,17614; foreach($port in $ports){Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {try{Stop-Process -Id $_.OwningProcess -Force -ErrorAction Stop}catch{}}}" >nul 2>nul

echo GitHub master surumu indiriliyor...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; $root=[IO.Path]::GetFullPath('%ROOT%'); $tmp='%TMP%'; $zip='%ZIP%'; $src='%SRC%';" ^
  "$keep=@('control_token.txt','hub_settings.json','hub_profiles.json','hub_task_templates.json','zeroscript_memory.db','zeroscript_memory.db-wal','zeroscript_memory.db-shm','bridge\config.json');" ^
  "$obsolete=@('bridge.py','bridge_core.py','launch_studio_mcp.py','config.json','control_api.py','zeroscript_hub.py','zeroscript_hub_launcher.py','zeroscript_one_launcher.pyw','hub_automation_ui.py','hub_easy_feedback.py','hub_easy_runtime.py','hub_easy_ui.py','hub_learning_extras.py','hub_learning_ui.py','hub_modern_ui.py','hub_one_ui.py','hub_productivity_ui.py','hub_superior_ui.py','hub_workflow_extras.py','memory_vault.py','memory_vault_safeguards.py','recipe_starter_packs.py','superior_engine.py','build_release.py','build_release.bat','install_studio_panel.py','install_studio_panel.bat','start.bat','test_control_api.py','test_memory_vault.py','test_superior_engine.py');" ^
  "$backup=Join-Path $tmp 'preserve'; New-Item -ItemType Directory -Force -Path $backup | Out-Null;" ^
  "foreach($name in $keep){$p=Join-Path $root $name; if(Test-Path $p){$d=Join-Path $backup $name; New-Item -ItemType Directory -Force -Path (Split-Path $d) | Out-Null; Copy-Item $p $d -Force}};" ^
  "Invoke-WebRequest -UseBasicParsing 'https://github.com/UnLuckKing/ZeroScript-Free/archive/refs/heads/master.zip' -OutFile $zip; Expand-Archive -Path $zip -DestinationPath $tmp -Force;" ^
  "if(!(Test-Path (Join-Path $src 'zeroscript-extension\manifest.json'))){throw 'Indirilen paket gecersiz.'}; Copy-Item (Join-Path $src '*') $root -Recurse -Force;" ^
  "foreach($name in $obsolete){$p=Join-Path $root $name; if(Test-Path $p){Remove-Item $p -Force -Recurse}};" ^
  "foreach($name in $keep){$p=Join-Path $backup $name; if(Test-Path $p){$d=Join-Path $root $name; New-Item -ItemType Directory -Force -Path (Split-Path $d) | Out-Null; Copy-Item $p $d -Force}};"
if errorlevel 1 (
  echo Guncelleme tamamlanamadi. Mevcut dosyalar korundu.
  pause
  rmdir /s /q "%TMP%" >nul 2>nul
  exit /b 1
)
rmdir /s /q "%TMP%" >nul 2>nul

where py >nul 2>nul
if not errorlevel 1 py -3 "%ROOT%tools\install_studio_panel.py" >nul 2>nul
start "" chrome "chrome://extensions" 2>nul
start "" "%ROOT%ZeroScript One.bat"
echo Guncelleme tamamlandi. Chrome'da ZeroScript One uzantisina Yeniden Yukle bas.
timeout /t 2 /nobreak >nul
