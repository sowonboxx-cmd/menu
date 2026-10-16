#!/usr/bin/env python3
"""Petite musique dynamique « bretonne » synthétisée (bombarde + biniou en bourdon + percussions),
libre de droits puisqu'entièrement générée ici. Usage : python3 tools/video/music.py sortie.wav [durée_s]"""
import sys, numpy as np, wave

SR = 44100
BPM = 140
E8 = 60 / BPM / 2                     # une croche
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 20.0
N = int(SR * DUR)
mixL = np.zeros(N); mixR = np.zeros(N)
NOTE = {'C': -9, 'D': -7, 'E': -5, 'F': -4, 'F#': -3, 'G': -2, 'A': 0, 'B': 2}
def hz(n):
    name, octv = n[:-1], int(n[-1]); return 440 * 2 ** ((NOTE[name] + 12 * (octv - 4)) / 12)
def add(sig, start, pan=0.5, gain=1.0):
    i = int(start * SR); j = min(N, i + len(sig))
    if i >= N: return
    mixL[i:j] += sig[:j - i] * gain * (1 - pan) * 2 ** .5 / 2 * 2 ** .5
    mixR[i:j] += sig[:j - i] * gain * pan * 2 ** .5 / 2 * 2 ** .5
def env(n, a=.01, r=.06):
    e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e

# Bombarde : timbre nasal (harmoniques impaires et paires, formant ~1,4 kHz), léger vibrato
def bombarde(f, d):
    n = int(d * SR); t = np.arange(n) / SR
    vib = 1 + .006 * np.sin(2 * np.pi * 6 * t) * np.clip(t / .15, 0, 1)
    ph = 2 * np.pi * f * np.cumsum(vib) / SR
    s = sum((1 / k ** .8) * (1.6 if 1100 < k * f < 1900 else 1) * np.sin(k * ph) for k in range(1, 12))
    return np.tanh(1.4 * s) * env(n, .008, min(.05, d * .3))
def grace(f, d):  # petit coup de gorge (ornement) avant la note
    g = bombarde(f * 2 ** (2 / 12), .035); m = bombarde(f, d - .035)
    return np.concatenate([g, m])

A1 = [('D5', 2), ('D5', 1), ('C5', 1), ('A4', 2), ('G4', 1), ('A4', 1)]
A2 = [('B4', 1), ('A4', 1), ('G4', 1), ('F#4', 1), ('E4', 2), ('D4', 2)]
A3 = [('F#4', 1), ('G4', 1), ('A4', 2), ('A4', 1), ('B4', 1), ('C5', 1), ('A4', 1)]
A4 = [('B4', 2), ('A4', 2), ('G4', 2), ('E4', 2)]
B1 = [('D5', 2), ('E5', 1), ('D5', 1), ('C5', 2), ('A4', 2)]
B2 = [('B4', 1), ('C5', 1), ('D5', 1), ('B4', 1), ('A4', 2), ('G4', 2)]
B3 = [('A4', 1), ('B4', 1), ('C5', 1), ('A4', 1), ('G4', 1), ('F#4', 1), ('E4', 1), ('G4', 1)]
B4 = [('D4', 4), ('D4', 2), ('A4', 2)]
TUNE = [A1, A2, A3, A4, B1, B2, B3, B4, A1, A2, A3, A4]
INTRO = 2 * 8 * E8      # 2 mesures de bourdon + percussions avant la mélodie

t0 = INTRO
for bar in TUNE:
    for k, (n, l) in enumerate(bar):
        d = l * E8
        sig = grace(hz(n), d * .95) if (l >= 2 and k % 2 == 0) else bombarde(hz(n), d * .92)
        add(sig, t0, pan=.55, gain=.16)
        add(bombarde(hz(n) / 2, d * .9), t0, pan=.4, gain=.05)   # doublure à l'octave (biniou)
        t0 += d

# Biniou / bourdon : ré et la graves, en continu
t = np.arange(N) / SR
dr = sum(np.sin(2 * np.pi * k * 73.42 * t) / k for k in range(1, 9)) * .5 + sum(np.sin(2 * np.pi * k * 110 * t) / k for k in range(1, 7)) * .3
dr *= np.clip(t / 1.2, 0, 1) * (1 + .05 * np.sin(2 * np.pi * .3 * t))
mixL += dr * .05; mixR += dr * .05

# Percussions
def kick():
    n = int(.28 * SR); tt = np.arange(n) / SR; f = 140 * np.exp(-tt * 18) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9)
def snare():
    n = int(.18 * SR); tt = np.arange(n) / SR
    return (np.random.default_rng(1).standard_normal(n) * .7 + np.sin(2 * np.pi * 190 * tt) * .5) * np.exp(-tt * 22)
def hat(o=False):
    n = int((.12 if o else .04) * SR); tt = np.arange(n) / SR
    x = np.random.default_rng(2).standard_normal(n); x = np.diff(np.concatenate([[0], x]))
    return x * np.exp(-tt * (25 if o else 90))
def tamb():
    n = int(.09 * SR); tt = np.arange(n) / SR
    x = np.random.default_rng(3).standard_normal(n); x = np.diff(np.concatenate([[0], np.diff(np.concatenate([[0], x]))]))
    return x * np.exp(-tt * 35) * .6
beat = 2 * E8; nb = int(DUR / beat)
for b in range(nb):
    tb = b * beat
    full = tb >= INTRO - .01
    add(hat(), tb, .7, .10); add(hat(b % 2 == 1), tb + E8, .7, .08)
    if full or b % 2 == 0: add(kick(), tb, .5, .9 if full else .6)
    if full and b % 2 == 1: add(snare(), tb, .45, .28)
    if full: add(tamb(), tb + E8, .3, .25)
# grand coup final
end_hit = min(DUR - 1.2, 16.8)
add(kick(), end_hit, .5, 1.2); add(snare(), end_hit, .5, .4)

# petite réverbération (échos décalés) + normalisation + fondu de fin
def verb(x):
    y = x.copy()
    for d, g in [(.031, .35), (.047, .28), (.071, .22), (.113, .16), (.167, .1)]:
        k = int(d * SR); y[k:] += x[:-k] * g
    return y
L, R = verb(mixL), verb(mixR)
fade = np.clip((DUR - t) / 1.5, 0, 1); L *= fade; R *= fade
m = max(np.abs(L).max(), np.abs(R).max()); L, R = L / m * .89, R / m * .89
data = (np.stack([L, R], 1) * 32767).astype(np.int16)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())
print(sys.argv[1])
