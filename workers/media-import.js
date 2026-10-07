// Import des médias Drevici vers R2 (bucket beltab-media, servi par media.beltab.app).
//
// À usage ponctuel : va chercher les 41 images et vidéos encore hébergées sur les
// WordPress, convertit les images en WebP (Cloudflare Images, redimensionnement à
// la volée), et les range dans R2 sous les noms de la « Nomenclature des médias ».
// Écrit aussi drevici/_rapatriement.json : la table ancienne adresse → nouvelle
// adresse, que le bouton « Rapatrier les images » du panneau admin relit.
//
//   GET  /            page de suivi, avec le bouton « Tout importer »
//   POST /one?i=N     importe le fichier N (saute s'il existe déjà, sauf &force=1)
//   POST /map         écrit la table de rapatriement dans R2
//
// Sans risque à relancer : un fichier déjà présent n'est pas re-téléchargé.
// Une fois l'import terminé, ce Worker peut être supprimé.

import MAP from './media-import.drevici.json';

const PUBLIC = 'https://media.beltab.app/';
const CACHE = 'public, max-age=604800';

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!env.MEDIA) return txt('Bucket R2 non branché (binding MEDIA manquant).', 500);

    if (req.method === 'GET' && url.pathname === '/') return page(env);
    if (req.method === 'GET' && url.pathname === '/status') return json(await status(env));

    if (req.method === 'POST' && url.pathname === '/one') {
      const i = Number(url.searchParams.get('i'));
      const it = MAP.items[i];
      if (!it) return json({ ok: false, error: 'index inconnu' }, 400);
      try { return json(await importOne(env, it, url.searchParams.get('force') === '1')); }
      catch (e) { return json({ ok: false, to: it.to, error: String(e && e.message || e) }, 500); }
    }

    if (req.method === 'POST' && url.pathname === '/map') {
      const map = {};
      for (const it of MAP.items) map[it.from] = PUBLIC + it.to;
      await env.MEDIA.put(MAP.client + '/_rapatriement.json', JSON.stringify({ client: MAP.client, created: new Date().toISOString(), map }, null, 1), {
        httpMetadata: { contentType: 'application/json; charset=utf-8', cacheControl: 'no-cache' },
      });
      return json({ ok: true, url: PUBLIC + MAP.client + '/_rapatriement.json', count: MAP.items.length });
    }

    return txt('Introuvable', 404);
  },
};

async function status(env) {
  const out = [];
  for (const it of MAP.items) {
    const h = await env.MEDIA.head(it.to);
    out.push({ to: it.to, present: !!h, size: h ? h.size : 0 });
  }
  return out;
}

async function importOne(env, it, force) {
  if (!force) {
    const h = await env.MEDIA.head(it.to);
    if (h) return { ok: true, to: it.to, skipped: true, size: h.size };
  }

  let res, type;
  if (it.kind === 'image') {
    // Conversion WebP par Cloudflare Images. Exige, sur la zone beltab.app :
    // Images → Transformations → activé + « Resize images from any origin ».
    res = await fetch(it.src, { cf: { image: { format: 'webp', width: it.width, quality: 80, fit: 'scale-down' } } });
    type = res.headers.get('content-type') || '';
    if (res.ok && !type.includes('webp')) {
      throw new Error('Conversion WebP non appliquée (reçu ' + type + '). Activer Images → Transformations sur beltab.app, avec « Resize images from any origin ».');
    }
    type = 'image/webp';
  } else {
    res = await fetch(it.src);
    type = it.kind === 'video' ? 'video/mp4' : (res.headers.get('content-type') || 'application/octet-stream');
  }
  if (!res.ok) throw new Error('Source injoignable : HTTP ' + res.status + ' — ' + it.src);

  const meta = { httpMetadata: { contentType: type, cacheControl: CACHE }, customMetadata: { source: it.from } };
  let obj;
  try {
    obj = await env.MEDIA.put(it.to, res.body, meta);   // flux direct (vidéos lourdes)
  } catch (e) {
    const again = await fetch(it.kind === 'image'
      ? new Request(it.src, { cf: { image: { format: 'webp', width: it.width, quality: 80, fit: 'scale-down' } } })
      : it.src);
    obj = await env.MEDIA.put(it.to, await again.arrayBuffer(), meta);
  }
  return { ok: true, to: it.to, size: obj ? obj.size : 0 };
}

function page() {
  const rows = MAP.items.map((it, i) => `<tr id="r${i}"><td>${i + 1}</td><td><code>${it.to}</code></td><td class="src">${it.from.split('/').pop()}</td><td class="st">…</td></tr>`).join('');
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Import médias · ${MAP.client}</title>
<style>
body{margin:0;font-family:Inter,system-ui,sans-serif;background:#0a1a40;color:#fff}
.w{max-width:900px;margin:0 auto;padding:20px 16px 60px}
h1{font-size:24px;margin:0 0 4px}p{color:#aab6d3;margin:0 0 16px;font-size:14px}
button{font:700 15px Inter,system-ui;border:0;border-radius:999px;padding:13px 20px;background:#d09d39;color:#0a1a40;cursor:pointer}
button.s{background:rgba(255,255,255,.1);color:#fff}
.bar{height:8px;background:rgba(255,255,255,.1);border-radius:9px;margin:16px 0;overflow:hidden}.bar i{display:block;height:100%;width:0;background:#7fd89c;transition:width .2s}
table{width:100%;border-collapse:collapse;font-size:13px}td{padding:8px 6px;border-bottom:1px solid rgba(255,255,255,.08);vertical-align:top}
code{font-size:12px}.src{color:#8e9bbd;word-break:break-all}.st{white-space:nowrap;text-align:right}
.ok{color:#7fd89c}.sk{color:#aab6d3}.ko{color:#f19a9a}#msg{margin-top:12px;font-size:14px}
</style></head><body><div class="w">
<h1>Import des médias · ${MAP.client}</h1>
<p>${MAP.items.length} fichiers vers <code>media.beltab.app/${MAP.client}/</code>. Les fichiers déjà présents sont sautés.</p>
<button id="go">Tout importer</button> <button class="s" id="ref">Actualiser l'état</button>
<div class="bar"><i id="pb"></i></div><div id="msg"></div>
<table><tbody>${rows}</tbody></table></div>
<script>
const N=${MAP.items.length};
const st=(i,h,c)=>{const e=document.querySelector('#r'+i+' .st');e.innerHTML=h;e.className='st '+(c||'')};
const kb=n=>n>1048576?(n/1048576).toFixed(1)+' Mo':Math.round(n/1024)+' Ko';
async function refresh(){const s=await (await fetch('/status')).json();let n=0;s.forEach((x,i)=>{if(x.present){n++;st(i,'présent · '+kb(x.size),'ok')}else st(i,'à importer','sk')});document.getElementById('pb').style.width=(n/N*100)+'%';return n}
document.getElementById('ref').onclick=refresh;
document.getElementById('go').onclick=async()=>{
  const b=document.getElementById('go');b.disabled=true;b.textContent='Import en cours…';let done=0,err=0;
  for(let i=0;i<N;i++){st(i,'…');
    try{const r=await (await fetch('/one?i='+i,{method:'POST'})).json();
      if(r.ok){done++;st(i,(r.skipped?'déjà là':'importé')+' · '+kb(r.size),'ok')}else{err++;st(i,r.error,'ko')}}
    catch(e){err++;st(i,String(e),'ko')}
    document.getElementById('pb').style.width=((i+1)/N*100)+'%';}
  const m=await (await fetch('/map',{method:'POST'})).json();
  document.getElementById('msg').innerHTML=(err?'<span class="ko">'+err+' erreur(s), relancez « Tout importer » après correction.</span><br>':'<span class="ok">Terminé : '+done+' fichiers dans R2.</span><br>')+'Table de rapatriement : <a style="color:#d09d39" href="'+m.url+'" target="_blank">'+m.url+'</a>';
  b.disabled=false;b.textContent='Tout importer';
};
refresh();
</script></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
const txt = (t, s = 200) => new Response(t, { status: s, headers: { 'content-type': 'text/plain; charset=utf-8' } });
