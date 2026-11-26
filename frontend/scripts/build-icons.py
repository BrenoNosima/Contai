"""Package the unchanged brand artwork for home-screen icons.

Only transparent outer whitespace is removed. No visible pixels, colors or
lettering are replaced; iOS applies its own rounded mask.
Run from the repository root with Pillow installed.
"""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2]
source = Image.open(root / "design-assets/brand/contai-logo.png").convert("RGBA")
source = source.crop(source.getbbox())
for size, name in [(180, "apple-touch-icon"), (192, "icon-192"), (512, "icon-512")]:
    artwork = source.copy()
    artwork.thumbnail((round(size * .82), round(size * .82)), Image.Resampling.LANCZOS)
    icon = Image.new("RGB", (size, size), "#0d0f10")
    icon.paste(artwork, ((size - artwork.width) // 2, (size - artwork.height) // 2), artwork)
    icon.save(root / f"frontend/public/brand/{name}.png", optimize=True)
