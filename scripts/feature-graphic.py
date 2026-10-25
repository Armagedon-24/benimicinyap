#!/usr/bin/env python3
"""Google Play tanitim gorseli (feature graphic) 1024x500 — Benim Icin Yap."""
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1024, 500
BRAND = (11, 42, 91)       # #0B2A5B
BRAND2 = (23, 74, 138)     # acik lacivert
ACCENT = (59, 130, 246)    # mavi vurgu
LIGHT = (219, 234, 254)    # acik metin

# --- zemin: diyagonal gradyan ---
bg = Image.new("RGB", (W, H))
d = ImageDraw.Draw(bg)
for y in range(H):
    t = y / H
    r = int(BRAND[0] + (BRAND2[0] - BRAND[0]) * t)
    g = int(BRAND[1] + (BRAND2[1] - BRAND[1]) * t)
    b = int(BRAND[2] + (BRAND2[2] - BRAND[2]) * t)
    d.line([(0, y), (W, y)], fill=(r, g, b))

# --- dekoratif seffaf daireler ---
deco = Image.new("RGBA", (W, H), (0, 0, 0, 0))
dd = ImageDraw.Draw(deco)
dd.ellipse([720, -160, 1180, 300], fill=(255, 255, 255, 14))
dd.ellipse([820, 260, 1220, 660], fill=(59, 130, 246, 26))
dd.ellipse([-140, 300, 220, 660], fill=(255, 255, 255, 10))
dd.ellipse([560, 60, 620, 120], fill=(59, 130, 246, 40))
bg = Image.alpha_composite(bg.convert("RGBA"), deco).convert("RGB")
d = ImageDraw.Draw(bg)

F_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
F_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
f_title = ImageFont.truetype(F_BOLD, 64)
f_tag = ImageFont.truetype(F_REG, 27)
f_badge = ImageFont.truetype(F_BOLD, 18)

# --- ikon (yumusak gollu kare) ---
icon = Image.open("/home/z/my-project/public/icons/icon-512.png").convert("RGBA")
S = 240
icon = icon.resize((S, S), Image.LANCZOS)
mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, S, S], radius=52, fill=255)
shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ImageDraw.Draw(shadow).rounded_rectangle([58, 132, 58 + S + 14, 132 + S + 14], radius=58, fill=(0, 0, 0, 90))
shadow = shadow.filter(ImageFilter.GaussianBlur(14))
bg = Image.alpha_composite(bg.convert("RGBA"), shadow)
bg.paste(icon, (64, 130), mask)
bg = bg.convert("RGB")
d = ImageDraw.Draw(bg)

# --- metinler ---
tx = 356
d.text((tx, 168), "Benim İçin Yap", font=f_title, fill=(255, 255, 255))
d.text((tx + 3, 258), "Görev ver, güvenceyle öde", font=f_tag, fill=LIGHT)

# --- rozetler (alt bantta tek sirada) ---
badges = ["Escrow Ödeme Güvencesi", "Uçtan Uca Şifreli Mesaj", "T.C. Kimlik Doğrulama"]
bx = 64
by = 428
for b in badges:
    w = d.textlength(b, font=f_badge)
    pad = 16
    d.rounded_rectangle([bx, by, bx + w + pad * 2, by + 38], radius=19,
                        fill=(23, 74, 138), outline=(120, 170, 230), width=2)
    d.text((bx + pad, by + 8), b, font=f_badge, fill=(255, 255, 255))
    bx += w + pad * 2 + 12

bg.save("/home/z/my-project/download/play-store-paketi/tanitim-gorseli-1024x500.png", optimize=True)
print("OK: tanitim-gorseli-1024x500.png")
