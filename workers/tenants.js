// ════════════════════════════════════════════════════════════════
// Restaurants servis par le socle commun Beltab (Worker beltab-sites).
// Une entrée par restaurant. Le Worker reconnaît le restaurant par l'adresse du site
// (hosts) et donne sa configuration à la page (window.BELTAB).
//
// Ce qui est ICI : identité, formule, interrupteurs, SEO. Rien de secret.
// Ce qui n'est PAS ici : la carte, les photos, les clients, les réservations
// → dans la base, rangés par slug, protégés par restaurant_admins.
//
// Ajouter un restaurant : python3 tools/nouveau-client.py (écrit l'entrée + le SQL).
// ════════════════════════════════════════════════════════════════

// Fonctions incluses par formule (voir guide/tarif.md et le comparateur du guide).
// Chaque formule comprend la précédente. Une fonction absente vaut « oui » : seules les valeurs
// false coupent quelque chose. Mode d'emploi pour Will : HQ → Outils → « Qui a accès à quoi ».
//   formules      Mes menus : menu du jour, menus spéciaux, formules          Pro
//   print         Impression du menu en PDF                                    Pro
//   tables        Salle et tables (admin) + choix de l'espace à la réservation Pro
//   floorplan     Plan de salle visuel                                         Master
//   stats         Statistiques (réservations et site)                          Master
//   tableBoost    Table Boost                                                   Master
//   campaigns     Emails et SMS aux clients                                    Master
//   socialPublish Publication sur les réseaux                                  Master
//   studio        Studio (mode agence, offre La Cabine)                        option
//   club          Club de fidélité : mode agence seulement, fait sur mesure (modèle Drevici)
export const OFFERS = {
  starter: { formules: false, print: false, tables: false, floorplan: false, stats: false, tableBoost: false, campaigns: false, socialPublish: false, studio: false, club: false },
  pro:     { formules: true,  print: true,  tables: true,  floorplan: false, stats: false, tableBoost: false, campaigns: false, socialPublish: false, studio: false, club: false },
  master:  { formules: true,  print: true,  tables: true,  floorplan: true,  stats: true,  tableBoost: true,  campaigns: true,  socialPublish: true,  studio: false, club: false }
};

export const TENANTS = {
  soyonne: {
    hosts: ['soyonne.beltab.app'],
    slug: 'soyonne',            // carte (menu_data)
    resaSlug: 'soyonne',        // réservations, clients, réglages emails (un seul lieu → même slug)
    name: 'Chez Soyonne',
    phone: '09 60 51 60 42',
    email: 'yubestory@gmail.com',
    groupMax: 10,
    offer: 'master',
    // Démo de prospection : invisible sur Google, emails du resto vers Will (voir resa_settings).
    demo: true,
    features: {},               // ajustements par rapport à la formule (ex. { club: true })
    hashtags: '#chezsoyonne #cuisinecoreenne #paris10 #dopbap #kfood',
    seo: {
      name: 'Chez Soyonne',
      title: 'Chez Soyonne · Cuisine coréenne maison · Paris 10e',
      description: 'Dopbap, bols de riz coréens faits maison avec des produits frais. Planches à partager le week-end, kimbap, ateliers cuisine. 9 rue de Lancry, Paris 10e.',
      about: "Chez Soyonne (소연이네), c'est la cuisine coréenne de Soyoun, comme à la maison, au 9 rue de Lancry, près de République (Paris 10e). Sa spécialité : le dopbap, un bol de riz garni de viande, de poisson ou de légumes, un plat complet et très populaire en Corée. Le midi, dopbap, raviolis et menus ; le vendredi et le samedi soir, des planches coréennes à partager avec soju, bière coréenne ou makgeolli. Kimbap sur commande la veille, ateliers de cuisine coréenne le dimanche matin. Options végétariennes, sur place ou à emporter.",
      services: ['Sur place et à emporter', 'Réservation en ligne', 'Planches à partager le vendredi et le samedi soir', 'Kimbap sur commande la veille', 'Ateliers de cuisine coréenne le dimanche', 'Traiteur et événements privés'],
      schemaType: ['Restaurant'],
      cuisine: ['Coréenne'],
      priceRange: '12 € – 30 €',
      image: '/clients/soyonne/og-carte.jpg',
      imageWidth: '1200',
      imageHeight: '630',
      imageAlt: 'Planche coréenne de Chez Soyonne : jeon, porc, poulet et aubergines'
    }
  }
};

// Restaurant correspondant à une adresse (ou null).
export function tenantFor(host) {
  host = String(host || '').toLowerCase().replace(/:\d+$/, '');
  for (const [key, t] of Object.entries(TENANTS)) {
    if ((t.hosts || []).includes(host)) return { key, ...t };
  }
  return null;
}

export function tenantByKey(key) {
  return TENANTS[key] ? { key, ...TENANTS[key] } : null;
}

// Configuration publique donnée à la page (jamais de secret ici).
// trial : formule d'essai (démo seulement, choisie avec ?formule=…) ; les réglages propres au
// restaurant (features) ne s'appliquent pas pendant un essai, pour voir la formule telle quelle.
export function publicConfig(t, trial) {
  const offer = trial || t.offer;
  const features = Object.assign({}, OFFERS[offer] || {}, trial ? {} : (t.features || {}));
  return {
    key: t.key, slug: t.slug, resaSlug: t.resaSlug || t.slug, name: t.name,
    phone: t.phone || '', email: t.email || '', groupMax: t.groupMax || 10,
    offer, realOffer: t.offer, trial: !!trial, demo: !!t.demo, preview: false, features, hashtags: t.hashtags || ''
  };
}
