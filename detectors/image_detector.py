from pathlib import Path
from PIL import Image

# version "lite" pour le cloud : pas de torch, pas de transformers
# on renvoie un dict compatible avec le front

def analyze_image(image_path: str) -> dict:
    p = Path(image_path)
    try:
        img = Image.open(p)
        width, height = img.size
    except Exception:
        # si on ne peut pas ouvrir, on renvoie quand même quelque chose
        return {
            "label": "unknown",
            "score": 0.0,
            "model": "pads-lite/cloud-detector",
        }

    # micro heuristique rigolote juste pour avoir un résultat
    # tu pourras la remplacer par ton vrai modèle plus tard
    if width >= height:
        label = "artificial"
        score = 0.82
    else:
        label = "human"
        score = 0.77

    return {
        "label": label,
        "score": score,
        "model": "pads-lite/cloud-detector",
    }

