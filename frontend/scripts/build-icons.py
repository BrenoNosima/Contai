"""Export the symbol-only artwork for home-screen icons.

The full logo used inside the website remains a separate asset. The square
symbol artwork already includes safe padding; iOS applies its rounded mask.
Run from the repository root with Pillow installed.
"""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2]
source = Image.open(root / "design-assets/brand/contai-symbol-icon.png").convert("RGB")
for size, name in [(180, "apple-touch-icon-symbol"), (192, "icon-symbol-192"), (512, "icon-symbol-512")]:
    icon = source.resize((size, size), Image.Resampling.LANCZOS)
    icon.save(root / f"frontend/public/brand/{name}.png", optimize=True)
