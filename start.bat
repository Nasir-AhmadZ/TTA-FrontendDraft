@echo off
echo Cleaning Frontend build...
cd next\fullStackWeek11lab2
if exist .next rmdir /s /q .next
cd ..\..

echo Starting Backend...
start "Backend" cmd /k "cd node\microservices && npm start"

echo Starting Frontend...
start "Frontend" cmd /k "cd next\fullStackWeek11lab2 && npm run dev"

echo Both services are starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
pause