@echo off
setlocal
cd /d "%~dp0"

if not exist .env (
  if exist .env.example (
    copy .env.example .env >nul
    echo Created .env from .env.example. Please edit it before starting the bot.
  )
)

call npm.cmd ci
if errorlevel 1 exit /b %errorlevel%

echo.
echo Setup completed.
echo Next: npm.cmd run deploy:commands
