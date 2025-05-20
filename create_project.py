import os
import json
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
        "backend/app/db/mongodb.py",
        "backend/app/services/__init__.py",
        "backend/app/services/analysis_service.py",
        "backend/app/services/image_processing.py",
        "backend/app/services/pattern_analysis.py",
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
motor==3.3.1
pymongo==4.6.0
opencv-python==4.8.1.78
numpy==1.26.2
pytest==7.4.3
python-jose==3.3.0
passlib==1.7.4
python-dotenv==1.0.0
"""

    main_content = """from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.mongodb import db

app = FastAPI(title="Hagelskott Analys API")

@app.on_event("startup")
async def startup_db_client():
    await db.connect_db()

@app.on_event("shutdown")
async def shutdown_db_client():
    await db.close_db()

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
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "hagelskott"
    
    # OpenCV inställningar
    MIN_SHOT_AREA: int = 10  # Minsta area för att räknas som träff
    MAX_SHOT_AREA: int = 100  # Största area för att räknas som träff
    DETECTION_THRESHOLD: int = 30  # Tröskelvärde för träffdetektering
    
    class Config:
        case_sensitive = True

settings = Settings()
"""

    mongodb_content = """from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class MongoDB:
    client: AsyncIOMotorClient = None
    db = None

    @classmethod
    async def connect_db(cls):
        cls.client = AsyncIOMotorClient(settings.MONGODB_URL)
        cls.db = cls.client[settings.MONGODB_DB]
        
        # Skapa indexes
        await cls.db.shots.create_index([("userId", 1)])
        await cls.db.shots.create_index([("timestamp", -1)])

    @classmethod
    async def close_db(cls):
        if cls.client:
            await cls.client.close()

db = MongoDB()
"""

    pattern_analysis_content = """from typing import List, Dict
import cv2
import numpy as np
from app.core.config import settings

class PatternAnalyzer:
    @staticmethod
    def analyze_shot_pattern(image: np.ndarray) -> Dict:
        # Konvertera till gråskala
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Brusreducering
        denoised = cv2.fastNlMeansDenoising(gray)
        
        # Adaptiv tröskling för bättre träffidentifiering
        binary = cv2.adaptiveThreshold(
            denoised, 
            255, 
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 
            11, 
            2
        )
        
        # Hitta träffar
        contours, _ = cv2.findContours(
            binary, 
            cv2.RETR_EXTERNAL, 
            cv2.CHAIN_APPROX_SIMPLE
        )
        
        # Filtrera och analysera träffar
        valid_hits = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if settings.MIN_SHOT_AREA <= area <= settings.MAX_SHOT_AREA:
                M = cv2.moments(contour)
                if M["m00"] != 0:
                    cx = int(M["m10"] / M["m00"])
                    cy = int(M["m01"] / M["m00"])
                    valid_hits.append((cx, cy))
        
        if not valid_hits:
            return {
                "hit_count": 0,
                "pattern_density": 0,
                "centroid": None,
                "spread": 0
            }
        
        # Beräkna mönsterstatistik
        hits_array = np.array(valid_hits)
        centroid = hits_array.mean(axis=0)
        distances = np.linalg.norm(hits_array - centroid, axis=1)
        
        return {
            "hit_count": len(valid_hits),
            "pattern_density": len(valid_hits) / (np.pi * (max(distances) ** 2)),
            "centroid": {"x": float(centroid[0]), "y": float(centroid[1])},
            "spread": float(distances.std())
        }
"""

    # Skapa backend-filer
    for path in backend_paths:
        create_file(root / path)
    
    create_file(root / "backend/requirements.txt", requirements_content)
    create_file(root / "backend/main.py", main_content)
    create_file(root / "backend/app/core/config.py", config_content)
    create_file(root / "backend/app/db/mongodb.py", mongodb_content)
    create_file(root / "backend/app/services/pattern_analysis.py", pattern_analysis_content)

    # Frontend struktur
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
        "frontend/src/App.jsx",
        "frontend/src/main.jsx",
        "frontend/index.html",
    ]

    # Skapa package.json för frontend
    package_json = {
        "name": "hagelskott-frontend",
        "private": True,
        "version": "0.0.0",
        "type": "module",
        "scripts": {
            "dev": "vite",
            "build": "vite build",
            "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
            "preview": "vite preview"
        },
        "dependencies": {
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
            "@reduxjs/toolkit": "^1.9.7",
            "react-redux": "^8.1.3",
            "axios": "^1.6.2"
        },
        "devDependencies": {
            "@types/react": "^18.2.37",
            "@types/react-dom": "^18.2.15",
            "@vitejs/plugin-react": "^4.2.0",
            "autoprefixer": "^10.4.16",
            "eslint": "^8.53.0",
            "eslint-plugin-react": "^7.33.2",
            "eslint-plugin-react-hooks": "^4.6.0",
            "eslint-plugin-react-refresh": "^0.4.4",
            "postcss": "^8.4.31",
            "tailwindcss": "^3.3.5",
            "vite": "^5.0.0"
        }
    }

    create_file(root / "frontend/package.json", json.dumps(package_json, indent=2))

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
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  backend:
    build:
      context: ./backend
      dockerfile: ../docker/backend.Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    environment:
      - MONGODB_URL=mongodb://mongodb:27017
    depends_on:
      - mongodb

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

volumes:
  mongodb_data:
"""

    create_file(root / "docker/backend.Dockerfile", dockerfile_backend)
    create_file(root / "docker/frontend.Dockerfile", dockerfile_frontend)
    create_file(root / "docker/docker-compose.yml", docker_compose)

    # README
    readme_content = """# Hagelskott Analys

Ett program för att analysera hagelskottsmönster och spara resultat.

## Installation av utvecklingsmiljö

### 1. Installera MongoDB
- Ladda ner och installera MongoDB Community Server från https://www.mongodb.com/try/download/community
- Eller kör med Docker: `docker run -d -p 27017:27017 --name mongodb mongodb/mongodb-community-server`

### 2. Installera Node.js och npm
- Ladda ner och installera Node.js från https://nodejs.org/
- Välj LTS-versionen
- Starta om datorn efter installationen

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
docker compose -f docker/docker-compose.yml up --build
```
"""
    
    create_file(root / "README.md", readme_content)

if __name__ == "__main__":
    create_project_structure()
    print("✅ Projektstruktur skapad framgångsrikt!")
    print("\n📁 Du hittar projektet i mappen 'hagelskott-analys'")
    print("\n🚀 Nästa steg:")
    print("1. Installera MongoDB (antingen lokalt eller via Docker)")
    print("2. Installera Node.js från https://nodejs.org/ (välj LTS-versionen)")
    print("3. cd hagelskott-analys")
    print("4. Följ instruktionerna i README.md för att starta projektet")