import subprocess
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from detectors.image_detector import analyze_image

app = FastAPI(title="PADS API", version="0.1.0")

# dossier d'upload
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# servir les fichiers uploadés (images extraites, etc.)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS pour le front Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "PADS API is running"}


@app.get("/health")
def health():
    return {"status": "ok", "service": "pads-api"}


@app.post("/upload")
async def upload_media(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    original_name = file.filename
    ext = Path(original_name).suffix
    saved_name = f"{timestamp}{ext}"
    saved_path = UPLOAD_DIR / saved_name

    with saved_path.open("wb") as buffer:
        buffer.write(await file.read())

    return {
        "message": "file uploaded",
        "filename": original_name,
        "saved_as": str(saved_path),
        "size": saved_path.stat().st_size,
    }


@app.post("/analyze/image")
async def analyze_image_endpoint(file: UploadFile = File(...)):
    """
    1. on sauvegarde l'image
    2. on passe le chemin au détecteur existant
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    original_name = file.filename
    ext = Path(original_name).suffix
    saved_name = f"{timestamp}{ext}"
    saved_path = UPLOAD_DIR / saved_name

    with saved_path.open("wb") as buffer:
        buffer.write(await file.read())

    try:
        result = analyze_image(str(saved_path))
    except Exception as e:
        # si le modèle plante on renvoie un 500 clair
        raise HTTPException(status_code=500, detail=f"Analysis error: {e}")

    return {
        "filename": original_name,
        "stored_at": str(saved_path),
        "analysis": result,
    }


@app.post("/analyze/video")
async def analyze_video_endpoint(file: UploadFile = File(...)):
    """
    1. on sauvegarde la vidéo
    2. on essaie d'extraire plusieurs frames avec ffmpeg (1s, 2s, 3s)
    3. on analyse chaque frame comme une image
    4. on renvoie TOUT, même si ffmpeg n'est pas dispo
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    # 1. sauvegarde vidéo
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    original_name = file.filename
    ext = Path(original_name).suffix or ".mp4"
    saved_name = f"{timestamp}{ext}"
    saved_path = UPLOAD_DIR / saved_name

    with saved_path.open("wb") as buffer:
        buffer.write(await file.read())

    # timestamps qu'on veut analyser
    timestamps_sec = [1, 2, 3]

    frame_results = []
    detected_labels = []
    ffmpeg_ok = True

    for t in timestamps_sec:
        frame_name = f"{timestamp}_{t}s_{uuid.uuid4().hex}.jpg"
        frame_path = UPLOAD_DIR / frame_name

        cmd = [
            "ffmpeg",
            "-ss", str(t),
            "-i", str(saved_path),
            "-frames:v", "1",
            "-y",
            str(frame_path),
        ]

        try:
            proc = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=False,
            )
        except FileNotFoundError:
            # ffmpeg pas installé → on note l'erreur mais on ne renvoie pas 500
            ffmpeg_ok = False
            frame_results.append(
                {
                    "timestamp": t,
                    "path": None,
                    "error": "ffmpeg not found on server",
                }
            )
            # pas besoin de tenter les autres timestamps
            break

        if proc.returncode != 0:
            # ffmpeg a tourné mais a échoué pour ce timestamp
            ffmpeg_ok = False
            frame_results.append(
                {
                    "timestamp": t,
                    "path": None,
                    "error": f"ffmpeg failed at {t}s",
                    "stderr": proc.stderr,
                }
            )
            # on continue quand même pour les autres seconds
            continue

        # si on arrive là : on a bien une image
        if not frame_path.exists():
            frame_results.append(
                {
                    "timestamp": t,
                    "path": None,
                    "error": "ffmpeg said ok but frame was not created",
                }
            )
            continue

        # analyse de la frame
        try:
            analysis_result = analyze_image(str(frame_path))
            frame_results.append(
                {
                    "timestamp": t,
                    "path": str(frame_path),
                    "analysis": analysis_result,
                }
            )
            if isinstance(analysis_result, dict) and "label" in analysis_result:
                detected_labels.append(analysis_result["label"])
        except Exception as e:
            frame_results.append(
                {
                    "timestamp": t,
                    "path": str(frame_path),
                    "error": f"image analysis failed: {e}",
                }
            )

    # petit résumé
    summary = {
        "frames_analyzed": len(frame_results),
        "labels": detected_labels,
        "ffmpeg_ok": ffmpeg_ok,
    }

    # trouver le premier timestamp où on a "human"
    first_human_at = None
    for fr in frame_results:
        analysis = fr.get("analysis")
        if isinstance(analysis, dict) and analysis.get("label") == "human":
            first_human_at = fr["timestamp"]
            break
    summary["first_human_at"] = first_human_at

    # on renvoie toujours 200, même si ffmpeg a raté
    return {
        "filename": original_name,
        "stored_at": str(saved_path),
        "frames": frame_results,
        "summary": summary,
    }

