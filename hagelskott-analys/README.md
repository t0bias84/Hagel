# Hagelskott Analys

Ett program för att analysera hagelskottsmönster och spara resultat.

## Installation av utvecklingsmiljö

### 1. Installera MongoDB
- Ladda ner och installera MongoDB Community Server från https://www.mongodb.com/try/download/community
- Eller kör med Docker: `docker run -d -p 27017:27017 --name mongodb mongodb/mongodb-community-server`

### 2. Installera Node.js och npm
- Ladda ner och installera Node.js från https://nodejs.org/
- Välj LTS-versionen
- Starta om datorn efter installationen

### Konfiguration
Kopiera `.env.example` till `.env` i både `backend` och `frontend` och fyll i egna värden.


### Backend
1. Skapa virtual environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # På Windows: venv\Scripts\activate
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
