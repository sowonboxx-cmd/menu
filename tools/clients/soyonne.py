"""Contenu de démo de Chez Soyonne (소연이네) — rempli comme un Master.

Sources (13/10/2026) : menu midi et soir, affiche du soir et affiche kimbap de son site
(chez-soyonne.eatbu.com), fiche Google (horaires, téléphone), visuels et DA faits par Will.
À faire confirmer par la restauratrice : « pour 2 personnes » sur la planche, prix de l'atelier.

Utilisé par tools/nouveau-client.py, qui en tire le SQL (ligne menu_data).
"""

IMG = '/clients/soyonne/'
_n = 0


def pid():
    global _n
    _n += 1
    return f'd_soy{_n:04d}'


def dish(fr, en='', kr='', desc='', price='', img='', gallery=None, spicy=False, vegetarian=False, **extra):
    d = {'_pid': pid(), 'name': {'fr': fr, 'en': en, 'kr': kr}, 'desc': {'fr': desc}, 'price': price,
         'img': (IMG + img) if img else '', 'gallery': [IMG + g for g in (gallery or [])], 'caption': '',
         'spicy': spicy, 'vegetarian': vegetarian}
    d.update(extra)
    return d


def dual(fr, q1, p1, q2, p2, **kw):
    return dish(fr, price=f'Les {q1} — {p1}€ · Les {q2} — {p2}€', priceType='dual', qty1=q1, p1=p1, qty2=q2, p2=p2, **kw)


def bev(fr, price, desc=''):
    return {'name': {'fr': fr}, 'desc': {'fr': desc}, 'price': price, 'img': '', 'caption': '', 'gallery': []}


TABS = [
    {'id': 'dopbap', 'label': {'fr': 'Dopbap', 'en': 'Rice bowls', 'kr': '덮밥'}, 'cards': [
        {'label': {'fr': 'Au curry', 'en': 'Curry', 'kr': '카레'}, 'dishes': [
            dish('Riz au curry', 'Curry rice', '카레덮밥', 'Riz, sauce curry, pomme de terre, carotte, courgette, oignon, œuf', '12€', 'bol-curry.webp', vegetarian=True),
            dish('Riz au curry et tofu frit', 'Curry rice with fried tofu', '두부튀김카레덮밥', 'Riz, sauce curry, tofu frit, pomme de terre, carotte, courgette, oignon, petits pois', '13€', vegetarian=True),
            dish('Riz au curry et crevettes frites', 'Curry rice with fried shrimp', '새우튀김카레덮밥', 'Riz, sauce curry, crevettes frites, pomme de terre, carotte, courgette, oignon, petits pois', '13€'),
            dish('Riz au curry et poulet ou poulet frit', 'Curry rice with chicken or fried chicken', '닭카레덮밥', 'Riz, poulet grillé ou frit, sauce curry, pomme de terre, carotte, oignon, petits pois, courgette', '16€'),
        ]},
        {'label': {'fr': 'Sautés', 'en': 'Stir-fried', 'kr': '볶음'}, 'dishes': [
            dish('Riz au porc pimenté', 'Spicy pork rice', '제육덮밥', 'Riz, porc, sauce soja, sauce piment, poudre de piment, ail, poivre, oignon, petits pois, graines de sésame', '14€', 'bol-porc.webp', spicy=True),
            dish('Riz au poulet à la sauce soja', 'Soy sauce chicken rice', '닭구이덮밥', 'Riz, poulet, sauce soja, ail, chou blanc, courgette, oignon, petits pois, graines de sésame', '14€'),
            dish('Riz au poulet frit', 'Korean fried chicken rice', '닭강정덮밥', 'Sauce au choix : soja, ou aigre-douce et épicée. Riz, poulet frit, haricots verts, farine de blé, ail, sauce soja, origan, petits pois', '15€', 'bol-poulet-frit.webp'),
            dish('Riz au bœuf à la sauce soja', 'Beef bulgogi rice', '소불고기덮밥', 'Riz, bœuf, sauce soja, ail, poivre, carotte, oignon, petits pois, graines de sésame', '16€', 'bol-boeuf.webp'),
            dish('Riz au saumon à la sauce soja', 'Soy-glazed salmon rice', '연어구이덮밥', 'Riz, saumon, sauce soja, haricots verts, oignon, petits pois, courgette, chou blanc, graines de sésame', '16€', 'bol-saumon.webp'),
        ]},
    ]},
    {'id': 'menus', 'label': {'fr': 'Menus', 'en': 'Set menus', 'kr': '세트'}, 'cards': [
        {'label': {'fr': 'Midi et soir', 'en': 'Lunch and dinner'}, 'dishes': [
            dish('Menu Dopbap', 'Dopbap set', '덮밥 세트', '3 raviolis au poulet · riz au curry (supplément si un autre dopbap est choisi) · dessert au choix', '19€', 'bol-curry.webp'),
            dish('Menu Poulet', 'Chicken set', '치킨 세트', 'Riz · salade de saison · 2 raviolis au poulet · 1 brochette poulet et poireaux · poulet frit à la sauce soja ou épicé', '17€', 'bol-poulet-frit.webp'),
        ]},
    ]},
    {'id': 'entrees', 'label': {'fr': 'Entrées', 'en': 'Starters', 'kr': '애피타이저'}, 'cards': [
        {'label': {'fr': ''}, 'dishes': [
            dual('Raviolis poulet et légumes', '3', '5', '4', '6', en='Chicken & vegetable dumplings', kr='닭고기 만두'),
            dual('Raviolis légumes', '3', '5', '4', '6', en='Vegetable dumplings', kr='야채 만두', vegetarian=True),
            dish('Poulet frit', 'Korean fried chicken', '치킨', '4 à 5 morceaux', '5€'),
            dish('Crevettes frites', 'Fried shrimp', '새우튀김', '2 pièces', '5€'),
            dish('Beignets de légumes', 'Vegetable fritters', '야채튀김', '4 pièces', '5€', vegetarian=True),
        ]},
    ]},
    {'id': 'soir', 'label': {'fr': 'Le soir', 'en': 'Evenings', 'kr': '저녁'}, 'cards': [
        {'label': {'fr': 'Vendredi et samedi soir · 18 h 30 – 22 h 30', 'en': 'Friday and Saturday nights'}, 'dishes': [
            dish('Planche coréenne à partager', 'Korean sharing board', '모둠안주',
                 "Le vendredi et le samedi soir. Galettes de courgette, de poisson et de crevettes, ailes de poulet frites à la sauce soja, poitrine de porc grillée, aubergine frite. "
                 "Pour 2 personnes, avec 2 boissons au choix : 2 soju yuzu cocktail, 2 bières coréennes, ou un soju, ou un makgeolli. Sur réservation.",
                 '56€', 'plat-planche.webp', gallery=['planche.webp', 'planche-v.webp']),
        ]},
    ]},
    {'id': 'kimbap', 'label': {'fr': 'Kimbap', 'en': 'Kimbap', 'kr': '김밥'}, 'cards': [
        {'label': {'fr': 'Sur commande la veille, à emporter le lendemain', 'en': 'Order the day before'}, 'dishes': [
            dish('Kimbap aux légumes', 'Vegetable kimbap', '야채김밥', 'Rouleau de riz et algue, légumes', '9€', vegetarian=True),
            dish('Kimbap au thon', 'Tuna kimbap', '참치김밥', 'Rouleau de riz et algue, thon, légumes', '11€'),
            dish('Kimbap au bœuf', 'Beef kimbap', '불고기김밥', 'Rouleau de riz et algue, bœuf, légumes', '12€'),
            dish('Kimbap au bœuf et poulet frit', 'Beef kimbap with fried chicken', '불고기김밥 + 치킨', 'Un kimbap au bœuf et une portion de poulet frit', '15€'),
        ]},
    ]},
    {'id': 'desserts', 'label': {'fr': 'Desserts', 'en': 'Desserts', 'kr': '디저트'}, 'cards': [
        {'label': {'fr': ''}, 'dishes': [
            dish('Cheesecake au yuzu', 'Yuzu cheesecake', '유자 치즈케이크', '', '4€', vegetarian=True),
            dish('Cheesecake au thé vert', 'Green tea cheesecake', '녹차 치즈케이크', '', '4€', vegetarian=True),
            dish('Cheesecake au sésame noir', 'Black sesame cheesecake', '흑임자 치즈케이크', '', '4€', vegetarian=True),
            dish('Fondant au chocolat', 'Chocolate fondant', '초콜릿 퐁당', '', '4€', vegetarian=True),
        ]},
    ]},
    {'id': 'boissons', 'label': {'fr': 'Boissons', 'en': 'Drinks', 'kr': '음료'}, 'cards': [
        {'type': 'bevs', 'label': {'fr': 'Sans alcool'}, 'items': [
            bev('Café', '2€'), bev('Café glacé', '3€'),
            bev('Coca, Perrier, Lipton Ice Tea, Schweppes', '3€'),
            bev('Le goût du raisin · Raisin et gelée de coco', '3€'),
            bev('Thé vert et riz complet · Thé vert et menthe', '3€'),
            bev('Gingembre, miel, citron', '3€', 'Glacé : +1 €'),
            bev('Thé au yuzu', '4€', 'Glacé : +1 €'),
            bev('Limonade au yuzu', '5€'),
        ]},
        {'type': 'bevs', 'label': {'fr': 'Alcools coréens'}, 'items': [
            bev('Bière coréenne', '5€'), bev('Soju yuzu cocktail', '7€'),
            bev('Soju citron', '13€'), bev('Soju 16 %', '13€'), bev('Soju 20 %', '14€'),
            bev('Makgeolli', '13€'), bev('Prosecco', '19€'),
        ]},
    ]},
    {'id': 'atelier', 'label': {'fr': 'Atelier cuisine', 'en': 'Cooking class', 'kr': '쿠킹 클래스'}, 'cards': [
        {'label': {'fr': 'Le dimanche de 11 h à 13 h', 'en': 'Sundays, 11 am – 1 pm'}, 'dishes': [
            dish('Atelier de cuisine coréenne', 'Korean cooking class', '한식 쿠킹 클래스',
                 "Cuisinez avec Soyoun au restaurant : ingrédients fournis, cours pratique, dégustation et recettes à emporter. "
                 "En famille ou entre amis, une autre date est possible sur demande.", '', 'illu-portrait.webp'),
        ]},
    ]},
]
TABS[0]['isHome'] = True
for t in TABS:
    t.setdefault('isHome', False)
    t['visible'] = True


def _pid_of(name):
    for t in TABS:
        for c in t['cards']:
            for d in c.get('dishes', []):
                if d['name']['fr'] == name:
                    return {'tabId': t['id'], 'pid': d['_pid'], 'name': name}
    raise KeyError(name)


DATA = {
    'restaurantName': 'Chez Soyonne',
    'restaurantLogo': IMG + 'logo-bandeau.png',
    'favicon': IMG + 'favicon.png',
    'showHeaderLogo': True,
    'headerStyle': 'band',
    'defaultView': 'grid',
    'restoFont': 'Fraunces',
    'showCurrency': False,
    'brandColors': {'primary': '#C5106D', 'accent': '#2CB289', 'bg': '#FBF3E8', 'subtitle': '#FFFFFF', 'tabInactive': '#FFFFFF'},
    'heroActive': True,
    'hero': {'fr': 'Dopbap · planches · kimbap'},
    # Présentation (« à propos ») : modifiable dans /admin → Mon site → Présentation.
    'intro': {'active': True, 'text': {'fr': "Le dopbap est un plat coréen composé d'un bol de riz accompagné de garnitures variées, "
                                             "comme de la viande, du poisson ou des légumes sautés. C'est un plat complet, savoureux et très populaire en Corée."}},
    'address': {'street': '9 rue de Lancry', 'zip': '75010', 'city': 'Paris', 'phone': '0960516042',
                'mapsUrl': 'https://maps.app.goo.gl/3YWhD8KXyNHrYp6k7'},
    'social': {'instagram': 'chez_soyonne', 'facebook': '', 'tiktok': '', 'website': ''},
    'homeTab': {'active': False, 'photo': '', 'video': ''},
    'homeCover': {
        'active': True, 'mediaType': 'photo', 'mediaChoice': 'photo',
        'image': IMG + 'planche.webp', 'mobileImage': IMG + 'planche-v.webp', 'mobilePos': 50, 'dim': 28,
        'video': '', 'slideshow': [], 'logo': '',
        'headline': 'Cuisine coréenne\ncomme à la maison', 'headlineFont': 'Fraunces',
        'cta1Label': 'VOIR LE MENU', 'cta1Url': '', 'cta2Label': 'RÉSERVER', 'cta2Url': 'book',
        'statusBarColor': '#C5106D'
    },
    'schedule': [
        {'day': 'Lundi', 'services': [{'label': 'Midi', 'open': 11.5, 'close': 15.5}]},
        {'day': 'Mardi', 'services': [{'label': 'Midi', 'open': 11.5, 'close': 15.5}]},
        {'day': 'Mercredi', 'services': [{'label': 'Midi', 'open': 11.5, 'close': 15.5}]},
        {'day': 'Jeudi', 'services': [{'label': 'Midi', 'open': 11.5, 'close': 15.5}]},
        {'day': 'Vendredi', 'services': [{'label': 'Midi', 'open': 11.5, 'close': 16}, {'label': 'Soir', 'open': 18, 'close': 22.5}]},
        {'day': 'Samedi', 'services': [{'label': 'Midi', 'open': 11.5, 'close': 16}, {'label': 'Soir', 'open': 18, 'close': 21.5}]},
        {'day': 'Dimanche', 'services': []},
    ],
    'specials': [{'id': 'jour', 'active': False, 'label': {'fr': 'Menu du jour'}, 'title': {'fr': 'Menu du jour'},
                  'desc': {'fr': ''}, 'price': '', 'showHome': False, 'showFirst': False}],
    # Bandeau « infos » : pas modifiable dans /admin → éteint (règle : ne remplir que des champs que le resto peut changer).
    'infoBanner': {'active': False, 'label': {'fr': ''}, 'title': {'fr': ''}, 'desc': {'fr': ''}, 'showHome': False, 'showFirst': False},
    'pinnedShowHome': False, 'pinnedShowFirst': False, 'pinnedShowRail': True,
    'corpoTemplates': [], 'formules': [], 'icones': {'main': '', 'secondary': ''},
    'pdfStyle': {'bgColor': '#FFFDF8', 'titleColor': '#C5106D', 'accentColor': '#2CB289', 'showLogo': True,
                 'logoSize': 'grand', 'showFrame': True, 'paperSize': 'a5', 'showCurrency': True, 'instaFont': 'Fraunces'},
    'tabs': TABS,
}
DATA['pinnedDishes'] = [_pid_of(n) for n in ['Planche coréenne à partager', 'Riz au bœuf à la sauce soja',
                                             'Riz au poulet frit', 'Riz au curry', 'Riz au porc pimenté']]

# Réservations : un espace, des tables simples (à remplacer par le vrai plan de salle).
RESA = {
    'restaurant_name': 'Chez Soyonne',
    'address': '9 rue de Lancry, 75010 Paris',
    'phone': '09 60 51 60 42',
    'reply_to': 'yubestory@gmail.com',
    # Espaces et tables, repris du document du restaurant. Plusieurs espaces possibles :
    #   'spaces': [{'name': 'Salle', 'tables': [('T1', 2)]}, {'name': 'Terrasse', 'tables': [('E1', 4)]}]
    'spaces': [{'name': 'Salle'}],
    # (nom, places) : tables du premier espace
    'tables': [('T1', 2), ('T2', 2), ('T3', 2), ('T4', 4), ('T5', 4), ('T6', 6)],
    # services : (nom, début, fin). Les jours d'ouverture viennent des horaires de la carte.
    'services': [('Midi', '11:30', '15:30'), ('Soir', '18:30', '22:30')],
}
