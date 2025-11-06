import tempfile
from pathlib import Path
import ffmpeg

from detectors.image_detector import analyze_image

def extract_frames(video_path: str, every_n_frames: int = 30, max_frames: int = 10):
    """
    Extrait 1 frame toutes les `every_n_frames` images
    et retourne la liste des chemins vers les images extraites.
    """
    video_path = Path(video_path)
    temp_dir = Path(tempfile.mkdtemp())
    output_pattern = str(temp_dir / "frame_%04d.jpg")

    # extraire les frames
    (
        ffmpeg
        .input(str(video_path))
        .filter("select", f"not(mod(n\\,{every_n_frames}))")
        .output(output_pattern, vframes=max_frames, vsync=0)
        .run(quiet=True, overwrite_output=True)
    )

    frames = sorted(temp_dir.glob("frame_*.jpg"))
    return frames

def analyze_video(video_path: str):
    """
    Analyse une vidéo en extrayant quelques frames
    puis en passant chaque frame dans le détecteur d'image.
    Retourne un score moyen + les frames suspectes.
    """
    frames = extract_frames(video_path)
    if not frames:
        return {
            "error": "no_frames_extracted",
            "score": None,
            "frames": []
        }

    results = []
    for frame in frames:
        img_result = analyze_image(str(frame))
        results.append({
            "frame_path": str(frame),
            "label": img_result["label"],
            "score": img_result["score"],
        })

    # calcul score global = moyenne des scores "AI-generated"
    # (si le modèle renvoie "real", on inverse le score)
    total = 0.0
    count = 0
    for r in results:
        s = r["score"]
        if r["label"].lower().startswith("real"):
            s = 1 - s  # on considère que "real" avec score 0.9 = pas IA
        total += s
        count += 1

    global_score = total / count if count else None

    return {
        "score": round(global_score, 4) if global_score is not None else None,
        "frames_analyzed": len(results),
        "frame_results": results,
    }

