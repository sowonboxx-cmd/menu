# Verso anglais du menu A4 : print/menu-a4.html → print/menu-a4-en.html
import re
s = open("print/menu-a4.html").read()
R = [
    ('lang="fr"', 'lang="en"'),
    ("<h2>Huîtres", "<h2>Oysters"), ("<h2>Plateaux", "<h2>Platters"), ("<h2>Tartinades", "<h2>Spreads"),
    ("<h2>Terre & mer", "<h2>Land & sea"), ("<h2>Boissons", "<h2>Drinks"),
    ("<h3>À partager", "<h3>To share"), ("<h3>Plaisir solitaire", "<h3>Just for you"),
    ("<h3>Rillettes de poissons", "<h3>Fish rillettes"), ("<h3>Tartares d'algues", "<h3>Seaweed tartare"),
    ('bcat">Bières', 'bcat">Beers'), ('bcat">Bulles', 'bcat">Bubbles'), ('bcat">Rouges &amp; rosé', 'bcat">Red &amp; rosé'),
    ('bcat">Softs', 'bcat">Soft drinks'), ('bcat">Spiritueux &amp; cocktail', 'bcat">Spirits &amp; cocktail'), ('bcat">Vins blancs', 'bcat">White wines'),
    ("<small>· les 12", "<small>· 12 pcs"), ("<small>· les 6", "<small>· 6 pcs"), ("<small>les 3", "<small>3 pcs"), ("<small>les 6", "<small>6 pcs"),
    ("12 huîtres n°3, 2 coupes de champagne", "12 n°3 oysters, 2 glasses of champagne"),
    ("12 huîtres n°3, 200 g de bulots, 6 gambas", "12 n°3 oysters, 200 g whelks, 6 prawns"),
    ("12 huîtres n°3, charcuterie, gambas, bulots, tartinade", "12 n°3 oysters, charcuterie, prawns, whelks, spread"),
    ("200 g, « mayonnalgue » maison", "200 g, homemade seaweed mayonnaise"),
    ("3 huîtres n°3, 50 g de bulots, 3 gambas", "3 n°3 oysters, 50 g whelks, 3 prawns"),
    ("6 gambas, « mayonnalgue » maison", "6 prawns, homemade seaweed mayonnaise"),
    ("6 huîtres n°3, 1 coupe de champagne", "6 n°3 oysters, 1 glass of champagne"),
    ("6 huîtres n°3, 4 gambas", "6 n°3 oysters, 4 prawns"),
    ("Beurre herbé, chapelure croustillante, servies chaudes", "Herb butter, crispy breadcrumbs, served hot"),
    ("Pain, beurre, citron, vinaigre-échalotes", "Bread, butter, lemon, shallot vinegar"),
    ("Saucisson de jambon, andouille, filet mignon fumé", "Ham sausage, andouille, smoked pork fillet"),
    ("Servie avec fromage et pain", "Served with cheese and bread"),
    ('nm">Breizh Cola / Cola zéro', 'nm">Breizh Cola / Cola zero'), ('nm">Bulots', 'nm">Whelks'),
    ('nm">Caviar de nori', 'nm">Nori caviar'), ('nm">Dorade combava &amp; gingembre', 'nm">Sea bream, makrut lime &amp; ginger'),
    ('nm">Gambas de Madagascar', 'nm">Madagascar prawns'), ('nm">Gin, rhum, esprit malt', 'nm">Gin, rum, malt spirit'),
    ('nm">Homard bleu', 'nm">Blue lobster'), ('nm">Huîtres gratinées', 'nm">Baked oysters'),
    ('nm">Huîtres natures n°2', 'nm">Natural oysters n°2'), ('nm">Huîtres natures n°3', 'nm">Natural oysters n°3'),
    ('nm">Huîtres natures n°4', 'nm">Natural oysters n°4'), ('nm">Jus de pomme breton', 'nm">Breton apple juice'),
    ('nm">La Blonde 5,5°', 'nm">Blonde beer 5.5°'), ('nm">La IPA 6°', 'nm">IPA 6°'),
    ('nm">Liqueur citron ou menthe', 'nm">Lemon or mint liqueur'), ('nm">Maquereau au poivre de Sichuan', 'nm">Mackerel, Sichuan pepper'),
    ('nm">Nature', 'nm">Natural'), ("nm\">Ormeaux de l'île de Groix", 'nm">Abalone from Groix island'),
    ('nm">Planche de charcuterie bretonne', 'nm">Breton charcuterie board'), ('nm">Pomme et miel', 'nm">Apple &amp; honey'),
    ('nm">Pétillant Saumur', 'nm">Saumur sparkling wine'), ('nm">Saint-Jacques à la bretonne', 'nm">Breton-style scallops'),
    ("nm\">Sardines au piment d'Espelette", 'nm">Sardines, Espelette pepper'), ('nm">Soleil', 'nm">Sun'),
    ('nm">Soupe de poisson', 'nm">Fish soup'), ('nm">Truite de Bretagne', 'nm">Breton trout'),
    ("Vous passez devant&nbsp;?", "Passing by?"), ("Réservez<br>maintenant", "Book<br>now"),
    ("Scannez, c'est fait en 30 secondes.", "Scan, it only takes 30 seconds."),
    ("Avec le code", "With the code"), (", une coupe de pétillant offerte à l'arrivée.", ", a glass of sparkling wine on arrival."),
    ("<span>Du mardi au dimanche, dès 17 h</span>", "<span>Tuesday to Sunday, from 5 pm</span>"),
    ("<span>09 74 64 05 87</span>", "<span>+33 9 74 64 05 87</span>"),
    ('nm">Cidre Nicol pression', 'nm">Nicol draught cider'), ('nm">Shot premium', 'nm">Premium shot'),
    ("Supplément fromage +4", "Extra cheese +4"), ('bcat">Beers &amp; cidres', 'bcat">Beers &amp; ciders'),
]
for a, b in R:
    assert a in s, a
    s = s.replace(a, b)
# prix à l'anglaise : 5,50 → 5.50 (dans les prix seulement)
s = re.sub(r'(<span class="pr">.*?</span>)', lambda m: re.sub(r'(\d),(\d)', r'\1.\2', m.group(1)), s)
open("print/menu-a4-en.html", "w").write(s)
left = re.findall(r'[àâéèêîôûç]', re.sub(r'<style>.*?</style>|<[^>]+>', ' ', s, flags=re.S))
print("ok, accents restants :", len(left))
