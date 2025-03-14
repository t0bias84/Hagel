import os
import json
import subprocess
from pathlib import Path

def create_file(filepath, content=""):
    """Skapa en fil med angivet innehåll"""
    filepath = Path(filepath)
    filepath.parent.mkdir(parents=True, exist_ok=True)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

def create_project_structure():
    # Projektets rotmapp
    root = Path("hagelskott-analys")
    root.mkdir(exist_ok=True)
    
    # Backend struktur
    backend_paths = [
        "backend/app/__init__.py",
        "backend/app/api/__init__.py",
        "backend/app/api/routes/__init__.py",
        "backend/app/api/routes/analysis.py",
        "backend/app/api/routes/auth.py",
        "backend/app/api/routes/users.py",
        "backend/app/api/schemas/__init__.py",
        "backend/app/api/schemas/analysis.py",
        "backend/app/api/schemas/user.py",
        "backend/app/core/__init__.py",
        "backend/app/core/config.py",
        "backend/app/core/security.py",
        "backend/app/db/__init__.py",
        "backend/app/db/base.py",
        "backend/app/db/models/__init__.py",
        "backend/app/db/models/shot.py",
        "backend/app/db/models/user.py",
        "backend/app/services/__init__.py",
        "backend/app/services/analysis_service.py",
        "backend/app/services/image_processing.py",
        "backend/tests/__init__.py",
        "backend/tests/conftest.py",
        "backend/tests/test_analysis.py",
        "backend/tests/test_image_processing.py",
        "backend/main.py",
    ]

    # Skapa backend-filer med grundläggande innehåll
    requirements_content = """fastapi==0.104.1
uvicorn==0.24.0
python-multipart==0.0.6
sqlalchemy==2.0.23
opencv-python==4.8.1.78
numpy==1.26.2
pytest==7.4.3
python-jose==3.3.0
passlib==1.7.4
python-dotenv==1.0.0
"""

    main_content = """from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Hagelskott Analys API")

# Konfigurera CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Välkommen till Hagelskott Analys API"}
"""

    config_content = """from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Hagelskott Analys"
    DATABASE_URL: str = "sqlite:///./hagelskott.db"
    
    class Config:
        case_sensitive = True

settings = Settings()
"""

    for path in backend_paths:
        create_file(root / path)
    
    create_file(root / "backend/requirements.txt", requirements_content)
    create_file(root / "backend/main.py", main_content)
    create_file(root / "backend/app/core/config.py", config_content)

    # Frontend struktur (skapas med Vite)
    os.chdir(root)
    subprocess.run(["npm", "create", "vite@latest", "frontend", "--", "--template", "react"], check=True)
    
    # Skapa ytterligare frontend-mappar
    frontend_paths = [
        "frontend/src/components/analysis/ShotAnalyzer.jsx",
        "frontend/src/components/analysis/HeatmapView.jsx",
        "frontend/src/components/analysis/ResultsDisplay.jsx",
        "frontend/src/components/common/Button.jsx",
        "frontend/src/components/common/Card.jsx",
        "frontend/src/components/common/Layout.jsx",
        "frontend/src/components/forms/ShotDataForm.jsx",
        "frontend/src/components/forms/ImageUpload.jsx",
        "frontend/src/hooks/useAnalysis.js",
        "frontend/src/hooks/useImageProcessing.js",
        "frontend/src/services/api.js",
        "frontend/src/services/imageService.js",
        "frontend/src/store/index.js",
        "frontend/src/store/slices/analysisSlice.js",
        "frontend/src/store/slices/userSlice.js",
        "frontend/src/utils/constants.js",
        "frontend/src/utils/helpers.js",
        "frontend/src/styles/globals.css",
    ]

    for path in frontend_paths:
        create_file(root / path)

    # Docker-filer
    dockerfile_backend = """FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
"""

    dockerfile_frontend = """FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "run", "dev"]
"""

    docker_compose = """version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: ../docker/backend.Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    environment:
      - DATABASE_URL=sqlite:///./hagelskott.db

  frontend:
    build:
      context: ./frontend
      dockerfile: ../docker/frontend.Dockerfile
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
    depends_on:
      - backend
"""

    create_file(root / "docker/backend.Dockerfile", dockerfile_backend)
    create_file(root / "docker/frontend.Dockerfile", dockerfile_frontend)
    create_file(root / "docker/docker-compose.yml", docker_compose)

    # README
    readme_content = """# Hagelskott Analys

Ett program för att analysera hagelskottsmönster och spara resultat.

## Kom igång

### Backend
1. Skapa virtual environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # På Windows: venv\\Scripts\\activate
   pip install -r requirements.txt
   ```

2. Starta backend:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend
1. Installera beroenden:
   ```bash
   cd frontend
   npm install
   ```

2. Starta utvecklingsserver:
   ```bash
   npm run dev
   ```

### Med Docker
Starta hela stacken:
```bash
docker-compose up --build
```
"""
    
    create_file(root / "README.md", readme_content)

if __name__ == "__main__":
    create_project_structure()
    print("✅ Projektstruktur skapad framgångsrikt!")
    print("\n📁 Du hittar projektet i mappen 'hagelskott-analys'")
    print("\n🚀 Nästa steg:")
    print("1. cd hagelskott-analys")
    print("2. Följ instruktionerna i README.md för att starta projektet")