// Contrôle avant publication : capture le site EN LIGNE et la PREVIEW, écran par écran,
// sur téléphone et ordinateur, et relève les erreurs JavaScript. Les captures et un
// fichier resultats.json sont écrits dans le dossier donné en argument.
//   node outils/controle/capture.js <dossier-sortie>
const {chromium,devices}=require('playwright');const fs=require('fs');const path=require('path');
const OUT=process.argv[2]||'controle-out'; fs.mkdirSync(OUT,{recursive:true});
// Par défaut on compare les FICHIERS du dépôt (drevici/ = en ligne, drevici-preview/ = preview),
// servis en local : c'est exactement ce qui partira à la publication, et ça ne dépend pas du réseau.
// CONTROLE_WEB=1 compare les vrais sites.
const LOCAL=process.env.CONTROLE_BASE||'http://localhost:8793/';
const SITES=process.env.CONTROLE_WEB?{enligne:'https://drevici.beltab.app/',preview:'https://drevici-preview.beltab.app/paris/'}:{enligne:LOCAL+'drevici/',preview:LOCAL+'drevici-preview/'};
const VUES={telephone:{...devices['iPhone 13'],deviceScaleFactor:1},ordinateur:{viewport:{width:1400,height:900},deviceScaleFactor:1}};
// Fige ce qui bouge (vidéos, animations, curseur) pour comparer des images stables.
const FIGE=`*,*:before,*:after{animation:none!important;transition:none!important;caret-color:transparent!important}video{visibility:hidden!important}`;
(async()=>{
  const b=await chromium.launch(); const res={ecrans:[],erreurs:{}};
  for(const [site,url] of Object.entries(SITES)){
    for(const [vue,opt] of Object.entries(VUES)){
      const c=await b.newContext(opt);
      // Hasard figé (messages tirés au sort, etc.) : même tirage en ligne et en preview.
      await c.addInitScript(()=>{ let x=42; Math.random=()=>((x=(x*16807)%2147483647)/2147483647); });
      const p=await c.newPage(); const errs=[];
      // La préview affiche par défaut les données de l'admin préview : pour comparer, on lui donne les mêmes données que le site en ligne.
      const DQ=site==='preview'?'&donnees=prod':'';
      // Chargement tolérant aux coupures réseau : 3 essais.
      const go=async(u)=>{ for(let k=0;k<3;k++){ try{ await p.goto(u,{waitUntil:'domcontentloaded',timeout:60000}); await p.waitForTimeout(1500); return; }catch(e){ if(k===2) throw e; await p.waitForTimeout(2000); } } };
      p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text().slice(0,200)); });
      const shot=async(nom)=>{ await p.addStyleTag({content:FIGE}).catch(()=>{});
        // Images « lazy » : forcées à charger, sinon la capture pleine page montre des cases vides.
        await p.evaluate(async()=>{ document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager');
          await Promise.all([...document.images].filter(i=>!i.complete).map(i=>new Promise(r=>{i.onload=i.onerror=r; setTimeout(r,4000);}))); });
        await p.waitForTimeout(500);
        const f=`${vue}__${nom}__${site}.png`; await p.screenshot({path:path.join(OUT,f),fullPage:true}); res.ecrans.push({vue,nom,site,f}); };
      await go(url+'?ctrl='+Date.now()+DQ); await p.waitForTimeout(3500);
      await shot('01-accueil');
      await go(url+'?ctrl='+Date.now()+DQ+'#menu'); await p.waitForTimeout(3500);
      const tabs=await p.evaluate(()=>(DATA.tabs||[]).filter(t=>t.visible!==false).map(t=>t.id));
      for(let i=0;i<tabs.length;i++){
        // Page rechargée pour chaque catégorie : aucun état (fiche ouverte…) ne déborde sur la suivante.
        await go(url+'?ctrl='+Date.now()+DQ+'#menu'); await p.waitForTimeout(2500);
        await p.evaluate(id=>{ if(typeof goToTab==='function') goToTab(id); },tabs[i]); await p.waitForTimeout(900);
        await p.evaluate(()=>scrollTo(0,0));
        await shot(`02-menu-${String(i+1).padStart(2,'0')}-${tabs[i]}`);
        { // fiche plat : téléphone (fiche plein écran) et ordinateur (fenêtre avec vignettes)
          const ok=await p.evaluate(id=>{ const el=document.querySelector('#tab-'+id+' [data-lbidx]'); if(!el) return false; el.click(); return true; },tabs[i]);
          if(ok){ await p.waitForTimeout(1000); await shot(`03-fiche-${String(i+1).padStart(2,'0')}-${tabs[i]}`);
          }
        }
      }
      if(vue==='telephone'){ await go(url+'?ctrl='+Date.now()+DQ+'#menu'); await p.waitForTimeout(2500); await p.evaluate(()=>{ if(typeof qmOpen==='function') qmOpen(); }); await p.waitForTimeout(800); await shot('04-menu-rapide'); }
      res.erreurs[`${site}/${vue}`]=[...new Set(errs)];
      await c.close();
    }
  }
  fs.writeFileSync(path.join(OUT,'resultats.json'),JSON.stringify(res,null,1)); await b.close();
})();
