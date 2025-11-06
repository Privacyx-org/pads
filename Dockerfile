FROM python:3.12-slim

# 1) avoir ffmpeg pour ton /analyze/video
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2) copier les dépendances
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# 3) copier le code
COPY . /app

# Railway fournit la variable d'env PORT
ENV PYTHONUNBUFFERED=1

# 4) lancer uvicorn, en écoutant sur 0.0.0.0:$PORT (très important)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

