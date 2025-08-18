# Hagelskott Analys - Development Guide

This guide provides instructions for setting up and working with the Hagelskott Analys project. It assumes you have Docker and Docker Compose installed on your system.

## Project Overview

Hagelskott Analys is a web application for shotgun enthusiasts. It includes features for analyzing shotgun patterns, a community forum, a database for handloading recipes, and a quiz.

The project is a monorepo containing two main parts:
- `frontend/`: A React single-page application.
- `backend/`: A FastAPI REST API.

## Getting Started

The entire development environment is managed by Docker Compose and a `Makefile` for convenience.

### 1. Start the Application

To start all services (frontend, backend, and database), run the following command from this directory (`hagelskott-analys`):

```bash
make up
```

This command will build the Docker images (if they don't exist) and start the containers in detached mode.

### 2. Stop the Application

To stop and remove all running services, use:

```bash
make down
```

### 3. View Logs

To view the real-time logs from all running services, use:

```bash
make logs
```

Press `Ctrl+C` to stop tailing the logs.

## Development Workflow

### Testing

You can run the test suites for the frontend and backend using simple `make` commands.

**Run Frontend Tests:**

```bash
make test-frontend
```

**Run Backend Tests:**

```bash
make test-backend
```

### Accessing Services

Once the application is running (`make up`), you can access the different parts of the system at the following URLs:

- **Frontend Application:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:8000](http://localhost:8000)
- **Backend API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

### Shell Access

For debugging or running management commands, you can get a shell inside the running containers:

- **Backend Shell:** `make shell-backend`
- **Frontend Shell:** `make shell-frontend`
