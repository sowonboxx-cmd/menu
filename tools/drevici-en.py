# Traduction anglaise de la carte Drevici (Paris + Surzur), utilisée seulement avec ?lang=en (QR du verso anglais).
# La clé est le texte français tel qu'il est saisi dans l'admin ; la page normalise (espaces, guillemets, majuscules).
# À revoir avec Benji. Régénérer : python3 tools/drevici-en.py  → écrit dans drevici-preview/index.html (entre /*I18N_EN*/ et /*/I18N_EN*/), puis publier
EN = {
# Onglets et rubriques
"Huîtres":"Oysters","Plateaux":"Platters","Tartinades":"Spreads","Terre & mer":"Land & sea","Boissons":"Drinks","Cocktails":"Cocktails",
"À partager":"To share","Plaisir solitaire":"Just for you","Les plats incontournables":"Must-try dishes","Les plats à ne pas manquer":"Dishes not to miss",
"Nos spécialités":"Our specialities","Menu du jour":"Today's menu","Rillettes de poissons":"Fish rillettes","Tartare d'algues":"Seaweed tartare",
"Les bières":"Beers","Bulles":"Bubbles","Vins blancs":"White wines","Vins rouges et rosé":"Red & rosé wines","Softs":"Soft drinks",
"Les spiritueux artisanaux":"Craft spirits","Fait avec amour par notre barman":"Made with love by our bartender",
"À grignoter":"Nibbles","Entrée":"Starter","Entrée (10€)":"Starter (€10)","Plats":"Mains","Plats (23€)":"Mains (€23)","Desserts (10€)":"Desserts (€10)",
"Boisson au choix (3)":"Drink of your choice (3)",
# Huîtres
"Huîtres natures n°2":"Natural oysters n°2","Huîtres natures n°3":"Natural oysters n°3","Huîtres natures n°4":"Natural oysters n°4",
"Huîtres gratinées":"Baked oysters","Huîtres, fines de claire (par 6)":"Fines de claire oysters (by 6)",
"Elles sont accompagnées de pain, beurre, citron et/ou vinaigre-échalotes":"Served with bread, butter, lemon and/or shallot vinegar",
"Gratinées au four, beurre herbé, chapelure croustillante, servies chaudes":"Oven-baked with herb butter and crispy breadcrumbs, served hot",
"Huîtres gratinées • Duo Champagne • Rillettes à la truite de Bretagne":"Baked oysters • Champagne duo • Breton trout rillettes",
# Plateaux
"Drevici":"Drevici","Capitaine":"Capitaine","Matelot":"Matelot","Mousaillon":"Mousaillon","Poivrons grillés":"Grilled peppers","Gin tonic, mule":"Gin & tonic, mule","Beurre persillé, emmental gratiné, servies chaudes":"Parsley butter, grilled Emmental cheese, served hot","Servie avec croûtons et emmental":"Served with croutons and Emmental cheese","Gambas":"Prawns","12 huîtres n°3, 200gr de bulots, 6 gambas":"12 n°3 oysters, 200 g whelks, 6 prawns","6 huîtres n°3, 4 gambas":"6 n°3 oysters, 4 prawns","3 huîtres n°3, 50gr de bulots, 3 gambas":"3 n°3 oysters, 50 g whelks, 3 prawns","Moussaillon":"Moussaillon","Duo champagne":"Champagne duo","Solo champagne":"Champagne solo",
"12 huîtres N°3, 2 coupes de champagne":"12 n°3 oysters, 2 glasses of champagne",
"12 huîtres N°3, 200gr de bulots, 6 gambas de Madagascar":"12 n°3 oysters, 200 g whelks, 6 Madagascar prawns",
"12 huîtres N°3, charcuterie bretonne, gambas, bulots, tartinade":"12 n°3 oysters, Breton charcuterie, prawns, whelks, a spread",
"3 huîtres N°3, 50gr de bulots, 3 gambas de Madagascar":"3 n°3 oysters, 50 g whelks, 3 Madagascar prawns",
"6 huîtres N°3, 1 coupe de champagne":"6 n°3 oysters, 1 glass of champagne",
"6 huîtres N°3, 4 gambas de Madagascar":"6 n°3 oysters, 4 Madagascar prawns",
# Terre & mer
"Planche de charcuterie bretonne":"Breton charcuterie board",
"Saucisson de jambon, andouille bretonne, filet mignon fumé":"Ham sausage, Breton andouille, smoked pork fillet",
"Saucisson de jambon, andouille bretonne, filet mignon fumée":"Ham sausage, Breton andouille, smoked pork fillet",
"Gambas de Madagascar":"Madagascar prawns","Bulots":"Whelks","Soupe de Poisson":"Fish soup",
"6 gambas accompagnées d'une \"mayonnalgue\" maison":"6 prawns with homemade seaweed mayonnaise",
"6 gambas accompagnés d'une \"mayonnalgue\" maison":"6 prawns with homemade seaweed mayonnaise",
"200gr de bulots accompagnés d'une \"mayonnalgue\" maison":"200 g whelks with homemade seaweed mayonnaise",
"Délicieuse et savoureuse, servie avec du fromage et du pain":"Rich and tasty, served with cheese and bread",
"Hampe de bœuf":"Beef skirt steak","À la sauce échalote & frites":"With shallot sauce and fries",
"Légumes et pommes grenailles roties":"Vegetables and roast baby potatoes","Légumes rôtis":"Roast vegetables",
"Magret de canard au miel vinaigre":"Duck breast with honey and vinegar","Œuf bio mariné":"Marinated organic egg",
"Terrine maison de veau & cochon":"Homemade veal & pork terrine","Sélection de fromages affinés":"Selection of aged cheeses",
"Pastels de thon (x6)":"Tuna pastels (x6)","Rillettes de lieu noir":"Pollock rillettes","chips":"Crisps","Bao chorizo-comté (2p)":"Chorizo & comté bao (2 pcs)",
"Palourde à l'escabèche, eau de concombre & piment doux":"Clams escabeche, cucumber water & mild chilli",
"Sashimi de maquereau, fraises, échalotes & jaune d'œuf confit au soja":"Mackerel sashimi, strawberries, shallots & soy-cured egg yolk",
"Lieu jaune, coco de Paimpol à la tomate, poireaux brûlés & beurre blanc":"Pollack, Paimpol beans in tomato, charred leeks & beurre blanc",
"Quasi de veau, pommes de terre sautées & sauce Normande":"Veal rump, sautéed potatoes & Normandy sauce",
"Moussaka d'épaule d'agneau & pommes de terre sautées":"Lamb shoulder moussaka & sautéed potatoes",
"Falafels, poivrons confits & sauce blanche aux herbes":"Falafels, confit peppers & herb white sauce",
"Courgettes et poivrons farcis aux champignons, salade d'herbes & sauce tomate":"Mushroom-stuffed courgettes and peppers, herb salad & tomato sauce",
"Compote de quetsches & sorbet fraise":"Damson plum compote & strawberry sorbet","Tarte au citron déstructurée":"Deconstructed lemon tart",
"Dame Blanche : glace vanille, crumble, crème de marron, chantilly & sauce chocolat":"Dame Blanche: vanilla ice cream, crumble, chestnut cream, whipped cream & chocolate sauce",
"Salade de fruits":"Fruit salad","Trou Normand (sorbet pomme & calvados)":"Trou Normand (apple sorbet & calvados)",
# Tartinades
"Nature":"Natural","Soleil":"Soleil","Pomme et Miel":"Apple & honey","Caviar de nori":"Nori caviar",
"Tartare d'algues (4 algues) poivrons grillés et paprika":"Seaweed tartare (4 seaweeds), grilled peppers and paprika",
"Excellente avec du fromage ou à consommer directement dans une huître":"Excellent with cheese, or straight on an oyster",
"Parfait pour accompagner des toasts de chèvre chaud, avec tomme de brebis":"Perfect with warm goat's cheese toast or sheep's milk tomme",
"La Nori est l'or noir breton ! C'est une algue d'une finesse incomparable, difficile à récolter et à sécher":"Nori is Brittany's black gold! A seaweed of unrivalled finesse, hard to harvest and dry",
"La Nori est l'or noir breton! C'est une algue d'une finesse imcomparable, difficile à récolter et à sécher":"Nori is Brittany's black gold! A seaweed of unrivalled finesse, hard to harvest and dry",
"Ormeaux de l'île de Groix":"Abalone from Groix island","Homard Bleu":"Blue lobster","Truite de Bretagne":"Breton trout",
"Saint-Jacques à la bretonne":"Breton-style scallops","Maquereau au Poivre de Sichuan":"Mackerel, Sichuan pepper",
"Sardines au Piment d'Espelette":"Sardines, Espelette pepper","Dorade Combava & Gingembre":"Sea bream, makrut lime & ginger",
"Recette subtile et unique, les saveurs incomparables de l'ormeau":"A subtle, unique recipe with the incomparable flavour of abalone",
"La chair tendre et raffinée du Homard (30%) à travers cette recette qui ravira les fins gourmets":"The tender, refined meat of lobster (30%), in a recipe food lovers will adore",
"Élaborée à partir de truites élevées, filetées et fumées en Bretagne":"Made from trout raised, filleted and smoked in Brittany",
"Exquise de rillettes de Noix Saint-Jacques cuisinées à la bretonne":"Delicate scallop rillettes, cooked the Breton way",
"Très aromatique, cette recette vous fera voyager le temps d'un apéritif":"Highly aromatic, a recipe that takes you travelling over an aperitif",
"Riches en filets de sardines (62%) pêchées à la bolinche en Bretagne":"Rich in sardine fillets (62%), ring-net caught in Brittany",
"Riches en chair de Dorade (35%) issue de la Pêche Bretonne":"Rich in sea bream (35%) from Breton fisheries",
# Boissons
"Champagne la Maison Fricot":"Champagne Maison Fricot","Pétillant Saumur":"Saumur sparkling wine","Côte du Rhône":"Côtes du Rhône","Côtes-du-Rhône":"Côtes du Rhône",
"Rosé":"Rosé","La Blonde 5,5°":"Blonde beer 5.5°","La IPA 6°":"IPA 6°","Liqueur de Citron ou de Menthe":"Lemon or mint liqueur",
"Gin, Rhum, Esprit Malt":"Gin, rum, malt spirit","Jus de Pomme breton":"Breton apple juice","Breizh Cola / Cola Zero":"Breizh Cola / Cola zero",
"Ginger Beer":"Ginger beer",
"Bières & cidres":"Beers & ciders","Cidre Nicol pression":"Nicol draught cider","Royal Guillevic, Label Rouge":"Royal Guillevic cider, Label Rouge",
"Shot":"Shot","Shot premium":"Premium shot","Maquereau fumé au bois de hêtre":"Beech-smoked mackerel","Gin tonic, Moscow mule":"Gin & tonic, Moscow mule",
"60 % de filets de maquereau, fumés au bois de hêtre sur l'île de Groix":"60% mackerel fillets, smoked over beech wood on Groix island","Mojito, Moscow mule":"Mojito, Moscow mule",
"Saucisson de jambon, andouille bretonne, filet mignon fumée. Supplément fromage +4 €":"Ham sausage, Breton andouille, smoked pork fillet. Extra cheese +€4","Coca-Cola, Thé Oolong, Coca Zéro, Perrier":"Coca-Cola, oolong tea, Coke Zero, Perrier",
}
import json, os, unicodedata
def norm(s): return ' '.join(s.replace('’',"'").replace('“','"').replace('”','"').replace(' ',' ').split()).lower()
out = {norm(k): v for k, v in EN.items()}
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'drevici-preview', 'index.html')
h = open(p).read(); A, B = '/*I18N_EN*/', '/*/I18N_EN*/'
i, j = h.index(A), h.index(B)
h = h[:i + len(A)] + 'const I18N_EN=' + json.dumps(out, ensure_ascii=False) + ';' + h[j:]
open(p, 'w').write(h)
print(len(out), 'traductions dans', p)
