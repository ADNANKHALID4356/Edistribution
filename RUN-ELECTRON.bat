@echo off
set NODE_OPTIONS=--max-old-space-size=4096
cd /d "%~dp0desktop"
npm.cmd run electron:dev
pause
