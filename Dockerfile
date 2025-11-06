FROM python:3.11-slim

# libs nécessaires pour opencv-headless et ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# on installe d'abord les deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# on copie le code
COPY . .

# Railway fournit $PORT, on l'utilise, sinon 8000 en local
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

