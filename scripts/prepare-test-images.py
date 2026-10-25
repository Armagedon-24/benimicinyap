"""Test kanıt görselleri hazırlama:
A) human-proof.jpg  -> gerçek foto + gerçekçi kamera EXIF (Canon EOS 90D, GPS Antalya)
B) ai-proof.png     -> z-ai SDK ile üretilmiş AI görseli (EXIF yok)
"""
import subprocess
import sys

import piexif
from PIL import Image
from PIL.ExifTags import Base

HUMAN_PATH = "/home/z/my-project/public/proof/human-proof.jpg"
AI_PATH = "/home/z/my-project/public/proof/ai-proof.png"

# --- A) Real photo + realistic camera EXIF ---
img = Image.open("/tmp/raw-cleaning.jpg").convert("RGB")
img.save(HUMAN_PATH, "JPEG", quality=88)

exif_dict = {
    "0th": {
        piexif.ImageIFD.Make: b"Canon",
        piexif.ImageIFD.Model: b"Canon EOS 90D",
        piexif.ImageIFD.Software: b"Canon EOS 90D v1.1.2",
        piexif.ImageIFD.DateTime: b"2026:10:25 09:14:33",
    },
    "Exif": {
        piexif.ExifIFD.DateTimeOriginal: b"2026:10:25 09:14:33",
        piexif.ExifIFD.LensModel: b"EF-S18-135mm f/3.5-5.6 IS USM",
        piexif.ExifIFD.ExposureTime: (1, 125),
        piexif.ExifIFD.FNumber: (45, 10),
        piexif.ExifIFD.ISOSpeed: 400,
    },
    "GPS": {
        piexif.GPSIFD.GPSLatitudeRef: b"N",
        piexif.GPSIFD.GPSLatitude: ((36, 1), (53, 1), (2, 100)),
        piexif.GPSIFD.GPSLongitudeRef: b"E",
        piexif.GPSIFD.GPSLongitude: ((30, 1), (42, 1), (20, 100)),
    },
}
piexif.insert(piexif.dump(exif_dict), HUMAN_PATH)
print("A) human-proof.jpg yazildi (Canon EOS 90D EXIF + GPS Antalya)")

# --- B) AI-generated image via z-ai SDK (no EXIF) ---
prompt = (
    "Fotorealistic smartphone photo taken by a cleaner standing in a bright modern living room "
    "after finishing cleaning, spotless floor, tidy sofa, sunlight through window, slightly amateur framing, high quality, detailed"
)
result = subprocess.run(
    ["z-ai", "image", "-p", prompt, "-o", AI_PATH, "-s", "1152x864"],
    capture_output=True, text=True, timeout=180,
)
if result.returncode != 0:
    print("AI image generation FAILED:", result.stdout, result.stderr)
    sys.exit(1)
print("B) ai-proof.png uretildi (z-ai SDK, EXIF yok)")
