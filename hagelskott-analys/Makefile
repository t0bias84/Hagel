# Makefile for managing the Hagelskott Analys development environment.

# Use this command to bring up all services (backend, frontend, db) in detached mode.
# It will build the images if they don't exist.
up:
	docker compose -f docker/docker-compose.yml up --build -d

# Use this command to stop and remove all running services.
down:
	docker compose -f docker/docker-compose.yml down

# Use this command to view the real-time logs from all services.
# Press Ctrl+C to exit.
logs:
	docker compose -f docker/docker-compose.yml logs -f

# Use this command to run the frontend tests.
test-frontend:
	docker compose -f docker/docker-compose.yml exec frontend npm test

# Use this command to run the backend tests.
test-backend:
	docker compose -f docker/docker-compose.yml exec backend pytest

# Use this command to get a shell inside the backend container.
# Useful for running management commands or debugging.
shell-backend:
	docker compose -f docker/docker-compose.yml exec backend /bin/sh

# Use this command to get a shell inside the frontend container.
shell-frontend:
	docker compose -f docker/docker-compose.yml exec frontend /bin/sh

.PHONY: up down logs test-frontend test-backend shell-backend shell-frontend
