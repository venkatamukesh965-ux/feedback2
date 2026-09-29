@echo off
setlocal
cd /d "%~dp0"
python -m pip install -r requirements.txt
if not exist frontend\node_modules (
  echo Installing React frontend dependencies...
  cd frontend
  call npm install
  if errorlevel 1 exit /b 1
  cd ..
)
echo Building React + Tailwind frontend...
cd frontend
call npm run build
if errorlevel 1 exit /b 1
cd ..
echo Starting Feedback Intelligence...
python app.py
pause
