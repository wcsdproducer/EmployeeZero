#!/usr/bin/env python3
"""Convert animated WebP to MP4 for TikTok demo submission."""
import sys
from PIL import Image
import cv2
import numpy as np
import os

INPUT = sys.argv[1]
OUTPUT = sys.argv[2]
FPS = 2  # Browser recordings are slow-paced

print(f"Loading {INPUT}...")
im = Image.open(INPUT)
n_frames = getattr(im, 'n_frames', 1)
print(f"Frames: {n_frames}, Size: {im.size}")

im.seek(0)
frame = im.convert("RGB")
w, h = frame.size

scale = 1.0
if w > 1280:
    scale = 1280 / w
    w = 1280
    h = int(h * scale)

fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter(OUTPUT, fourcc, FPS, (w, h))

for i in range(n_frames):
    im.seek(i)
    frame = im.convert("RGB")
    if scale != 1.0:
        frame = frame.resize((w, h), Image.LANCZOS)
    arr = np.array(frame)
    arr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
    out.write(arr)
    if i % 50 == 0:
        print(f"  Frame {i}/{n_frames}")

out.release()
size_mb = os.path.getsize(OUTPUT) / (1024*1024)
print(f"Done! Saved to {OUTPUT} ({size_mb:.1f} MB)")
