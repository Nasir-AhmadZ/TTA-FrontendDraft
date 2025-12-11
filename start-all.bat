@echo off
echo Starting TTA Full Stack Application...

echo.
echo Starting Backend (Node.js)...
start "TTA Backend" cmd /k "cd node\microservices && npm start"

echo.
echo Starting Graph Service (Python)...
start "TTA Graph Service" cmd /k "cd TTA-Track-Graph-main && docker run -p 5000:5000 tta-graph"

echo.
echo Starting Frontend (Next.js)...
start "TTA Frontend" cmd /k "cd next\fullStackWeek11lab2 && npm run dev"

echo.
echo All services starting...
echo Backend: http://localhost:8000
echo Graph Service: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit...
pause