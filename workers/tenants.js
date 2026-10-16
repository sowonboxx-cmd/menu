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

// Fonctions incluses par formule (voir guide/tarif.md). Chaque formule comprend la précédente.
// Une fonction absente vaut « oui » : seules les valeurs false coupent quelque chose.
export const OFFERS = {
  starter: { formules: false, campaigns: false, tableBoost: false, floorplan: false, socialPublish: false, club: false },
  pro:     { formules: true,  campaigns: false, tableBoost: false, floorplan: false, socialPublish: false, club: false },
  master:  { formules: true,  campaigns: true,  tableBoost: true,  floorplan: true,  socialPublish: true,  club: false }
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
export function publicConfig(t) {
  const features = Object.assign({}, OFFERS[t.offer] || {}, t.features || {});
  return {
    key: t.key, slug: t.slug, resaSlug: t.resaSlug || t.slug, name: t.name,
    phone: t.phone || '', email: t.email || '', groupMax: t.groupMax || 10,
    offer: t.offer, demo: !!t.demo, preview: false, features, hashtags: t.hashtags || ''
  };
}
