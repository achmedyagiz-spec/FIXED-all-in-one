@echo off
setlocal ENABLEDELAYEDEXPANSION

for /f %%I in ('powershell -NoProfile -Command "[System.Diagnostics.Process]::GetCurrentProcess().Id"') do set MY_PID=%%I
echo !MY_PID! > ".\Settings\pid.txt"

title ALL In ONE by arviis.

:loop
  node arvis.js
  echo [%date% %time%] Bot kapandi. Hata kodu: %errorlevel%.
  echo 5 saniye sonra yeniden baslatilacak...
  timeout /t 5 /nobreak > nul
goto loop