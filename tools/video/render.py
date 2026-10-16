#!/usr/bin/env python3
"""Rend une animation HTML (fonction window.render(t)) en vidéo MP4 1080×1920, 30 i/s.
Usage : python3 tools/video/render.py tools/video/club-promo.html sortie.mp4 [musique.wav] [--frames 0,3,6]"""
import asyncio, sys, os, subprocess, tempfile, pathlib
from playwright.async_api import async_playwright
src, out = sys.argv[1], sys.argv[2]
audio = next((a for a in sys.argv[3:] if a.endswith('.wav')), None)
only = next((a.split('=')[1] for a in sys.argv[3:] if a.startswith('--frames=')), None)
FPS = 30
async def main():
    tmp = tempfile.mkdtemp()
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1080, 'height': 1920})
        await pg.goto(pathlib.Path(src).resolve().as_uri(), wait_until='networkidle')
        await pg.evaluate('document.fonts.ready'); await pg.wait_for_timeout(500)
        dur = await pg.evaluate('window.DUR')
        times = [float(x) for x in only.split(',')] if only else [i / FPS for i in range(int(dur * FPS))]
        for i, t in enumerate(times):
            await pg.evaluate(f'render({t})')
            await pg.screenshot(path=f'{tmp}/f{i:05d}.jpg', type='jpeg', quality=92)
        await b.close()
    if only:
        for i, t in enumerate(times): os.replace(f'{tmp}/f{i:05d}.jpg', f'{out}-{t}.jpg')
        print('frames ok'); return
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', f'{tmp}/f%05d.jpg']
    if audio: cmd += ['-i', audio, '-c:a', 'aac', '-b:a', '192k', '-shortest']
    cmd += ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', '-movflags', '+faststart', out]
    subprocess.run(cmd, check=True); print(out)
asyncio.run(main())
