#!/usr/bin/env python3
"""Cartouche « Scan to play » : rouge à l'extérieur, blanc au milieu, bleu à l'intérieur, coins creusés.
Usage : python3 tools/svg/cartouche.py sortie.svg [largeur] [hauteur]
Les coins gardent leur forme quelle que soit la taille : refaire le fichier à la taille voulue plutôt que d'étirer."""
import sys, math
W = float(sys.argv[2]) if len(sys.argv) > 2 else 900
H = float(sys.argv[3]) if len(sys.argv) > 3 else 220
R = H * 0.15          # rayon du coin creusé
RED, WHITE, BLUE = '#C0262D', '#F6F1E7', '#10285E'
T_RED, T_WHITE = H * 0.065, H * 0.04   # épaisseurs des bandes rouge et blanche

def shape(d):
    p = R + d; k = math.sqrt(p * p - d * d); f = lambda v: f'{v:.2f}'
    return (f'M{f(k)},{f(d)} H{f(W-k)} A{f(p)},{f(p)} 0 0 0 {f(W-d)},{f(k)} V{f(H-k)} '
            f'A{f(p)},{f(p)} 0 0 0 {f(W-k)},{f(H-d)} H{f(k)} A{f(p)},{f(p)} 0 0 0 {f(d)},{f(H-k)} '
            f'V{f(k)} A{f(p)},{f(p)} 0 0 0 {f(k)},{f(d)} Z')
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:g} {H:g}" width="{W:g}" height="{H:g}">
  <path d="{shape(0)}" fill="{RED}"/>
  <path d="{shape(T_RED)}" fill="{WHITE}"/>
  <path d="{shape(T_RED + T_WHITE)}" fill="{BLUE}"/>
</svg>
'''
open(sys.argv[1], 'w').write(svg); print(sys.argv[1])
