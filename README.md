This project includes a Next.js frontend and Node.js backend microservices.

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm

### Installation

Install backend dependencies:

```bash
cd node/microservices
npm install
```

Install frontend dependencies:

```bash
cd next/fullStackWeek11lab2
npm install
```

### Running the Application

#### Quick Start (Windows)

Run both services with one command:

```bash
start.bat
```

This will start:
- Backend: http://localhost:8000
- Frontend: http://localhost:3000

#### Manual Start

Start backend:

```bash
cd node/microservices
npm start
```

Start frontend (in a separate terminal):

```bash
cd next/fullStackWeek11lab2
npm run dev
```

## Project Structure

- `node/microservices/` - Backend Node.js microservices
- `next/fullStackWeek11lab2/` - Next.js frontend application
- `start.bat` - Windows script to start both services
