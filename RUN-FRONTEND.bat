@echo off
set BROWSER=none
set NODE_OPTIONS=--max-old-space-size=4096
cd /d "%~dp0desktop"
npm.cmd start
pause
