# TimeTrack Microservice - Node.js Conversion

This FastAPI microservice has been converted to Node.js and integrated into the main Express application.

## Original Python Files
- `main.py` - FastAPI routes and endpoints
- `models.py` - Helper functions for data serialization
- `schemas.py` - Pydantic models for validation
- `configurations.py` - MongoDB connection setup

## Converted to Node.js
The functionality has been converted to: `../node/microservices/routes/timetrack.js`

## API Endpoints
All endpoints are now available under `/api/timetrack/`:

### Entry Management
- `GET /api/timetrack/entry/:entry_id` - Get entry by ID
- `DELETE /api/timetrack/entry/:entry_id` - Delete entry
- `PUT /api/timetrack/entries` - Start new time entry
- `PATCH /api/timetrack/entries/:entry_id` - End time entry
- `PATCH /api/timetrack/entries/update/:entry_id` - Update entry
- `GET /api/timetrack/entries` - List all entries
- `GET /api/timetrack/entries/project/:project_id` - List entries by project

### Project Management
- `PUT /api/timetrack/projects` - Create project
- `GET /api/timetrack/projects` - List all projects
- `GET /api/timetrack/projects/user` - List user's projects
- `DELETE /api/timetrack/project/:project_id` - Delete project and entries
- `DELETE /api/timetrack/user/projects` - Delete all user projects

## Usage
Start the Node.js server and access the timetrack API at `http://localhost:3000/api/timetrack/`