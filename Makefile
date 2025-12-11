.PHONY: setup start stop clean help

# Default target
help:
	@echo Available commands:
	@echo   setup  - Install dependencies for both frontend and backend
	@echo   start  - Start both frontend and backend services
	@echo   stop   - Stop both frontend and backend services
	@echo   clean  - Clean build artifacts
	@echo   help   - Show this help message

# Setup project dependencies
setup:
	@echo Installing backend dependencies...
	cd node/microservices && npm install
	@echo Installing frontend dependencies...
	cd next/fullStackWeek11lab2 && npm install
	@echo Setup complete!

# Start both services
start:
	@echo Starting services...
	@start "Backend" cmd /k "cd node/microservices && npm start"
	@start "Frontend" cmd /k "cd next/fullStackWeek11lab2 && npm run dev"
	@echo Backend: http://localhost:8000
	@echo Frontend: http://localhost:3000

# Stop services by killing Node.js processes
stop:
	@echo Stopping services...
	@taskkill /f /im node.exe 2>nul || echo No Node.js processes found
	@echo Services stopped

# Clean build artifacts
clean:
	@echo Cleaning build artifacts...
	@if exist next/fullStackWeek11lab2/.next rmdir /s /q next/fullStackWeek11lab2/.next 2>nul
	@if exist .next rmdir /s /q .next 2>nul
	@echo Clean complete