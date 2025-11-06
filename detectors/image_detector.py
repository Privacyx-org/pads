from transformers import pipeline
from pathlib import Path

# pipeline stable et public
_image_pipeline = pipeline(
    "image-classification",
    model="umm-maybe/AI-image-detector"
)

def analyze_image(image_path: str):
    """
    Analyse une image locale et retourne un dict avec :
    - label (AI-generated / real)
    - score (0-1)
    """
    result = _image_pipeline(str(Path(image_path)))[0]
    return {
        "label": result["label"],
        "score": float(result["score"]),
        "model": "umm-maybe/AI-image-detector"
    }

