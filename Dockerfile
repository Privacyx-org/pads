FROM python:3.11-slim

# dépendances système minimales
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# on copie les dépendances d'abord
COPY requirements.txt .

# on installe en précisant le repo CPU de torch
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

# on copie le reste du code
COPY . .

# lancer uvicorn en écoutant le port fourni par Railway
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

