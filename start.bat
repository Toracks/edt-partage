@echo off
cd /d %~dp0

echo Activation environnement virtuel...

call venv\Scripts\activate.bat

echo Lancement du serveur Flask...

start cmd /k "python backend/server.py"

timeout /t 2 >nul

start http://127.0.0.1:5001