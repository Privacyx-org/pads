# Étape 1 : base image plus légère
FROM python:3.11-slim

# Étape 2 : installation minimale des dépendances système
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Étape 3 : création du dossier d’app
WORKDIR /app

# Étape 4 : copier requirements et installer en mode optimisé
COPY requirements.txt .

# Installation allégée sans cache ni dev packages
RUN pip install --no-cache-dir -r requirements.txt

# Étape 5 : copier le code applicatif
COPY . .

# Étape 6 : lancer FastAPI via uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]

