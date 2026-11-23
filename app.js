// Ventre Léger — code de l'app (chargé par index.html, sans script inline pour permettre une CSP stricte).
'use strict';
/* ---------- Outils ---------- */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const pad=n=>String(n).padStart(2,'0');
const dayKey=d=>{d=new Date(d);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const hm=d=>{d=new Date(d);return pad(d.getHours())+':'+pad(d.getMinutes())};
const toLocalInput=ts=>dayKey(ts)+'T'+hm(ts);
const fromLocalInput=v=>{const t=new Date(v).getTime();return isNaN(t)?null:t};
const noon=k=>new Date(k+'T12:00:00');
const addDays=(k,n)=>{const d=noon(k);d.setDate(d.getDate()+n);return dayKey(d)};
const daysBetween=(a,b)=>Math.round((noon(b)-noon(a))/864e5);
const startOfDay=k=>new Date(k+'T00:00:00').getTime();
const fmtLong=k=>noon(k).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
const fmtShort=k=>noon(k).toLocaleDateString('fr-FR',{day:'numeric',month:'long'});
const fmtNum=(n,d=1)=>n.toFixed(d).replace('.',',');
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const norm=s=>String(s).toLowerCase().replace(/[’`]/g,"'").replace(/\s+/g,' ').trim();
const fold=s=>norm(s).normalize('NFD').replace(/[̀-ͯ]/g,'');
function fmtDur(ms){const m=Math.floor(ms/6e4),h=Math.floor(m/60);return h?`${h} h ${pad(m%60)}`:`${m} min`}

/* ---------- Données de référence ---------- */
// Repères FODMAP indicatifs (1 bas, 2 modéré, 3 élevé) pour une portion habituelle.
const FOODS={
 'riz':1,'riz complet':1,'quinoa':1,"flocons d'avoine":1,'pommes de terre':1,'pomme de terre':1,'polenta':1,'pâtes sans gluten':1,'pain au levain':1,'pain sans gluten':1,'galette de riz':1,'sarrasin':1,'millet':1,
 'carottes':1,'carotte':1,'courgettes':1,'courgette':1,'concombre':1,'tomate':1,'tomates':1,'épinards':1,'haricots verts':1,'poivron rouge':1,'aubergine':1,'salade verte':1,'laitue':1,'mâche':1,'radis':1,'endives':1,'potiron':1,'panais':1,'navet':1,'blettes':1,'chou kale':1,'germes de soja':1,'olives':1,'gingembre':1,'ciboulette':1,'herbes fraîches':1,'sauce tomate':1,'soupe de carottes':1,
 'banane':1,'kiwi':1,'orange':1,'clémentine':1,'mandarine':1,'fraises':1,'myrtilles':1,'framboises':1,'raisin':1,'ananas':1,'melon':1,'citron':1,'papaye':1,'fruit de la passion':1,
 'œufs':1,'oeufs':1,'œuf':1,'poulet':1,'dinde':1,'bœuf':1,'boeuf':1,'porc':1,'jambon':1,'poisson':1,'saumon':1,'cabillaud':1,'thon':1,'crevettes':1,'tofu ferme':1,'tempeh':1,
 'comté':1,'parmesan':1,'emmental':1,'cheddar':1,'mozzarella':1,'feta':1,'brie':1,'camembert':1,'lait sans lactose':1,'yaourt sans lactose':1,'lait d\'amande':1,'lait de riz':1,'beurre':1,'huile d\'olive':1,
 'café':1,'thé':1,'thé vert':1,'eau':1,'chocolat noir':1,'sirop d\'érable':1,'sucre':1,'cacahuètes':1,'noix':1,'noix de pécan':1,'graines de courge':1,'graines de chia':1,'beurre de cacahuète':1,'moutarde':1,'sauce soja':1,
 'avocat':2,'patate douce':2,'brocoli':2,'amandes':2,'noisettes':2,'lentilles en conserve':2,'pois chiches en conserve':2,'maïs':2,'betterave':2,'chou blanc':2,'chou rouge':2,'céleri':2,'petits pois':2,'noix de coco':2,'pamplemousse':2,'quinoa soufflé':2,'chocolat au lait':2,'vin':2,'bière':2,
 'ail':3,'oignon':3,'oignons':3,'échalote':3,'poireau':3,'pomme':3,'pommes':3,'poire':3,'mangue':3,'pastèque':3,'cerises':3,'abricot':3,'pêche':3,'prune':3,'figues':3,'dattes':3,'fruits secs':3,'jus de pomme':3,
 'champignons':3,'chou-fleur':3,'asperges':3,'artichaut':3,'haricots rouges':3,'lentilles':3,'pois chiches':3,'fèves':3,
 'pain':3,'pain de blé':3,'baguette':3,'pâtes':3,'pâtes de blé':3,'couscous':3,'semoule':3,'pizza':3,'croissant':3,'biscuits':3,'gâteau':3,'céréales':3,
 'lait':3,'lait de vache':3,'yaourt':3,'fromage blanc':3,'fromage frais':3,'ricotta':3,'crème glacée':3,'lait de soja':3,
 'miel':3,"sirop d'agave":3,'noix de cajou':3,'pistaches':3,'chewing-gum':3,'bonbons sans sucre':3,'soda':3,'rhum':3
};
const STARTERS=['riz','poulet','courgettes','carottes','œufs','banane','pommes de terre','saumon',"flocons d'avoine",'kiwi','yaourt sans lactose','épinards'];
const LEVEL_TXT=['à préciser','bas','modéré','élevé'];
const MEAL_TYPES=[['petit-dej','Petit-déj'],['dejeuner','Déjeuner'],['collation','Collation'],['diner','Dîner']];
const mealLabel=k=>(MEAL_TYPES.find(t=>t[0]===k)||[,'Repas'])[1];
const SYM=[['bloating','Ballonnements'],['pain','Douleur'],['gas','Gaz'],['fatigue','Fatigue']];
const BRISTOL=[null,'Petites boules dures, séparées','Saucisse grumeleuse','Saucisse avec craquelures','Lisse et molle, comme un serpent','Morceaux mous, bords nets','Morceaux floconneux, bords irréguliers','Entièrement liquide'];
const bristolClass=b=>b<=2?'warn':b>=6?'bad':'ok';
const TREAT_SUGG=['Rifaximine','Néomycine','Métronidazole','Allicine','Huile d\'origan','Berbérine','Prucalopride','Érythromycine','Macrogol','Probiotique'];

const I={
 meal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="6.5"/><circle cx="12" cy="13" r="3"/><path d="M3 4v5a2 2 0 0 0 2 2M5 4v16M21 4c-1.5 0-2.5 2-2.5 5s1 3 2.5 3v8"/></svg>',
 sym:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-5 3 10 2.5-7 1.5 2H21"/></svg>',
 stool:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"/></svg>',
 pill:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="M9.2 8 14.8 16"/></svg>',
 home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
 list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8 8.5h8M8 12h8M8 15.5h5"/></svg>',
 chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v16h16"/><path d="m7 14 4-4 3 3 5-6"/></svg>',
 check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
 x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
 plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
 cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
 doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>'
};

/* ---------- Mascotte ---------- */
const POSES=['bras-ouverts','surprise','coucou','pouce','montre','reflechit','ravie','presente','victoire','coeur'];
const MS=n=>`mascotte/${n}.webp`;
const FLOWER=(()=>{let d='';for(let i=0;i<=120;i++){const t=i/120*Math.PI*2,r=.9+.1*Math.cos(6*t);d+=(i?'L':'M')+(100+90*r*Math.cos(t)).toFixed(1)+' '+(100+90*r*Math.sin(t)).toFixed(1)}return `<svg viewBox="0 0 200 200"><path d="${d}Z" fill="#fff"/></svg>`})();
const SPARK='<svg viewBox="0 0 100 100"><path d="M50 4 C54 38 62 46 96 50 C62 54 54 62 50 96 C46 62 38 54 4 50 C38 46 46 38 50 4Z" fill="currentColor"/></svg>';
const SPARKS=[[8,12,14,0],[46,8,10,1.1],[56,70,12,.6],[30,86,9,1.8],[88,14,11,2.4]].map(([x,y,s,d])=>`<span class="spark" aria-hidden="true" style="left:${x}%;top:${y}%;width:${s}px;height:${s}px;animation-delay:${d}s">${SPARK}</span>`).join('');
function mascotCard(pose,title,body,extra=''){return `<section class="card mascot-card"><div class="stack"><h2>${title}</h2>${body}${extra}</div><img src="${MS(pose)}" alt=""></section>`}
POSES.forEach(n=>{const i=new Image();i.src=MS(n)});

/* ---------- Stockage ---------- */
const KEY='ventre-leger-v1';
const blank=()=>({meals:[],symptoms:[],stools:[],treatments:[],doses:{},prn:[],tests:[],weights:[],sss:[],daily:{},context:{flags:[],note:''},fodmap:{phase:'',elimStart:'',ch:{}},plannedTest:'',foodLevels:{},settings:{name:'',gap:4},demo:false});
/* Toute donnée venant du stockage ou d'un fichier passe ici : types forcés, formats vérifiés, tailles bornées.
   L'objet est reconstruit champ par champ, ce qui écarte aussi __proto__ et les champs inconnus. */
const V={
 obj:v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{},
 arr:(v,max=50000)=>Array.isArray(v)?v.slice(0,max):[],
 str:(v,max=500)=>(typeof v==='string'?v:v==null?'':String(v)).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').slice(0,max),
 num:(v,min,max,def=null)=>{const n=typeof v==='number'?v:typeof v==='string'&&v.trim()!==''?Number(v):NaN;return Number.isFinite(n)?Math.min(max,Math.max(min,n)):def},
 int:(v,min,max,def=null)=>{const n=V.num(v,min,max,null);return n==null?def:Math.round(n)},
 bool:v=>v===true,
 id:v=>typeof v==='string'&&/^[\w-]{1,80}$/.test(v)?v:null,
 day:v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(new Date(v+'T12:00:00'))?v:null,
 time:v=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v)?v:null,
 ts:v=>V.num(v,0,4102444800000,null),
 pick:(v,list,def)=>list.includes(v)?v:def,
 safeKey:k=>k!=='__proto__'&&k!=='constructor'&&k!=='prototype'
};
function sanitize(d){
 d=V.obj(d);const o=blank(),today=dayKey(Date.now());
 const withId=(x,f)=>{x=V.obj(x);const r=f(x);if(!r)return null;r.id=V.id(x.id)||uid();return r};
 o.meals=V.arr(d.meals).map(x=>withId(x,m=>{const ts=V.ts(m.ts);return ts==null?null:{ts,type:V.pick(m.type,MEAL_TYPES.map(t=>t[0]),'dejeuner'),items:V.arr(m.items,60).map(i=>norm(V.str(i,80))).filter(Boolean),note:V.str(m.note)}})).filter(Boolean);
 o.symptoms=V.arr(d.symptoms).map(x=>withId(x,m=>{const ts=V.ts(m.ts);if(ts==null)return null;const r={ts,note:V.str(m.note),flags:V.arr(m.flags,20).filter(f=>typeof f==='string'&&Object.prototype.hasOwnProperty.call(FLAGTXT,f))};for(const[k]of SYM)r[k]=V.int(m[k],0,10,0);return r})).filter(Boolean);
 o.stools=V.arr(d.stools).map(x=>withId(x,m=>{const ts=V.ts(m.ts),b=V.int(m.bristol,1,7,null);return ts==null||b==null?null:{ts,bristol:b,strain:V.bool(m.strain),blood:V.bool(m.blood),note:V.str(m.note)}})).filter(Boolean);
 o.treatments=V.arr(d.treatments,500).map(x=>withId(x,t=>{const mode=V.pick(t.mode,['fixed','prn'],'fixed');return{name:V.str(t.name,80).trim()||'Traitement',dose:V.str(t.dose,60),times:mode==='prn'?[]:[...new Set(V.arr(t.times,12).map(V.time).filter(Boolean))].sort(),start:V.day(t.start)||today,days:mode==='prn'?0:V.int(t.days,0,365,0),note:V.str(t.note),mode}})).filter(Boolean);
 const tids=new Set(o.treatments.map(t=>t.id));
 for(const [k,v] of Object.entries(V.obj(d.doses))){const m=/^([\w-]{1,80})\|(\d{4}-\d{2}-\d{2})\|(\d{2}:\d{2})$/.exec(k);const ts=V.ts(v);if(m&&tids.has(m[1])&&V.day(m[2])&&V.time(m[3])&&ts!=null)o.doses[k]=ts}
 o.prn=V.arr(d.prn).map(x=>withId(x,m=>{const ts=V.ts(m.ts),tid=V.id(m.tid);return ts==null||!tid||!tids.has(tid)?null:{tid,ts}})).filter(Boolean);
 o.tests=V.arr(d.tests,200).map(x=>withId(x,t=>{const pdf=V.obj(t.pdf),pid=typeof pdf.id==='string'&&/^pdf-[\w-]{1,80}$/.test(pdf.id)?pdf.id:null;
  return{date:V.day(t.date)||today,substrate:V.pick(t.substrate,['glucose','lactulose'],'glucose'),lab:V.str(t.lab,120),conclusion:V.str(t.conclusion,400),
   points:V.arr(t.points,40).map(q=>{q=V.obj(q);const tt=V.int(q.t,-60,600,null);return tt==null?null:{t:tt,h2:V.num(q.h2,0,1000,null),ch4:V.num(q.ch4,0,1000,null)}}).filter(Boolean),
   pdf:pid?{id:pid,name:V.str(pdf.name,120)||'compte-rendu.pdf',size:V.int(pdf.size,0,1e9,0)}:null}})).filter(Boolean);
 o.weights=V.arr(d.weights,2000).map(x=>withId(x,w=>{const date=V.day(w.date),kg=V.num(w.kg,20,250,null);return date&&kg!=null?{date,kg:Math.round(kg*10)/10}:null})).filter(Boolean);
 o.sss=V.arr(d.sss,1000).map(x=>withId(x,q=>{const ts=V.ts(q.ts);if(ts==null)return null;const r={ts,painYes:V.bool(q.painYes),pain:V.int(q.pain,0,100,0),painDays:V.int(q.painDays,0,10,0),distYes:V.bool(q.distYes),dist:V.int(q.dist,0,100,0),unsat:V.int(q.unsat,0,100,0),impact:V.int(q.impact,0,100,0)};r.total=(r.painYes?r.pain:0)+r.painDays*10+(r.distYes?r.dist:0)+r.unsat+r.impact;return r})).filter(Boolean);
 for(const [k,v] of Object.entries(V.obj(d.daily))){if(!V.day(k))continue;const q=V.obj(v),r={};const w=V.int(q.water,0,40,null);if(w!=null)r.water=w;for(const f of ['sleep','calm']){const n=V.int(q[f],1,5,null);if(n!=null)r[f]=n}const a=V.int(q.act,1,3,null);if(a!=null)r.act=a;if(q.period===true)r.period=true;o.daily[k]=r}
 const c=V.obj(d.context);o.context={flags:[...new Set(V.arr(c.flags,20).filter(f=>CONTEXT.some(x=>x[0]===f)))],note:V.str(c.note,1500)};
 const F=V.obj(d.fodmap);o.fodmap={phase:V.pick(F.phase,['','elim','reintro','perso'],''),elimStart:V.day(F.elimStart)||'',ch:{}};
 for(const [g] of FGROUPS){const q=V.obj(V.obj(F.ch)[g]);const st=V.day(q.start);if(!st)continue;const r={start:st};const res=V.int(q.result,1,3,null);if(res!=null)r.result=res;o.fodmap.ch[g]=r}
 o.plannedTest=V.day(d.plannedTest)||'';
 for(const [k,v] of Object.entries(V.obj(d.foodLevels))){const key=norm(V.str(k,80)),n=V.int(v,0,3,null);if(key&&V.safeKey(key)&&n!=null)o.foodLevels[key]=n}
 const st=V.obj(d.settings);o.settings={name:V.str(st.name,40).trim(),gap:V.pick(V.int(st.gap,3,5,4),[3,4,5],4)};
 o.demo=V.bool(d.demo);
 return o;
}
const normalize=sanitize;
let S=blank();
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast("Impossible d'enregistrer sur cet appareil.")}}
function upsert(col,rec){const i=S[col].findIndex(x=>x.id===rec.id);if(i>=0)S[col][i]=rec;else S[col].push(rec);save()}
function removeRec(col,id){S[col]=S[col].filter(x=>x.id!==id);save()}

/* ---------- Repères médicaux ---------- */
const SIDE=[['nausee','Nausée'],['gout','Goût métallique'],['diarrhee','Diarrhée'],['tete','Maux de tête'],['oreilles','Bourdonnements d’oreille'],['audition','Baisse d’audition'],['fourmis','Fourmillements'],['eruption','Éruption, démangeaisons']];
const RED=[['fievre','Fièvre'],['nuit','Réveillée par la douleur'],['vomit','Vomissements']];
const FLAGTXT=Object.fromEntries([...SIDE,...RED]);
const SERIOUS=['oreilles','audition','fourmis','eruption','fievre','nuit','vomit'];
const ABX=/n[ée]omycine|m[ée]tronidazole|flagyl|rifaximine|tixtar|xifaxan|normix|amoxicilline|augmentin|ciprofloxacine|doxycycline|antibio/i;
const WATCH=[[/n[ée]omycine/i,'Néomycine : signale sans attendre des bourdonnements d’oreille, une baisse d’audition ou des vertiges.'],[/m[ée]tronidazole|flagyl/i,'Métronidazole : pas d’alcool pendant la cure et 48 h après. Goût métallique et nausées sont fréquents. Signale des fourmillements dans les mains ou les pieds.'],[/rifaximine|tixtar|xifaxan|normix/i,'Rifaximine : en général bien tolérée. Nausées ou ballonnements possibles les premiers jours.'],[/prucalopride|resolor/i,'Prucalopride : maux de tête et nausées fréquents les premiers jours, souvent passagers.'],[/[ée]rythromycine/i,'Érythromycine : troubles digestifs possibles. Vérifie les interactions avec tes autres médicaments auprès du pharmacien.'],[/allicine|origan|berb[ée]rine/i,'Plante : signale une brûlure d’estomac ou une nausée importante, et demande l’avis du médecin si tu prends d’autres traitements.']];
function watchFor(name){const out=WATCH.filter(([r])=>r.test(name)).map(([,t])=>t);if(ABX.test(name))out.push('Antibiotique : une diarrhée importante (3 selles liquides ou plus par jour), avec fièvre ou sang, est à signaler rapidement, même quelques semaines après la cure.');return out}
const PRN_SUGG=['Macrogol','Siméticone','Phloroglucinol (Spasfon)','Lactulose','Psyllium'];
const CONTEXT=[['ipp','Anti-acides (IPP)'],['opioides','Opioïdes, codéine, tramadol'],['thyroide','Hypothyroïdie'],['diabete','Diabète'],['chirurgie','Chirurgie abdominale'],['endo','Endométriose'],['gastro','Gastro-entérite avant les symptômes'],['constip','Constipation depuis longtemps']];
const FGROUPS=[['fructose','Fructose','miel, mangue'],['lactose','Lactose','lait, yaourt classique'],['ble','Fructanes du blé','pain de blé, pâtes'],['ail','Fructanes de l’ail','ail'],['oignon','Fructanes de l’oignon','oignon'],['gos','GOS','lentilles, pois chiches'],['sorbitol','Sorbitol','avocat, mûres'],['mannitol','Mannitol','champignons, chou-fleur']];
const FRES=[null,['Bien toléré','ok'],['Toléré en petite quantité','warn'],['Mal toléré','bad']];
const PORTION=['une petite portion','une portion moyenne','une portion habituelle'];
const TEST_TIMES=[-5,0,15,30,45,60,75,90,105,120,135,150,165,180];
I.folder='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M12 11.5v5M9.5 14h5"/></svg>';

/* ---------- Logique ---------- */
function levelOf(it){const k=norm(it);if(k in S.foodLevels)return S.foodLevels[k];if(k in FOODS)return FOODS[k];const s=k.replace(/[sx]$/,'');if(s in FOODS)return FOODS[s];if((k+'s') in FOODS)return FOODS[k+'s'];return 0}
const mealLevel=items=>items.reduce((m,it)=>Math.max(m,levelOf(it)),0);
const guessType=ts=>{const h=new Date(ts).getHours()+new Date(ts).getMinutes()/60;return h<10.5?'petit-dej':h<15?'dejeuner':h<18?'collation':'diner'};
const comp=s=>(s.bloating+s.pain+s.gas)/3;
function isOver(t,day){return t.days>0&&daysBetween(t.start,day)>=t.days}
function activeOn(t,day){return day>=t.start&&!isOver(t,day)}
function dosesFor(day){const out=[];for(const t of S.treatments){if(!activeOn(t,day))continue;for(const tm of t.times){const key=`${t.id}|${day}|${tm}`;out.push({t,tm,day,key,taken:S.doses[key]})}}return out.sort((a,b)=>a.tm.localeCompare(b.tm)||a.t.name.localeCompare(b.t.name))}
function observance(t,from,to){const now=Date.now(),today=dayKey(now),nowHm=hm(now);let exp=0,tak=0;let a=from&&from>t.start?from:t.start;const end=t.days>0?addDays(t.start,t.days-1):today;let b=end<today?end:today;if(to&&to<b)b=to;for(let k=a;k<=b;k=addDays(k,1)){for(const tm of t.times){if(k===today&&tm>nowHm)continue;exp++;if(S.doses[`${t.id}|${k}|${tm}`])tak++}}return{exp,tak,pct:exp?Math.round(tak/exp*100):null}}
function entriesOn(day){const f=x=>dayKey(x.ts)===day;return[...S.meals.filter(f).map(e=>({...e,kind:'meal'})),...S.symptoms.filter(f).map(e=>({...e,kind:'sym'})),...S.stools.filter(f).map(e=>({...e,kind:'stool'})),...S.prn.filter(f).map(e=>({...e,kind:'prn'}))].sort((a,b)=>b.ts-a.ts)}
const tById=id=>S.treatments.find(t=>t.id===id);
const isPrn=t=>t.mode==='prn';
function alerts(){
 const now=Date.now(),from=now-7*864e5,today=dayKey(now),out=[];
 if(S.stools.some(s=>s.ts>=from&&s.blood))out.push('Sang dans les selles');
 const fl=new Set();for(const s of S.symptoms)if(s.ts>=from)for(const f of s.flags||[])if(SERIOUS.includes(f))fl.add(FLAGTXT[f]);out.push(...fl);
 const abx=S.treatments.some(t=>!isPrn(t)&&ABX.test(t.name)&&t.start<=today&&(t.days===0||addDays(t.start,t.days+56)>=today));
 if(abx){const per={};for(const s of S.stools)if(s.ts>=from&&s.bristol>=6){const k=dayKey(s.ts);per[k]=(per[k]||0)+1}if(Object.values(per).some(n=>n>=3))out.push('Diarrhée importante (3 selles liquides ou plus dans la journée) pendant ou après un antibiotique')}
 const w=S.weights.filter(x=>x.date>=addDays(today,-90)).sort((a,b)=>a.date.localeCompare(b.date));
 if(w.length>=2){const mx=Math.max(...w.map(x=>x.kg)),last=w[w.length-1].kg,d=mx-last;if(d>=3||d/mx>=.05)out.push(`Perte de poids de ${fmtNum(d)} kg en moins de 3 mois`)}
 return out;
}
function testInfo(t){
 const P=t.points.filter(p=>p.h2!=null||p.ch4!=null),C=P.filter(p=>p.ch4!=null),H=P.filter(p=>p.h2!=null);
 const maxC=C.length?Math.max(...C.map(p=>p.ch4)):null,maxH=H.length?Math.max(...H.map(p=>p.h2)):null;
 const bas=H.filter(p=>p.t<=0),bH=bas.length?Math.min(...bas.map(p=>p.h2)):(H[0]?H[0].h2:0);
 const riseH=H.filter(p=>p.t>0&&p.t<=90).reduce((m,p)=>Math.max(m,p.h2-bH),0);
 const bc=C.filter(p=>p.t<=0),basC=bc.length?Math.min(...bc.map(p=>p.ch4)):null;
 return{maxC,maxH,basC,riseH,imo:maxC!=null&&maxC>=10,sibo:riseH>=20};
}
function sssCat(v){return v<75?['Rémission','ok']:v<175?['Léger','ok']:v<=300?['Modéré','warn']:['Sévère','bad']}
function cureWindow(){
 const fin=S.treatments.filter(t=>!isPrn(t)&&t.days>0).sort((a,b)=>b.start.localeCompare(a.start));if(!fin.length)return null;
 let start=fin[0].start,end=addDays(fin[0].start,fin[0].days-1);
 for(const t of fin){const e=addDays(t.start,t.days-1);if(t.start<=end&&e>=start){if(t.start<start)start=t.start;if(e>end)end=e}}
 return{start,end,names:[...new Set(fin.filter(t=>t.start<=end&&addDays(t.start,t.days-1)>=start).map(t=>t.name))]};
}
function periodStats(a,b){
 const f=startOfDay(a),t=startOfDay(addDays(b,1)),inR=x=>x.ts>=f&&x.ts<t,nd=daysBetween(a,b)+1;
 const sy=S.symptoms.filter(inR),st=S.stools.filter(inR),ss=S.sss.filter(inR);
 return{comp:sy.length?sy.reduce((x,s)=>x+comp(s),0)/sy.length:null,stools:st.length?st.length/nd:null,bristol:st.length?st.reduce((x,s)=>x+s.bristol,0)/st.length:null,sss:ss.length?ss.reduce((x,s)=>x+s.total,0)/ss.length:null};
}
function activeChallenge(){const today=dayKey(Date.now());for(const [g] of FGROUPS){const c=S.fodmap.ch[g];if(c&&c.start&&!c.result&&c.start<=today)return{g,c,n:daysBetween(c.start,today)+1}}return null}
function freqMap(){const f={};for(const m of S.meals)for(const it of m.items){const k=norm(it);f[k]=(f[k]||0)+1}return f}
function suggestions(q){const f=freqMap();if(!q){const fav=Object.keys(f).sort((a,b)=>f[b]-f[a]);return fav.length>=6?fav:[...new Set([...fav,...STARTERS.map(norm)])]}const fq=fold(q);const all=[...new Set([...Object.keys(f),...Object.keys(FOODS)])].filter(k=>fold(k).includes(fq));const set=new Set(all);return all.filter(k=>!(/[sx]$/.test(k)&&set.has(k.slice(0,-1)))).sort((a,b)=>(fold(b).startsWith(fq)-fold(a).startsWith(fq))||((f[b]||0)-(f[a]||0))||a.length-b.length)}

/* ---------- Rendu ---------- */
let tab='today', range=14, journalDays=14;
const TABS=[['today','Aujourd’hui',I.home],['journal','Journal',I.list],['cure','Cure',I.pill],['dossier','Dossier',I.folder],['bilan','Bilan',I.chart]];
function renderTabs(){$('#tabs').innerHTML=TABS.map(([k,l,ic])=>`<button class="tab" data-act="tab" data-tab="${k}" ${tab===k?'aria-current="page"':''}>${ic}<span>${l}</span></button>`).join('')}
let lastTab=null,lastPose=null,justKey=null,justOn=false,enterT;
function render(){document.body.dataset.tab=tab;const enter=tab!==lastTab;lastTab=tab;renderTabs();const v=$('#view');
 if(enter){v.classList.remove('view-enter');$('#tabs').classList.remove('tabs-enter');void v.offsetWidth;v.classList.add('view-enter');$('#tabs').classList.add('tabs-enter');clearTimeout(enterT);enterT=setTimeout(()=>{v.classList.remove('view-enter');$('#tabs').classList.remove('tabs-enter')},1600)}
 v.innerHTML=({today:viewToday,journal:viewJournal,cure:viewCure,dossier:viewDossier,bilan:viewBilan})[tab]();if(justKey&&justOn)burst($('.just',v));justKey=null;justOn=false;if(enter)countUp(v)}
function greeting(){const h=new Date().getHours();return h<5?'Bonne nuit':h<12?'Bonjour':h<18?'Bon après-midi':'Bonsoir'}

function entryRow(e){
 let ico,title,meta;
 if(e.kind==='meal'){const L=mealLevel(e.items);ico=`<span class="ico meal">${I.meal}</span>`;title=mealLabel(e.type);meta=`${esc(e.items.map(cap).join(', ')||'—')}${e.items.length?` · <span class="lv${L}">FODMAP ${LEVEL_TXT[L]}</span>`:''}`}
 else if(e.kind==='sym'){ico=`<span class="ico sym">${I.sym}</span>`;title='Ressenti';meta=SYM.map(([k,l])=>`${l} ${e[k]}`).join(' · ');if(e.flags&&e.flags.length)meta+=`<br><span class="${e.flags.some(f=>SERIOUS.includes(f))?'lv3':''}">${e.flags.map(f=>esc(FLAGTXT[f]||f)).join(', ')}</span>`}
 else if(e.kind==='prn'){const t=tById(e.tid);ico=`<span class="ico prn">${I.pill}</span>`;title=esc(t?t.name:'Traitement');meta='Prise à la demande'+(t&&t.dose?' · '+esc(t.dose):'')}
 else{ico=`<span class="ico stool">${I.stool}</span>`;title=`Selles · Bristol ${e.bristol}`;meta=esc(BRISTOL[e.bristol])+(e.strain?' · effort':'')+(e.blood?' · <span class="lv3">sang</span>':'')}
 if(e.note)meta+=`<br><i>${esc(e.note)}</i>`;
 return `<button class="entry" data-act="edit" data-kind="${e.kind}" data-id="${esc(e.id)}">${ico}<span class="entry-body"><span class="entry-title"><span>${title}</span><time>${hm(e.ts)}</time></span><span class="entry-meta">${meta}</span></span></button>`;
}
function doseRow(d){const now=Date.now();const due=!d.taken&&d.day===dayKey(now)&&d.tm<=hm(now);return `<button class="dose ${d.key===justKey?'just':''} ${d.taken?'is-taken':''} ${due?'is-due':''}" data-act="dose" data-key="${esc(d.key)}" aria-pressed="${!!d.taken}"><span class="tick">${I.check}</span><span class="dose-main"><b class="num">${d.tm}</b> · ${esc(d.t.name)}${d.t.dose?` <span class="muted">${esc(d.t.dose)}</span>`:''}</span><span class="dose-state">${d.taken?'Pris à '+hm(d.taken):due?'À prendre':'Plus tard'}</span></button>`}

function viewToday(){
 const now=Date.now(),today=dayKey(now);
 const [pose,msg]=heroState();
 let h=`<section class="hero"><div class="hero-text"><div class="eyebrow">${esc(fmtLong(today))}</div><h1>${greeting()}${S.settings.name?' '+esc(S.settings.name):''}&nbsp;!</h1><p>${msg}</p></div>${SPARKS}<div class="hero-art" aria-hidden="true">${FLOWER}<img src="${MS(pose)}" alt="" class="${lastPose&&lastPose!==pose?'new':''}"></div></section>`;lastPose=pose;
 if(S.demo)h+=`<div class="banner"><span>Tu regardes des données d’exemple.</span><button class="btn small" data-act="clear-demo">Les effacer</button></div>`;
 const empty=!S.meals.length&&!S.symptoms.length&&!S.stools.length&&!S.treatments.length;
 if(empty)h+=`<section class="card welcome"><p>Note tes repas, ton ressenti et tes selles en quelques secondes. Ajoute ta cure pour cocher chaque prise, et ton test respiratoire dans Dossier. Le Bilan fait le lien entre tout ça et prépare un PDF pour le médecin.</p><div class="btn-row"><button class="btn primary small" data-act="add-treat">Ajouter ma cure</button><button class="btn ghost small" data-act="demo">Voir un exemple</button></div></section>`;
 const al=alerts();
 if(al.length)h+=`<section class="alert"><h2>À signaler à ton médecin</h2><ul>${al.map(a=>`<li>${esc(a)}</li>`).join('')}</ul><p class="small">Noté ces 7 derniers jours. Appelle ton médecin. En cas de forte fièvre, de sang abondant ou de douleur intense, appelle le 15.</p></section>`;
 h+=`<div class="quick">
  <button class="qbtn q-meal" data-act="add-meal">${I.meal}<span>Repas<small>ce que je mange</small></span></button>
  <button class="qbtn q-sym" data-act="add-sym">${I.sym}<span>Ressenti<small>ventre, effets</small></span></button>
  <button class="qbtn q-stool" data-act="add-stool">${I.stool}<span>Selles<small>échelle de Bristol</small></span></button></div>`;
 const ds=dosesFor(today);
 if(ds.length){const done=ds.filter(d=>d.taken).length;h+=`<section class="card"><div class="card-head"><h2>Prises du jour</h2><span class="pill ${done===ds.length?'ok':''} num">${done}/${ds.length}</span></div><div class="doses">${ds.map(doseRow).join('')}</div></section>`}
 const prnT=S.treatments.filter(t=>isPrn(t)&&activeOn(t,today));
 if(prnT.length)h+=`<section class="card"><h2>À la demande</h2><div class="doses">${prnT.map(t=>{const n=S.prn.filter(p=>p.tid===t.id&&dayKey(p.ts)===today).length;return `<div class="prn-row"><span><b>${esc(t.name)}</b>${t.dose?` <span class="muted">${esc(t.dose)}</span>`:''}<br><span class="small muted">${n?`${n} prise${n>1?'s':''} aujourd’hui`:'Pas aujourd’hui'}</span></span><button class="btn small primary" data-act="prn" data-id="${esc(t.id)}">${I.plus} Prise</button></div>`}).join('')}</div></section>`;
 const ac=activeChallenge();
 if(ac){const g=FGROUPS.find(x=>x[0]===ac.g);h+=ac.n<=3?`<section class="card"><div class="card-head"><h2>Réintroduction : ${g[1]}</h2><span class="pill">Jour ${ac.n} sur 3</span></div><p>Aujourd’hui : <b>${PORTION[ac.n-1]}</b> de ${g[2]}, en gardant le reste des repas pauvre en FODMAP.</p>${ac.n===3?`<p class="small muted">Comment ça s’est passé sur ces 3 jours ?</p>`+fresButtons(ac.g):''}</section>`:`<section class="card"><h2>Réintroduction : ${g[1]}</h2><p class="muted">Les 3 jours de test sont passés. Comment ça s’est passé ?</p>${fresButtons(ac.g)}</section>`}
 const lastS=[...S.sss].sort((a,b)=>b.ts-a.ts)[0];
 if(!empty&&(!lastS||now-lastS.ts>7*864e5))h+=mascotCard('reflechit','Questionnaire de la semaine','<p class="muted small">5 questions, 2 minutes. Le score sur 500 est celui qu’utilisent les gastro-entérologues.</p>','<button class="btn primary small" data-act="sss">Répondre</button>');
 h+=dailyCard(today);
 h+=`<div class="grid2">${pauseCard()}${transitCard()}</div>`;
 const es=entriesOn(today);
 h+=`<section class="card"><div class="card-head"><h2>Aujourd’hui</h2>${es.length?`<span class="muted small">${es.length} note${es.length>1?'s':''}</span>`:''}</div>${es.length?`<div class="entries">${es.map(entryRow).join('')}</div>`:`<p class="empty">Rien de noté pour l’instant. Les trois boutons du haut suffisent.</p>`}</section>`;
 return `<div class="stack">${h}</div>`;
}
function fresButtons(g){return `<div class="btn-row">${[1,2,3].map(v=>`<button class="btn small ${v===1?'primary':'ghost'}" data-act="fres" data-g="${g}" data-v="${v}">${FRES[v][0]}</button>`).join('')}</div>`}
function dailyCard(k){
 const d=S.daily[k]||{};
 const sc=(f,lab,lo,hi)=>`<div class="daily-row"><span>${lab}<br><span class="small muted">${lo} → ${hi}</span></span><div class="scale5">${[1,2,3,4,5].map(v=>`<button data-act="daily" data-f="${f}" data-v="${v}" aria-pressed="${d[f]===v}" aria-label="${lab} ${v} sur 5">${v}</button>`).join('')}</div></div>`;
 return `<section class="card"><h2>Ma journée</h2><div>
  <div class="daily-row"><span>Eau <span class="small muted">· verres</span></span><div class="stepper"><button data-act="daily" data-f="water" data-v="-1" aria-label="Un verre de moins">−</button><b class="num">${d.water||0}</b><button data-act="daily" data-f="water" data-v="1" aria-label="Un verre de plus">+</button></div></div>
  ${sc('sleep','Sommeil','mauvais','excellent')}${sc('calm','Stress','très stressée','très calme')}
  <div class="daily-row"><span>Activité</span><div class="chips">${['Aucune','Légère','30 min +'].map((l,i)=>`<button class="chip" data-act="daily" data-f="act" data-v="${i+1}" aria-pressed="${d.act===i+1}">${l}</button>`).join('')}</div></div>
  <div class="daily-row"><span>Règles</span><button class="chip" data-act="daily" data-f="period" data-v="1" aria-pressed="${!!d.period}">${d.period?'Oui, aujourd’hui':'Non'}</button></div>
 </div></section>`;
}
function heroState(){
 const now=Date.now(),today=dayKey(now),ds=dosesFor(today);
 if(!S.meals.length&&!S.symptoms.length&&!S.stools.length&&!S.treatments.length)return['bras-ouverts','Bienvenue dans ton carnet. On commence ?'];
 if(alerts().length)return['surprise','Quelque chose est à signaler à ton médecin, regarde juste en dessous.'];
 const due=ds.filter(d=>!d.taken&&d.tm<=hm(now));
 if(due.length){const d=due[due.length-1];return['montre',`C’est l’heure de ta prise de ${d.tm} : ${esc(d.t.name)}.`]}
 if(ds.length&&ds.every(d=>d.taken))return['victoire','Toutes tes prises du jour sont cochées. Bravo !'];
 if(entriesOn(today).length>=3)return['pouce','Beau suivi aujourd’hui, continue comme ça.'];
 return['coucou',new Date().getHours()<11?'Comment se sent ton ventre ce matin ?':'Comment ça va aujourd’hui ?'];
}
function pauseCard(){
 const now=Date.now();const last=S.meals.filter(m=>m.ts<=now).sort((a,b)=>b.ts-a.ts)[0];
 const goal=S.settings.gap*36e5;
 if(!last||now-last.ts>36*36e5)return `<section class="card"><span class="eyebrow">Pause repas</span><p class="small muted">Le temps depuis ton dernier repas s’affichera ici. Objectif : ${S.settings.gap} h entre deux repas.</p></section>`;
 const el=now-last.ts,p=Math.min(1,el/goal),r=22,c=2*Math.PI*r,ok=p>=1;
 return `<section class="card"><span class="eyebrow">Pause repas</span><div class="stat"><svg class="ring" width="54" height="54" viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="6"/><circle cx="27" cy="27" r="${r}" fill="none" stroke="${ok?'var(--accent)':'var(--plum)'}" stroke-width="6" stroke-linecap="round" class="arc" stroke-dasharray="${(c*p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 27 27)"/></svg><div><div class="big num">${fmtDur(el)}</div><div class="small muted">${ok?'Objectif atteint':'objectif '+S.settings.gap+' h'}</div></div></div></section>`;
}
function transitCard(){
 const today=dayKey(Date.now());const last=[...S.stools].sort((a,b)=>b.ts-a.ts)[0];
 if(!last)return `<section class="card"><span class="eyebrow">Transit</span><p class="small muted">Note tes selles pour suivre le transit d’un jour à l’autre.</p></section>`;
 const d=daysBetween(dayKey(last.ts),today);
 const txt=d<=0?'Aujourd’hui':d===1?'Hier':`Il y a ${d} jours`;const cls=d<=1?'ok':d===2?'warn':'bad';
 return `<section class="card"><span class="eyebrow">Dernières selles</span><div><div class="stat"><div><div class="big">${txt}</div><div class="small muted">Bristol ${last.bristol}</div></div></div></div><span class="pill ${cls}">${d<=1?'Régulier':d===2?'À surveiller':'Constipation'}</span></section>`;
}

function viewJournal(){
 const today=dayKey(Date.now());
 let h=`<header class="top"><div class="eyebrow">Tout ce que tu as noté</div><h1>Journal</h1></header>`;
 const keys=[...new Set([...S.meals,...S.symptoms,...S.stools,...S.prn].map(e=>dayKey(e.ts)))].sort().reverse();
 if(!keys.length)return `<div class="stack">${h}${mascotCard('montre','Rien ici pour l’instant','<p class="muted">Chaque repas, ressenti ou selle noté apparaîtra ici, jour par jour.</p>','<button class="btn primary" data-act="add-meal">Noter un repas</button>')}</div>`;
 for(const k of keys.slice(0,journalDays)){
  const es=entriesOn(k),ds=dosesFor(k),done=ds.filter(d=>d.taken).length;
  const rel=k===today?'Aujourd’hui':k===addDays(today,-1)?'Hier':fmtLong(k);
  h+=`<section class="card"><div class="day-head"><h2>${esc(rel)}</h2>${ds.length?`<span class="pill ${done===ds.length?'ok':'warn'} num">${I.pill.replace('<svg','<svg width="14" height="14"')} ${done}/${ds.length}</span>`:''}</div><div class="entries">${es.map(entryRow).join('')}</div></section>`;
 }
 if(keys.length>journalDays)h+=`<button class="btn ghost" data-act="more">Afficher les jours précédents</button>`;
 return `<div class="stack">${h}</div>`;
}

function viewCure(){
 const today=dayKey(Date.now());
 const fixed=S.treatments.filter(t=>!isPrn(t)),prn=S.treatments.filter(isPrn);
 const cur=fixed.filter(t=>!isOver(t,today)).sort((a,b)=>a.start.localeCompare(b.start));
 const past=fixed.filter(t=>isOver(t,today)).sort((a,b)=>b.start.localeCompare(a.start));
 let h=`<header class="top"><div class="eyebrow">Traitements & compléments</div><h1>Cure</h1></header>`;
 if(!S.treatments.length)h+=mascotCard('presente','Aucun traitement pour l’instant','<p class="muted">Ajoute ce que le médecin a prescrit&nbsp;: antibiotiques, plantes, prokinétique… et ce que tu prends à la demande, comme un laxatif.</p>');
 else if(cur.length&&cur.every(t=>{const o=observance(t);return o.exp>=3&&o.pct>=90}))h+=mascotCard('coeur','Tu tiens le cap','<p class="muted">Plus de 90 % des prises cochées. C’est ce qui compte le plus pour que la cure marche.</p>');
 const cw=cureWindow();
 if(cw&&cw.end<today&&!cur.some(t=>t.days>0)){const since=daysBetween(cw.end,today);h+=mascotCard('ravie','Après la cure',`<p class="muted small">Cure terminée depuis ${since} jour${since>1?'s':''} (${esc(cw.names.join(', '))}). Les rechutes sont fréquentes&nbsp;: continue à noter ton ressenti et tes selles pour les repérer tôt.</p><p class="small">${S.plannedTest?`Test de contrôle prévu le <b>${fmtShort(S.plannedTest)}</b>.`:'Demande à ton médecin s’il faut un test respiratoire de contrôle, puis note la date dans Dossier.'}</p>`)}
 h+=cur.map(t=>treatCard(t,today)).join('');
 if(prn.length)h+=`<h2 style="margin-top:8px">À la demande</h2>`+prn.map(t=>prnCard(t,today)).join('');
 h+=`<button class="btn primary" data-act="add-treat">${I.plus} Ajouter un traitement</button>`;
 if(past.length)h+=`<h2 style="margin-top:8px">Terminés</h2>`+past.map(t=>treatCard(t,today)).join('');
 return `<div class="stack">${h}</div>`;
}
function prnCard(t,today){
 const wk=S.prn.filter(p=>p.tid===t.id&&p.ts>=startOfDay(addDays(today,-6))).length,w=watchFor(t.name);
 return `<section class="card"><div class="card-head"><div><h2>${esc(t.name)}${t.dose?` <span class="muted" style="font-weight:500">${esc(t.dose)}</span>`:''}</h2><div class="small muted">À la demande · ${wk} prise${wk>1?'s':''} ces 7 derniers jours</div></div><button class="link" data-act="edit-treat" data-id="${esc(t.id)}">Modifier</button></div>${t.note?`<p class="small muted">${esc(t.note)}</p>`:''}${w.length?`<div class="watch">${w.map(esc).join('<br>')}</div>`:''}<button class="btn small primary" data-act="prn" data-id="${esc(t.id)}">${I.plus} Noter une prise</button></section>`;
}
function treatCard(t,today){
 const started=today>=t.start,over=isOver(t,today),n=daysBetween(t.start,today)+1;
 const o=observance(t);
 let prog;
 if(!started)prog=`Commence le ${fmtShort(t.start)}`;
 else if(over)prog=`Terminé · ${t.days} jours à partir du ${fmtShort(t.start)}`;
 else prog=t.days>0?`Jour ${n} sur ${t.days}`:`En continu depuis le ${fmtShort(t.start)}`;
 const pct=t.days>0?Math.min(100,Math.max(0,(started?(over?t.days:n):0)/t.days*100)):null;
 let grid='';
 if(started){
  const last=over?addDays(t.start,t.days-1):today;
  const first=daysBetween(t.start,last)>=6?addDays(last,-6):t.start;
  const days=[];for(let k=first;k<=last;k=addDays(k,1))days.push(k);
  const nowHm=hm(Date.now());
  grid=`<div class="dgrid" style="grid-template-columns:44px repeat(${days.length},minmax(34px,1fr))"><span></span>${days.map(k=>`<span class="h">${k===today?'Auj.':noon(k).toLocaleDateString('fr-FR',{weekday:'short'}).replace('.','')+' '+noon(k).getDate()}</span>`).join('')}`+
   t.times.map(tm=>`<span class="rowlab">${tm}</span>`+days.map(k=>{const key=`${t.id}|${k}|${tm}`,on=!!S.doses[key],fut=k===today&&tm>nowHm;return `<button class="cell ${key===justKey?'just':''} ${on?'on':''} ${k===today?'today':''} ${fut&&!on?'future':''}" data-act="dose" data-key="${esc(key)}" aria-label="${tm} le ${fmtShort(k)} : ${on?'pris':'non pris'}">${I.check}</button>`}).join('')).join('')+`</div>`;
 }
 return `<section class="card"><div class="card-head"><div><h2>${esc(t.name)}${t.dose?` <span class="muted" style="font-weight:500">${esc(t.dose)}</span>`:''}</h2><div class="small muted">${t.times.length} prise${t.times.length>1?'s':''} par jour · ${t.times.join(', ')}</div></div><button class="link" data-act="edit-treat" data-id="${esc(t.id)}">Modifier</button></div>
  <div class="stack" style="gap:6px"><div class="small" style="font-weight:600">${prog}</div>${pct!=null?`<div class="bar"><i style="width:${pct.toFixed(0)}%"></i></div>`:''}</div>
  ${t.note?`<p class="small muted">${esc(t.note)}</p>`:''}
  ${(()=>{const w=watchFor(t.name);return w.length&&!over?`<div class="watch"><b>À surveiller</b><br>${w.map(esc).join('<br>')}</div>`:''})()}
  ${grid}
  ${o.exp?`<p class="small muted">Prises cochées : <b class="num" style="color:var(--fg)">${o.tak}/${o.exp}</b> (${o.pct} %)</p>`:''}
  ${over?'':`<button class="btn ghost small" data-act="ics" data-id="${esc(t.id)}">${I.cal} Rappels dans Calendrier</button>`}
 </section>`;
}

function rangeDays(n){const today=dayKey(Date.now());const out=[];for(let i=n-1;i>=0;i--)out.push(addDays(today,-i));return out}
function dayStats(days){
 return days.map(k=>{const sy=S.symptoms.filter(s=>dayKey(s.ts)===k),st=S.stools.filter(s=>dayKey(s.ts)===k),me=S.meals.filter(m=>dayKey(m.ts)===k);
  const avg=f=>sy.length?sy.reduce((a,s)=>a+f(s),0)/sy.length:null;
  return{k,comp:avg(comp),bloating:avg(s=>s.bloating),pain:avg(s=>s.pain),gas:avg(s=>s.gas),fatigue:avg(s=>s.fatigue),stools:st.sort((a,b)=>a.ts-b.ts),meals:me.sort((a,b)=>a.ts-b.ts),high:me.filter(m=>mealLevel(m.items)===3).length,daily:S.daily[k]||{},period:!!(S.daily[k]&&S.daily[k].period),prn:S.prn.filter(p=>dayKey(p.ts)===k).length,flags:sy.flatMap(s=>s.flags||[])}});
}
function chartSvg(ds){
 const W=340,padL=24,padR=10,padT=10,plotH=110,n=ds.length;
 const x=i=>padL+(n===1?(W-padL-padR)/2:i*(W-padL-padR)/(n-1)), y=v=>padT+plotH-(v/10)*plotH;
 const yS=padT+plotH+18,yF=yS+16,yL=yF+18,H=yL+4;
 let g='';
 for(const v of [0,5,10]){g+=`<line x1="${padL}" x2="${W-padR}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1" ${v?'stroke-dasharray="2 3"':''}/><text x="${padL-6}" y="${y(v)+3}" text-anchor="end">${v}</text>`}
 {const sw=(W-padL-padR)/Math.max(1,n-1);ds.forEach((d,i)=>{if(d.period)g+=`<rect x="${Math.max(padL,x(i)-sw/2).toFixed(1)}" y="${padT}" width="${(Math.min(W-padR,x(i)+sw/2)-Math.max(padL,x(i)-sw/2)).toFixed(1)}" height="${plotH}" fill="var(--rose)"/>`})}
 let segs=[],cur=[];ds.forEach((d,i)=>{if(d.comp==null){if(cur.length)segs.push(cur);cur=[]}else cur.push([x(i),y(d.comp)])});if(cur.length)segs.push(cur);
 for(const s of segs){if(s.length>1){g+=`<path d="M${s.map(p=>p.map(v=>v.toFixed(1)).join(' ')).join('L')} L${s[s.length-1][0].toFixed(1)} ${y(0)} L${s[0][0].toFixed(1)} ${y(0)}Z" fill="var(--sky)" fill-opacity=".35" class="area"/><path d="M${s.map(p=>p.map(v=>v.toFixed(1)).join(' ')).join('L')}" fill="none" stroke="var(--sky-deep)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" pathLength="1" class="line"/>`}}
 ds.forEach((d,i)=>{if(d.comp!=null)g+=`<circle cx="${x(i).toFixed(1)}" cy="${y(d.comp).toFixed(1)}" r="${i===n-1?4.5:3}" class="pt" fill="var(--sky-deep)" stroke="var(--surface)" stroke-width="1.5"/>`});
 const col={ok:'var(--ok)',warn:'var(--warn)',bad:'var(--bad)'};
 ds.forEach((d,i)=>{const cx=x(i).toFixed(1);
  if(d.stools.length){const b=d.stools.reduce((m,s)=>Math.abs(s.bristol-4)>Math.abs(m-4)?s.bristol:m,d.stools[0].bristol);g+=`<circle cx="${cx}" cy="${yS}" r="5" fill="${col[bristolClass(b)]}"/>`;if(d.stools.length>1)g+=`<text x="${cx}" y="${yS+3}" text-anchor="middle" style="fill:var(--surface);font-size:7px;font-weight:700">${d.stools.length}</text>`}
  else g+=`<circle cx="${cx}" cy="${yS}" r="4" fill="none" stroke="var(--line)" stroke-width="1.5"/>`;
  for(let j=0;j<Math.min(d.high,3);j++)g+=`<rect x="${(x(i)-4.5+j*3.2).toFixed(1)}" y="${yF-4}" width="2.4" height="8" rx="1" fill="var(--bad)"/>`;
 });
 const step=n<=7?1:n<=14?2:5;
 ds.forEach((d,i)=>{if(i%step===0||i===n-1){if(i!==n-1&&n-1-i<step&&i!==0)return;const dt=noon(d.k);g+=`<text x="${x(i).toFixed(1)}" y="${yL}" text-anchor="middle">${dt.getDate()}/${dt.getMonth()+1}</text>`}});
 return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ressenti moyen par jour">${g}</svg>`;
}
function pistes(days){
 const from=startOfDay(days[0]),to=Date.now();
 const syms=S.symptoms.filter(s=>s.ts>=from&&s.ts<=to);
 if(syms.length<4)return null;
 const base=syms.reduce((a,s)=>a+comp(s),0)/syms.length;const per={};
 for(const m of S.meals){if(m.ts<from||m.ts>to)continue;const after=syms.filter(s=>s.ts>m.ts+3*36e5&&s.ts<=m.ts+24*36e5);if(!after.length)continue;const v=after.reduce((a,s)=>a+comp(s),0)/after.length;for(const it of new Set(m.items.map(norm)))(per[it]=per[it]||[]).push(v)}
 const rows=Object.entries(per).filter(([,a])=>a.length>=3).map(([k,a])=>({k,n:a.length,d:a.reduce((p,q)=>p+q,0)/a.length-base})).sort((a,b)=>b.d-a.d);
 return{base,rows:rows.filter(r=>r.d>=0.7).slice(0,5)};
}
function viewBilan(){
 const days=rangeDays(range),ds=dayStats(days),today=days[days.length-1];
 let h=`<header class="top"><div class="eyebrow">Ce qui se dégage</div><h1>Bilan</h1></header>`;
 h+=`<div class="seg" role="group" aria-label="Période">${[7,14,30].map(n=>`<button data-act="range" data-n="${n}" aria-pressed="${range===n}">${n} jours</button>`).join('')}</div>`;
 const withSym=ds.filter(d=>d.comp!=null);
 const avgC=withSym.length?withSym.reduce((a,d)=>a+d.comp,0)/withSym.length:null;
 const noStool=ds.filter(d=>!d.stools.length).length;
 const meals=ds.flatMap(d=>d.meals),known=meals.filter(m=>mealLevel(m.items)>0),low=known.filter(m=>mealLevel(m.items)===1);
 let exp=0,tak=0;for(const t of S.treatments){const o=observance(t,days[0],today);exp+=o.exp;tak+=o.tak}
 h+=`<section class="card"><div class="card-head"><h2>Ressenti du ventre</h2><span class="small muted">0 à 10</span></div>${chartSvg(ds)}
  <div class="legend"><span><svg width="18" height="8"><path d="M1 6 L8 2 L17 5" stroke="var(--sky-deep)" stroke-width="2" fill="none"/></svg>Moyenne ballonnements, douleur, gaz</span><span><svg width="10" height="10"><circle cx="5" cy="5" r="4.5" fill="var(--ok)"/></svg>Selles (couleur : Bristol)</span><span><svg width="10" height="10"><circle cx="5" cy="5" r="3.5" fill="none" stroke="var(--line)" stroke-width="1.5"/></svg>Pas de selles</span><span><svg width="6" height="10"><rect x="1" y="1" width="3" height="8" rx="1" fill="var(--bad)"/></svg>Repas FODMAP élevé</span><span><svg width="12" height="10"><rect width="12" height="10" rx="2" fill="var(--rose)"/></svg>Règles</span></div></section>`;
 h+=`<div class="tiles">
  <div class="tile"><b>${avgC!=null?fmtNum(avgC):'–'}</b><span>ressenti moyen /10</span></div>
  <div class="tile"><b>${noStool}</b><span>jour${noStool>1?'s':''} sans selles sur ${range}</span></div>
  <div class="tile"><b>${known.length?Math.round(low.length/known.length*100)+' %':'–'}</b><span>repas FODMAP bas</span></div>
  <div class="tile"><b>${exp?Math.round(tak/exp*100)+' %':'–'}</b><span>prises cochées</span></div></div>`;
 const cw=cureWindow();
 if(cw&&cw.start<=today){
  const before=periodStats(addDays(cw.start,-14),addDays(cw.start,-1)),during=periodStats(cw.start,cw.end<today?cw.end:today),after=cw.end<today?periodStats(addDays(cw.end,1),today):null;
  const f=(v,d)=>v==null?'–':fmtNum(v,d);
  const rows=[['Ressenti /10','comp',1],['Selles / jour','stools',1],['Bristol moyen','bristol',1],['Score IBS-SSS','sss',0]];
  h+=`<section class="card"><h2>Avant, pendant, après la cure</h2><p class="small muted">${esc(cw.names.join(', '))} · du ${fmtShort(cw.start)} au ${fmtShort(cw.end)}</p><div class="cmp"><span></span><span class="h">14 j avant</span><span class="h">Pendant</span><span class="h">Après</span>${rows.map(([l,k,d])=>`<span class="small">${l}</span><span class="v">${f(before[k],d)}</span><span class="v">${f(during[k],d)}</span><span class="v">${after?f(after[k],d):'–'}</span>`).join('')}</div>${after&&after.comp!=null&&during.comp!=null&&after.comp-during.comp>=1.5?`<p class="small" style="color:var(--bad)">Les symptômes remontent depuis la fin de la cure. Parles-en à ton médecin.</p>`:''}</section>`;
 }
 const dd=ds.map(d=>d.daily),av=k=>{const v=dd.map(x=>x[k]).filter(v=>v!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null},prnN=ds.reduce((a,d)=>a+d.prn,0),per=ds.filter(d=>d.period).length;
 const fx=v=>v==null?'–':fmtNum(v);
 h+=`<section class="card"><h2>Hygiène de vie</h2><div class="tiles">
  <div class="tile"><b>${fx(av('water'))}</b><span>verres d’eau par jour</span></div>
  <div class="tile"><b>${fx(av('sleep'))}</b><span>sommeil /5</span></div>
  <div class="tile"><b>${fx(av('calm'))}</b><span>calme /5 (5 = pas de stress)</span></div>
  <div class="tile"><b>${prnN}</b><span>prise${prnN>1?'s':''} à la demande</span></div></div>${per?`<p class="small muted">${per} jour${per>1?'s':''} de règles sur la période, en rose sur la courbe.</p>`:''}</section>`;
 const p=pistes(days);
 h+=`<section class="card mascot-card"><div class="stack"><h2>Pistes à explorer</h2>`;
 if(!p)h+=`<p class="empty">Note quelques ressentis (au moins 4 sur la période) et tes repas : les aliments souvent suivis d’un ventre plus agité dans les 3 à 24 h apparaîtront ici.</p>`;
 else if(!p.rows.length)h+=`<p class="empty">Aucun aliment ne ressort nettement sur cette période. C’est plutôt bon signe.</p>`;
 else h+=`<p class="small muted">Aliments suivis d’un ressenti plus fort que ta moyenne (${fmtNum(p.base)}) dans les 3 à 24 h. Ce sont des pistes à discuter, pas des preuves.</p><div>${p.rows.map(r=>`<div class="piste"><span><span class="dot l${levelOf(r.k)}" style="display:inline-block;vertical-align:-1px;margin-right:6px"></span><b>${esc(cap(r.k))}</b> <span class="muted small">· ${r.n} fois</span></span><span class="num" style="color:var(--bad);font-weight:600">+${fmtNum(r.d)}</span></div>`).join('')}</div>`;
 h+=`</div><img src="${MS('reflechit')}" alt=""></section>`;
 h+=mascotCard('presente','Pour le médecin',`<p class="small muted">Un PDF des ${range} derniers jours : tests respiratoires, cures, effets indésirables, scores, ressenti, selles, repas et contexte. À envoyer par mail, Messages ou à enregistrer dans Fichiers.</p>`,`<button class="btn primary" data-act="pdf">${I.doc} Créer le PDF</button>`);
 h+=`<section class="card"><h2>Réglages</h2>
  <label class="field"><span class="label">Prénom</span><input type="text" id="set-name" value="${esc(S.settings.name)}" placeholder="Pour te dire bonjour" autocomplete="given-name"></label>
  <label class="field"><span class="label">Pause visée entre deux repas</span><select id="set-gap">${[3,4,5].map(n=>`<option value="${n}" ${S.settings.gap==n?'selected':''}>${n} heures</option>`).join('')}</select></label>
  <p class="small muted">Espacer les repas laisse le temps aux vagues de « nettoyage » de l’intestin grêle de passer, ce qui aide à limiter la prolifération. Vérifie la durée avec ton médecin.</p></section>`;
 h+=`<section class="card"><h2>Tes données</h2><p class="small muted">Tout reste sur ce téléphone, rien n’est envoyé ailleurs. Fais une sauvegarde de temps en temps (par exemple dans Fichiers ou iCloud Drive).</p>
  <div class="btn-row"><button class="btn small" data-act="backup">Sauvegarder</button><button class="btn small" data-act="restore">Importer un fichier</button></div>
  <div class="btn-row">${S.demo?'':`<button class="btn ghost small" data-act="demo">Charger un exemple</button>`}<button class="btn ghost small danger" data-act="wipe">Tout effacer</button></div></section>`;
 h+=`<p class="foot">Repères FODMAP indicatifs : la portion compte. Ce carnet ne remplace pas l’avis de ton médecin.</p>`;
 return `<div class="stack">${h}</div>`;
}

function viewDossier(){
 let h=`<header class="top"><div class="eyebrow">Ce que le médecin voudra savoir</div><h1>Dossier</h1></header>`;
 const tests=[...S.tests].sort((a,b)=>b.date.localeCompare(a.date));
 h+=`<section class="card"><div class="card-head"><h2>Tests respiratoires</h2></div>`;
 if(!tests.length)h+=`<p class="empty">Dépose le compte rendu PDF de ton test : l’app essaie de lire elle-même les valeurs d’hydrogène et de méthane. Tu peux aussi les saisir à la main.</p><button class="btn primary" data-act="test-pdf">${I.doc} Déposer le compte rendu PDF</button><button class="btn ghost small" data-act="add-test">Saisir les valeurs à la main</button>`;
 else{h+=`<div class="btn-row"><button class="btn small primary" data-act="test-pdf">${I.doc} Déposer un PDF</button><button class="btn small ghost" data-act="add-test">Saisir à la main</button></div>`;if(tests.length>=2){const o=tests[tests.length-1],n=tests[0],a=testInfo(o),b=testInfo(n);if(a.maxC!=null&&b.maxC!=null)h+=`<p class="small">Pic de méthane : <b>${a.maxC} ppm</b> le ${fmtShort(o.date)} → <b>${b.maxC} ppm</b> le ${fmtShort(n.date)}</p>`}h+=tests.map(testBlock).join('')}
 h+=`<label class="field"><span class="label">Prochain test de contrôle</span><input type="date" id="set-plan" value="${esc(S.plannedTest)}"></label></section>`;
 const ss=[...S.sss].sort((a,b)=>b.ts-a.ts);
 h+=`<section class="card"><div class="card-head"><h2>Score IBS-SSS</h2><button class="link" data-act="sss">Répondre</button></div><p class="small muted">Le questionnaire de référence des gastro-entérologues, noté sur 500. Une fois par semaine suffit.</p>${ss.length?`<div>${ss.slice(0,6).map(s=>{const [l,c]=sssCat(s.total);return `<div class="piste"><span>${fmtShort(dayKey(s.ts))}</span><span><b class="num">${s.total}</b> <span class="pill ${c}">${l}</span></span></div>`}).join('')}</div>`:'<p class="empty">Pas encore de score.</p>'}<p class="small muted">Repères : moins de 75 rémission · 75 à 174 léger · 175 à 300 modéré · plus de 300 sévère.</p></section>`;
 const w=[...S.weights].sort((a,b)=>b.date.localeCompare(a.date));
 h+=`<section class="card"><h2>Poids</h2><div class="adder"><input type="number" id="w-kg" inputmode="decimal" step="0.1" min="20" max="250" placeholder="Ex. 58,4" aria-label="Poids en kg"><button class="btn small primary" data-act="add-weight">Ajouter</button></div>${w.length?`<div>${w.slice(0,5).map(x=>`<div class="piste"><span>${fmtShort(x.date)}</span><span><b class="num">${fmtNum(x.kg)} kg</b> <button class="link" data-act="del-weight" data-id="${esc(x.id)}" aria-label="Supprimer cette pesée">Retirer</button></span></div>`).join('')}</div>`:'<p class="empty">Une pesée par semaine suffit, le matin à jeun. Une perte de poids inexpliquée est à signaler.</p>'}</section>`;
 h+=fodmapCard();
 h+=`<section class="card"><h2>Mon contexte</h2><p class="small muted">Ce qui peut favoriser l’IMO. Coche ce qui te concerne, ça apparaîtra dans le PDF.</p><div class="chips">${CONTEXT.map(([k,l])=>`<button class="chip" data-act="ctx" data-k="${k}" aria-pressed="${S.context.flags.includes(k)}">${l}</button>`).join('')}</div><label class="field"><span class="label">Autres traitements, antécédents</span><textarea id="set-ctx" rows="3" placeholder="Pilule, autres médicaments, prise de sang (TSH, fer, B12…)">${esc(S.context.note)}</textarea></label></section>`;
 return `<div class="stack">${h}</div>`;
}
function testChart(t){
 const W=320,H=124,pl=26,pr=8,pt=12,pb=18,P=t.points.filter(p=>p.h2!=null||p.ch4!=null);if(P.length<2)return'';
 const t0=P[0].t,t1=P[P.length-1].t,vals=P.flatMap(p=>[p.h2,p.ch4]).filter(v=>v!=null),ymax=Math.max(30,Math.ceil((Math.max(...vals)+5)/10)*10);
 const x=v=>pl+(v-t0)/((t1-t0)||1)*(W-pl-pr),y=v=>pt+(H-pt-pb)*(1-v/ymax);
 let g='';for(const v of [0,ymax/2,ymax])g+=`<line x1="${pl}" x2="${W-pr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="var(--line)"/><text x="${pl-5}" y="${(y(v)+3).toFixed(1)}" text-anchor="end">${v}</text>`;
 g+=`<line x1="${pl}" x2="${W-pr}" y1="${y(10).toFixed(1)}" y2="${y(10).toFixed(1)}" stroke="var(--bad)" stroke-dasharray="3 3" opacity=".6"/><text x="${W-pr}" y="${(y(10)-3).toFixed(1)}" text-anchor="end" style="fill:var(--bad)">seuil méthane 10 ppm</text>`;
 const line=(k,c)=>{const pts=P.filter(p=>p[k]!=null);if(pts.length<2)return'';return `<path d="M${pts.map(p=>x(p.t).toFixed(1)+' '+y(p[k]).toFixed(1)).join('L')}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round" pathLength="1" class="line"/>`+pts.map(p=>`<circle cx="${x(p.t).toFixed(1)}" cy="${y(p[k]).toFixed(1)}" r="2.4" fill="${c}" class="pt"/>`).join('')};
 g+=line('ch4','var(--bad)')+line('h2','var(--sky-deep)');
 for(const v of [0,60,120,180])if(v>=t0&&v<=t1)g+=`<text x="${x(v).toFixed(1)}" y="${H-4}" text-anchor="middle">${v} min</text>`;
 return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Hydrogène et méthane pendant le test">${g}</svg>`;
}
function testBlock(t){
 const i=testInfo(t);
 return `<div class="test"><div class="card-head"><div><b>${fmtShort(t.date)} ${noon(t.date).getFullYear()}</b><div class="small muted">${t.substrate==='lactulose'?'Lactulose':'Glucose'}${t.lab?' · '+esc(t.lab):''}</div></div><button class="link" data-act="edit-test" data-id="${esc(t.id)}">Modifier</button></div>
  <div class="chips">${i.imo?'<span class="pill bad">IMO : méthane ≥ 10 ppm</span>':'<span class="pill ok">Méthane &lt; 10 ppm</span>'}${i.sibo?'<span class="pill bad">SIBO à hydrogène</span>':'<span class="pill ok">Hydrogène normal</span>'}</div>
  <p class="small">Méthane : basal ${i.basC??'–'} ppm, pic <b>${i.maxC??'–'} ppm</b>. Hydrogène : pic ${i.maxH??'–'} ppm, hausse max ${i.riseH} ppm avant 90 min.</p>
  ${t.pdf?`<button class="pdfrow" data-act="pdf-view" data-id="${esc(t.pdf.id)}">${I.doc}<span class="pdfname">${esc(t.pdf.name)}</span><span class="link">Voir</span></button>`:''}
  ${testChart(t)}<div class="legend"><span><svg width="18" height="8"><path d="M1 4 H17" stroke="var(--bad)" stroke-width="2.2"/></svg>Méthane (CH₄)</span><span><svg width="18" height="8"><path d="M1 4 H17" stroke="var(--sky-deep)" stroke-width="2.2"/></svg>Hydrogène (H₂)</span></div>
  ${t.conclusion?`<p class="small muted"><i>« ${esc(t.conclusion)} »</i></p>`:''}</div>`;
}
function fodmapCard(){
 const F=S.fodmap,today=dayKey(Date.now());
 let h=`<section class="card"><h2>Régime pauvre en FODMAP</h2><label class="field"><span class="label">Phase</span><select id="set-phase">${[['','Pas de régime en cours'],['elim','1. Élimination'],['reintro','2. Réintroduction'],['perso','3. Personnalisation']].map(([v,l])=>`<option value="${v}" ${F.phase===v?'selected':''}>${l}</option>`).join('')}</select></label>`;
 if(F.phase==='')h+=`<p class="small muted">Idéalement avec un·e diététicien·ne. L’app suit chaque phase et guide la réintroduction, groupe par groupe.</p>`;
 if(F.phase==='elim'){h+=`<label class="field"><span class="label">Début de l’élimination</span><input type="date" id="set-elim" value="${esc(F.elimStart)}"></label>`;if(F.elimStart){const wk=Math.floor(daysBetween(F.elimStart,today)/7)+1;h+=`<p class="small">Semaine <b>${wk}</b>. L’élimination dure en général 2 à 6 semaines, pas plus. ${wk>6?'<b>Il est temps de passer à la réintroduction.</b>':''}</p>`}}
 if(F.phase==='reintro'||F.phase==='perso'){const ac=activeChallenge();h+=`<p class="small muted">Un groupe à la fois : 3 jours avec une portion qui augmente, puis 2 à 3 jours de pause avant le suivant.</p><div>${FGROUPS.map(([g,l,ex])=>{const c=F.ch[g]||{};let st;if(c.result)st=`<span class="pill ${FRES[c.result][1]}">${FRES[c.result][0]}</span> <button class="link" data-act="freset" data-g="${g}">Refaire</button>`;else if(c.start)st=`<span class="pill">En test</span> <button class="link" data-act="freset" data-g="${g}">Annuler</button>`;else st=ac?'':`<button class="btn small ghost" data-act="fstart" data-g="${g}">Tester</button>`;return `<div class="fg"><span><b>${l}</b><br><span class="small muted">${ex}</span></span><span>${st}</span></div>`}).join('')}</div>`}
 return h+`</section>`;
}

/* ---------- Feuilles de saisie ---------- */
function openSheet(html,mount){
 const sh=$('#sheet');const body=document.createElement('div');body.className='sheet-body';
 body.innerHTML=`<div class="grabber"></div>`+html;sh.replaceChildren(body);sh.hidden=false;
 requestAnimationFrame(()=>requestAnimationFrame(()=>sh.classList.add('open')));
 mount&&mount(body);
}
function closeSheet(){const sh=$('#sheet');sh.classList.remove('open');setTimeout(()=>{sh.hidden=true;sh.replaceChildren()},280)}
$('#sheet').addEventListener('click',e=>{if(e.target.id==='sheet')closeSheet()});
const head=t=>`<div class="sheet-head"><h2>${t}</h2><button class="x" data-act="close" aria-label="Fermer">${I.x}</button></div>`;
function armDelete(btn,fn){if(btn.dataset.armed){fn();closeSheet();toast('Supprimé');render();return}btn.dataset.armed='1';const old=btn.textContent;btn.textContent='Confirmer';setTimeout(()=>{if(btn.isConnected){delete btn.dataset.armed;btn.textContent=old}},3500)}
const actions=(ex)=>`<div class="sheet-actions">${ex?'<button class="btn ghost danger" id="f-del">Supprimer</button>':''}<button class="btn primary" id="f-save">Enregistrer</button></div>`;
const tsField=ts=>`<label class="field"><span class="label">Date et heure</span><input type="datetime-local" id="f-ts" value="${toLocalInput(ts)}"></label>`;

function mealSheet(id){
 const ex=S.meals.find(m=>m.id===id);
 const e=ex?{...ex,items:[...ex.items]}:{ts:Date.now(),type:guessType(Date.now()),items:[],note:''};
 openSheet(`${head(ex?'Modifier le repas':'Nouveau repas')}
  <div class="field"><span class="label">Moment</span><div class="chips" id="m-type">${MEAL_TYPES.map(([k,l])=>`<button type="button" class="chip" data-type="${k}" aria-pressed="${e.type===k}">${l}</button>`).join('')}</div></div>
  <div class="field"><span class="label">Aliments</span>
   <div class="adder"><input type="text" id="m-food" placeholder="Ex. riz, courgettes, poulet" autocomplete="off" enterkeyhint="done"><button type="button" class="btn small" id="m-add">Ajouter</button></div>
   <div class="chips" id="m-items"></div><div class="hint" id="m-sum"></div><div class="chips" id="m-sugg"></div></div>
  ${tsField(e.ts)}
  <label class="field"><span class="label">Note (facultatif)</span><textarea id="f-note" rows="2" placeholder="Portion, restaurant, ressenti juste après…">${esc(e.note)}</textarea></label>
  ${actions(ex)}`,root=>{
  const food=$('#m-food',root);
  const drawSugg=()=>{const q=food.value.trim();const have=e.items.map(norm);const list=suggestions(q).filter(s=>!have.includes(s)).slice(0,q?10:12);$('#m-sugg',root).innerHTML=(list.length?`<span class="label small">${q?'Suggestions':'Tes habituels'}</span>`:'')+list.map(s=>`<button type="button" class="chip ghost" data-sg="${esc(s)}"><span class="dot l${levelOf(s)}"></span>${esc(cap(s))}</button>`).join('')};
  const drawItems=()=>{$('#m-items',root).innerHTML=e.items.map((it,i)=>`<span class="chip item"><button type="button" class="dot l${levelOf(it)}" data-lvl="${i}" aria-label="Changer le repère FODMAP de ${esc(it)}"></button>${esc(cap(it))}<button type="button" class="rm" data-rm="${i}" aria-label="Retirer ${esc(it)}">${I.x}</button></span>`).join('');const L=mealLevel(e.items);$('#m-sum',root).innerHTML=e.items.length?`Repère FODMAP du repas : <b class="lv${L}">${LEVEL_TXT[L]}</b>. Touche la pastille d’un aliment pour corriger son repère.`:'Tape un aliment ou choisis-le dans la liste. Vert : FODMAP bas, orange : modéré, rouge : élevé.';drawSugg()};
  const add=v=>{v.split(/[,;\n]/).map(x=>x.trim()).filter(Boolean).forEach(x=>{if(!e.items.map(norm).includes(norm(x)))e.items.push(norm(x))});food.value='';drawItems()};
  root.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;
   if(b.dataset.type){e.type=b.dataset.type;$$('#m-type .chip',root).forEach(c=>c.setAttribute('aria-pressed',c===b))}
   else if(b.dataset.sg){add(b.dataset.sg)}
   else if(b.dataset.rm!=null){e.items.splice(+b.dataset.rm,1);drawItems()}
   else if(b.dataset.lvl!=null){const it=e.items[+b.dataset.lvl];S.foodLevels[norm(it)]=(levelOf(it)+1)%4;save();drawItems()}
   else if(b.id==='m-add'){add(food.value)}
   else if(b.id==='f-save'){if(food.value.trim())add(food.value);const note=$('#f-note',root).value.trim();if(!e.items.length&&!note){toast('Ajoute au moins un aliment ou une note.');return}
    upsert('meals',{id:ex?ex.id:uid(),ts:fromLocalInput($('#f-ts',root).value)||e.ts,type:e.type,items:e.items,note});closeSheet();toast(ex?'Repas modifié':'Repas noté');render()}
   else if(b.id==='f-del'){armDelete(b,()=>removeRec('meals',ex.id))}});
  food.addEventListener('input',drawSugg);
  food.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();add(food.value)}});
  drawItems();
 });
}
function symSheet(id){
 const ex=S.symptoms.find(x=>x.id===id);
 const e=ex||{ts:Date.now(),bloating:0,pain:0,gas:0,fatigue:0,note:'',flags:[]};
 const flags=new Set(e.flags||[]);
 const chipF=([k,l])=>`<button type="button" class="chip" data-fl="${k}" aria-pressed="${flags.has(k)}">${l}</button>`;
 openSheet(`${head(ex?'Modifier le ressenti':'Comment va ton ventre ?')}
  ${SYM.map(([k,l])=>`<div class="slider"><div class="slider-top"><label for="s-${k}">${l}</label><output id="o-${k}">${e[k]}</output></div><input type="range" min="0" max="10" step="1" id="s-${k}" value="${e[k]}"><div class="scale"><span>Rien</span><span>Très fort</span></div></div>`).join('')}
  <div class="field"><span class="label">Effets indésirables</span><div class="chips">${SIDE.map(chipF).join('')}</div></div>
  <div class="field"><span class="label">Signes à surveiller</span><div class="chips">${RED.map(chipF).join('')}</div></div>
  ${tsField(e.ts)}
  <label class="field"><span class="label">Note (facultatif)</span><textarea id="f-note" rows="2" placeholder="Reflux, stress, sommeil…">${esc(e.note)}</textarea></label>
  ${actions(ex)}`,root=>{
  root.addEventListener('input',ev=>{if(ev.target.type==='range')$('#o-'+ev.target.id.slice(2),root).textContent=ev.target.value});
  root.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;
   if(b.dataset.fl){const k=b.dataset.fl;flags.has(k)?flags.delete(k):flags.add(k);b.setAttribute('aria-pressed',flags.has(k))}
   else if(b.id==='f-save'){const rec={id:ex?ex.id:uid(),ts:fromLocalInput($('#f-ts',root).value)||e.ts,note:$('#f-note',root).value.trim(),flags:[...flags]};for(const[k]of SYM)rec[k]=+$('#s-'+k,root).value;upsert('symptoms',rec);closeSheet();toast(ex?'Ressenti modifié':'Ressenti noté');render()}
   else if(b.id==='f-del'){armDelete(b,()=>removeRec('symptoms',ex.id))}});
 });
}
function stoolSheet(id){
 const ex=S.stools.find(x=>x.id===id);
 const e=ex?{...ex}:{ts:Date.now(),bristol:0,strain:false,blood:false,note:''};
 openSheet(`${head(ex?'Modifier':'Selles')}
  <div class="field"><span class="label">Échelle de Bristol</span><div class="bristol" id="b-opts">${BRISTOL.slice(1).map((d,i)=>`<button type="button" class="bopt" data-b="${i+1}" aria-pressed="${e.bristol===i+1}"><b>${i+1}</b><span>${d}</span></button>`).join('')}</div>
  <p class="hint">1–2 : plutôt constipé · 3–5 : normal · 6–7 : plutôt diarrhée</p></div>
  <div class="chips"><button type="button" class="chip" id="b-strain" aria-pressed="${!!e.strain}">Effort / évacuation incomplète</button><button type="button" class="chip" id="b-blood" aria-pressed="${!!e.blood}">Sang dans les selles</button></div>
  ${tsField(e.ts)}
  <label class="field"><span class="label">Note (facultatif)</span><textarea id="f-note" rows="2" placeholder="Couleur, douleur, mucus…">${esc(e.note)}</textarea></label>
  ${actions(ex)}`,root=>{
  root.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;
   if(b.dataset.b){e.bristol=+b.dataset.b;$$('.bopt',root).forEach(o=>o.setAttribute('aria-pressed',o===b))}
   else if(b.id==='b-strain'){e.strain=!e.strain;b.setAttribute('aria-pressed',e.strain)}
   else if(b.id==='b-blood'){e.blood=!e.blood;b.setAttribute('aria-pressed',e.blood)}
   else if(b.id==='f-save'){if(!e.bristol){toast('Choisis un type sur l’échelle de Bristol.');return}upsert('stools',{id:ex?ex.id:uid(),ts:fromLocalInput($('#f-ts',root).value)||e.ts,bristol:e.bristol,strain:e.strain,blood:e.blood,note:$('#f-note',root).value.trim()});closeSheet();toast(e.blood?'Noté. Signale ce saignement à ton médecin.':'Noté',e.blood?'surprise':undefined);render()}
   else if(b.id==='f-del'){armDelete(b,()=>removeRec('stools',ex.id))}});
 });
}
function treatSheet(id){
 const ex=S.treatments.find(t=>t.id===id);
 const e=ex?{...ex,times:[...ex.times],mode:ex.mode||'fixed'}:{name:'',dose:'',times:['08:00','20:00'],start:dayKey(Date.now()),days:14,note:'',mode:'fixed'};
 openSheet(`${head(ex?'Modifier le traitement':'Nouveau traitement')}
  <div class="chips" id="t-mode"><button type="button" class="chip" data-mode="fixed" aria-pressed="${e.mode!=='prn'}">À heures fixes</button><button type="button" class="chip" data-mode="prn" aria-pressed="${e.mode==='prn'}">À la demande</button></div>
  <label class="field"><span class="label">Nom</span><input type="text" id="t-name" list="t-list" value="${esc(e.name)}" placeholder="Ex. Rifaximine, Macrogol"><datalist id="t-list">${[...TREAT_SUGG,...PRN_SUGG].map(s=>`<option value="${esc(s)}">`).join('')}</datalist></label>
  <div class="watch" id="t-watch" hidden></div>
  <label class="field"><span class="label">Dose (facultatif)</span><input type="text" id="t-dose" value="${esc(e.dose)}" placeholder="Ex. 550 mg, 1 sachet"></label>
  <div class="stack" id="t-fixed" ${e.mode==='prn'?'hidden':''}>
   <div class="field"><span class="label">Heures de prise</span><div class="times" id="t-times"></div><button type="button" class="btn ghost small" id="t-addtime">${I.plus} Ajouter une prise</button></div>
   <label class="field"><span class="label">Durée (jours)</span><input type="number" id="t-days" min="1" max="365" inputmode="numeric" value="${e.days||14}" ${e.days?'':'disabled'}></label>
   <label class="check"><input type="checkbox" id="t-cont" ${e.days?'':'checked'}> En continu, sans date de fin</label>
  </div>
  <label class="field"><span class="label">Début</span><input type="date" id="t-start" value="${esc(e.start)}"></label>
  <label class="field"><span class="label">Consigne (facultatif)</span><textarea id="f-note" rows="2" placeholder="Ex. pendant le repas, le soir au coucher…">${esc(e.note)}</textarea></label>
  ${actions(ex)}`,root=>{
  const draw=()=>{$('#t-times',root).innerHTML=e.times.map((t,i)=>`<div class="time-row"><input type="time" value="${esc(t)}" data-ti="${i}" aria-label="Prise ${i+1}">${e.times.length>1?`<button type="button" class="x" data-rmt="${i}" aria-label="Retirer cette prise">${I.x}</button>`:''}</div>`).join('')};
  const watch=()=>{const w=watchFor($('#t-name',root).value),el=$('#t-watch',root);el.hidden=!w.length;el.innerHTML=w.map(esc).join('<br>')};
  root.addEventListener('input',ev=>{if(ev.target.id==='t-name')watch()});
  root.addEventListener('change',ev=>{if(ev.target.dataset.ti!=null)e.times[+ev.target.dataset.ti]=ev.target.value;if(ev.target.id==='t-cont')$('#t-days',root).disabled=ev.target.checked});
  root.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;
   if(b.dataset.mode){e.mode=b.dataset.mode;$$('#t-mode .chip',root).forEach(c=>c.setAttribute('aria-pressed',c===b));$('#t-fixed',root).hidden=e.mode==='prn'}
   else if(b.id==='t-addtime'){e.times.push('13:00');draw()}
   else if(b.dataset.rmt!=null){e.times.splice(+b.dataset.rmt,1);draw()}
   else if(b.id==='f-save'){
    $$('[data-ti]',root).forEach(inp=>e.times[+inp.dataset.ti]=inp.value);
    const name=$('#t-name',root).value.trim();if(!name){toast('Donne un nom au traitement.');return}
    const prn=e.mode==='prn';const times=prn?[]:[...new Set(e.times.filter(Boolean))].sort();if(!prn&&!times.length){toast('Ajoute au moins une heure de prise.');return}
    const cont=$('#t-cont',root).checked,days=prn||cont?0:Math.max(1,Math.min(365,parseInt($('#t-days',root).value,10)||14));
    upsert('treatments',{id:ex?ex.id:uid(),name,dose:$('#t-dose',root).value.trim(),times,start:$('#t-start',root).value||dayKey(Date.now()),days,note:$('#f-note',root).value.trim(),mode:prn?'prn':'fixed'});
    closeSheet();toast(ex?'Traitement modifié':'Traitement ajouté');tab='cure';render()}
   else if(b.id==='f-del'){armDelete(b,()=>{removeRec('treatments',ex.id);for(const k of Object.keys(S.doses))if(k.startsWith(ex.id+'|'))delete S.doses[k];S.prn=S.prn.filter(p=>p.tid!==ex.id);save()})}});
  draw();watch();
 });
}
function prnSheet(id){
 const ex=S.prn.find(p=>p.id===id);if(!ex)return;const t=tById(ex.tid);
 openSheet(`${head(esc(t?t.name:'Prise'))}<p class="muted">Prise à la demande${t&&t.dose?' · '+esc(t.dose):''}</p>${tsField(ex.ts)}${actions(ex)}`,root=>{
  root.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;
   if(b.id==='f-save'){upsert('prn',{...ex,ts:fromLocalInput($('#f-ts',root).value)||ex.ts});closeSheet();toast('Prise modifiée');render()}
   else if(b.id==='f-del'){armDelete(b,()=>removeRec('prn',ex.id))}});
 });
}
function sssSheet(){
 const e={painYes:null,pain:50,painDays:0,distYes:null,dist:50,unsat:50,impact:50};
 const yn=(k,q)=>`<div class="field"><span class="label">${q}</span><div class="chips"><button type="button" class="chip" data-yn="${k}" data-v="1" aria-pressed="false">Oui</button><button type="button" class="chip" data-yn="${k}" data-v="0" aria-pressed="false">Non</button></div></div>`;
 const sl=(k,l,lo,hi,max=100,step=5,hidden=false)=>`<div class="slider" id="w-${k}" ${hidden?'hidden':''}><div class="slider-top"><label for="q-${k}">${l}</label><output id="v-${k}">${e[k]}</output></div><input type="range" min="0" max="${max}" step="${step}" id="q-${k}" value="${e[k]}"><div class="scale"><span>${lo}</span><span>${hi}</span></div></div>`;
 openSheet(`${head('Questionnaire de la semaine')}<p class="small muted">IBS-SSS, sur les 10 derniers jours. Réponds au feeling, il n’y a pas de bonne réponse.</p>
  ${yn('painYes','As-tu des douleurs au ventre ?')}${sl('pain','Intensité de la douleur','Aucune','Très forte',100,5,true)}
  ${sl('painDays','Jours avec douleur, sur les 10 derniers','0','10',10,1)}
  ${yn('distYes','As-tu le ventre gonflé ou tendu ?')}${sl('dist','Intensité du gonflement','Aucun','Très fort',100,5,true)}
  ${sl('unsat','Insatisfaction de ton transit','Très satisfaite','Pas du tout')}
  ${sl('impact','Gêne dans ta vie quotidienne','Aucune','Énorme')}
  <div class="tile" style="background:var(--accent-soft)"><span class="label">Score</span><div><b id="sss-total">0</b> <span class="muted">/ 500</span> <span id="sss-cat" class="pill"></span></div></div>
  <div class="sheet-actions"><button class="btn primary" id="f-save">Enregistrer</button></div>`,root=>{
  const calc=()=>{const t=(e.painYes?e.pain:0)+e.painDays*10+(e.distYes?e.dist:0)+e.unsat+e.impact;$('#sss-total',root).textContent=t;const [l,c]=sssCat(t),p=$('#sss-cat',root);p.className='pill '+c;p.textContent=l;return t};
  root.addEventListener('input',ev=>{const id=ev.target.id;if(id&&id.startsWith('q-')){const k=id.slice(2);e[k]=+ev.target.value;$('#v-'+k,root).textContent=ev.target.value;calc()}});
  root.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;
   if(b.dataset.yn){const k=b.dataset.yn;e[k]=b.dataset.v==='1';$$(`[data-yn="${k}"]`,root).forEach(x=>x.setAttribute('aria-pressed',x===b));$('#w-'+(k==='painYes'?'pain':'dist'),root).hidden=!e[k];calc()}
   else if(b.id==='f-save'){if(e.painYes==null||e.distYes==null){toast('Ajoute une réponse aux deux questions oui ou non.');return}const total=calc();upsert('sss',{id:uid(),ts:Date.now(),...e,total});closeSheet();toast(`Score : ${total} sur 500`);render()}});
  calc();
 });
}
function applyParsed(e,p){e.points=p.times.map((t,i)=>({t,h2:p.h2&&p.h2[i]!=null?p.h2[i]:null,ch4:p.ch4&&p.ch4[i]!=null?p.ch4[i]:null}));if(p.date)e.date=p.date;e.substrate=p.substrate;if(p.conclusion&&!e.conclusion)e.conclusion=p.conclusion}
const fmtSize=n=>n>=1e6?fmtNum(n/1e6)+' Mo':Math.max(1,Math.round(n/1e3))+' Ko';
function testSheet(id,pre={}){
 const ex=S.tests.find(t=>t.id===id);
 const e=ex?JSON.parse(JSON.stringify(ex)):{date:dayKey(Date.now()),substrate:'glucose',lab:'',points:TEST_TIMES.map(t=>({t,h2:null,ch4:null})),conclusion:'',pdf:null};
 const oldPdf=ex&&ex.pdf?ex.pdf.id:null;
 if(pre.pdf)e.pdf=pre.pdf;if(pre.parsed)applyParsed(e,pre.parsed);
 const val=v=>v==null?'':esc(v);
 const grid=()=>`<span class="h">Temps</span><span class="h">H₂</span><span class="h">CH₄</span>${e.points.map((p,i)=>`<span class="small num">${p.t} min</span><input type="number" inputmode="decimal" min="0" max="500" data-pi="${i}" data-k="h2" value="${val(p.h2)}" aria-label="Hydrogène à ${p.t} min"><input type="number" inputmode="decimal" min="0" max="500" data-pi="${i}" data-k="ch4" value="${val(p.ch4)}" aria-label="Méthane à ${p.t} min">`).join('')}`;
 const pdfRow=()=>e.pdf?`<div class="pdfrow">${I.doc}<span class="pdfname">${esc(e.pdf.name)}<br><span class="small muted" style="font-weight:400">${e.pdf.size?fmtSize(e.pdf.size):'PDF'}</span></span><button type="button" class="link" id="x-view">Voir</button><button type="button" class="link" id="x-pdfrm" style="color:var(--bad)">Retirer</button></div>`:`<button type="button" class="btn ghost small" id="x-pdfadd">${I.doc} Joindre le compte rendu PDF</button>`;
 openSheet(`${head(ex?'Modifier le test':'Test respiratoire')}
  ${pre.note?`<div class="watch">${pre.note}</div>`:''}
  <div class="field"><span class="label">Compte rendu</span><div id="x-pdfbox">${pdfRow()}</div><div id="x-pv" class="pv" hidden></div><input type="file" id="x-pdf" accept="application/pdf,.pdf" hidden></div>
  <label class="field"><span class="label">Date du test</span><input type="date" id="x-date" value="${esc(e.date)}"></label>
  <div class="field"><span class="label">Substrat avalé</span><div class="chips" id="x-sub"><button type="button" class="chip" data-sub="glucose" aria-pressed="${e.substrate==='glucose'}">Glucose</button><button type="button" class="chip" data-sub="lactulose" aria-pressed="${e.substrate==='lactulose'}">Lactulose</button></div></div>
  <label class="field"><span class="label">Laboratoire (facultatif)</span><input type="text" id="x-lab" value="${esc(e.lab)}"></label>
  <div class="field"><span class="label">Valeurs en ppm</span><div class="gas-grid" id="x-grid">${grid()}</div><p class="hint">Recopie le tableau du compte rendu si les valeurs ne sont pas remplies. Laisse vide les temps non mesurés.</p></div>
  <label class="field"><span class="label">Conclusion du compte rendu</span><textarea id="x-conc" rows="2" placeholder="Ex. Test positif pour une prolifération de méthanogènes (IMO)">${esc(e.conclusion)}</textarea></label>
  ${actions(ex)}`,root=>{
  const readGrid=()=>$$('[data-pi]',root).forEach(inp=>{const v=inp.value.trim().replace(',','.');e.points[+inp.dataset.pi][inp.dataset.k]=v===''||isNaN(+v)?null:+v});
  const readFields=()=>{readGrid();e.date=$('#x-date',root).value||e.date;e.lab=$('#x-lab',root).value.trim();e.conclusion=$('#x-conc',root).value.trim()};
  const redraw=()=>{$('#x-grid',root).innerHTML=grid();$('#x-pdfbox',root).innerHTML=pdfRow();$('#x-date',root).value=e.date;$('#x-conc',root).value=e.conclusion;$$('#x-sub .chip',root).forEach(c=>c.setAttribute('aria-pressed',c.dataset.sub===e.substrate))};
  $('#x-pdf',root).addEventListener('change',async ev=>{const f=ev.target.files[0];ev.target.value='';if(!f)return;readFields();toast('Lecture du PDF…');const r=await ingestPdf(f);if(!r)return;
   if(e.pdf&&e.pdf.id!==oldPdf)FDB.del(e.pdf.id).catch(()=>{});e.pdf=r.pdf;
   if(r.parsed&&!e.points.some(p=>p.h2!=null||p.ch4!=null)){applyParsed(e,r.parsed);toast('Valeurs lues dans le PDF')}else toast('PDF joint');redraw()});
  root.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;
   if(b.dataset.sub){e.substrate=b.dataset.sub;$$('#x-sub .chip',root).forEach(c=>c.setAttribute('aria-pressed',c===b))}
   else if(b.id==='x-pdfadd'){$('#x-pdf',root).click()}
   else if(b.id==='x-view'){const box=$('#x-pv',root);box.hidden=!box.hidden;if(!box.hidden)renderPdfInto(box,e.pdf.id)}
   else if(b.id==='x-pdfrm'){$('#x-pv',root).hidden=true;if(e.pdf.id!==oldPdf)FDB.del(e.pdf.id).catch(()=>{});e.pdf=null;$('#x-pdfbox',root).innerHTML=pdfRow()}
   else if(b.id==='f-save'){readFields();
    if(!e.points.some(p=>p.h2!=null||p.ch4!=null)){toast('Ajoute au moins une valeur de gaz.');return}
    upsert('tests',{id:ex?ex.id:uid(),date:e.date,substrate:e.substrate,lab:e.lab,points:e.points,conclusion:e.conclusion,pdf:e.pdf||null});
    if(oldPdf&&(!e.pdf||e.pdf.id!==oldPdf))FDB.del(oldPdf).catch(()=>{});
    closeSheet();toast(ex?'Test modifié':'Test ajouté');render()}
   else if(b.id==='f-del'){armDelete(b,()=>{removeRec('tests',ex.id);if(oldPdf)FDB.del(oldPdf).catch(()=>{})})}});
 });
}

/* ---------- PDF des comptes rendus ---------- */
const FDB=(()=>{let dbp;const open=()=>dbp||(dbp=new Promise((res,rej)=>{const r=indexedDB.open('ventre-leger-files',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>res(r.result);r.onerror=()=>{dbp=null;rej(r.error)}}));
 const tx=async(mode,fn)=>{const db=await open();return new Promise((res,rej)=>{const t=db.transaction('files',mode),q=fn(t.objectStore('files'));t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})};
 return{put:(id,v)=>tx('readwrite',st=>st.put(v,id)),get:id=>tx('readonly',st=>st.get(id)),del:id=>tx('readwrite',st=>st.delete(id)),keys:()=>tx('readonly',st=>st.getAllKeys())}})();
let pdfjsP;
function loadPdfJs(){return pdfjsP||(pdfjsP=new Promise((res,rej)=>{if(window.pdfjsLib){pdfjsLib.GlobalWorkerOptions.workerSrc='pdf.worker.min.js';return res(pdfjsLib)}const sc=document.createElement('script');sc.src='pdf.min.js';sc.onload=()=>{pdfjsLib.GlobalWorkerOptions.workerSrc='pdf.worker.min.js';res(pdfjsLib)};sc.onerror=()=>{pdfjsP=null;rej(new Error('pdfjs'))};document.head.appendChild(sc)}))}
async function pdfText(buf){const lib=await loadPdfJs();const doc=await lib.getDocument({data:buf,isEvalSupported:false,enableXfa:false}).promise;let t='';for(let i=1;i<=doc.numPages;i++){const pg=await doc.getPage(i);const c=await pg.getTextContent();t+=c.items.map(x=>x.str).join(' ')+'\n'}return t}
function parseBreath(text){
 const T=String(text).slice(0,200000).replace(/\s+/g,' ');
 const tm=T.match(/(?:\bT\s?-?\d{1,3}\b\s*){6,40}/);if(!tm)return null;
 const times=[...tm[0].matchAll(/T\s?(-?\d{1,3})/g)].map(m=>+m[1]).slice(0,40),n=times.length;
 const row=label=>{const re=new RegExp('(?:^|[^+\\w])'+label+'\\s*(?:\\(ppm\\))?\\s+((?:\\d+(?:[.,]\\d+)?\\s+){'+(n-1)+'}\\d+(?:[.,]\\d+)?)');const m=T.match(re);return m?m[1].trim().split(/\s+/).map(v=>+v.replace(',','.')):null};
 const h2=row('H2'),ch4=row('CH4');if(!h2&&!ch4)return null;
 const dm=T.match(/date de l['’]examen\s*:?\s*(\d{2})\/(\d{2})\/(\d{4})/i)||T.match(/examen[^0-9]{0,30}(\d{2})\/(\d{2})\/(\d{4})/i);
 const concl=(T.match(/test respiratoire (?:positif|n[ée]gatif)[^.(]{0,100}(?:\([^)]{0,20}\))?/i)||[])[0];
 return{times,h2,ch4,date:dm?`${dm[3]}-${dm[2]}-${dm[1]}`:null,substrate:/lactulose/i.test(T)?'lactulose':'glucose',conclusion:concl?cap(concl.trim()):''};
}
async function ingestPdf(f){
 if(!f)return null;if(f.size>20e6){toast('Ce PDF est trop lourd (20 Mo maximum).');return null}
 const buf=await f.arrayBuffer(),id='pdf-'+uid();
 if(String.fromCharCode(...new Uint8Array(buf.slice(0,5)))!=='%PDF-'){toast('Ce fichier n’est pas un vrai PDF.');return null}
 try{await FDB.put(id,{name:f.name,type:'application/pdf',blob:new Blob([buf],{type:'application/pdf'})})}catch(e){toast('Impossible d’enregistrer ce PDF sur cet appareil.');return null}
 let parsed=null;try{parsed=parseBreath(await pdfText(buf.slice(0)))}catch(e){}
 return{pdf:{id,name:f.name,size:f.size},parsed};
}
$('#test-pdf-file').addEventListener('change',async ev=>{
 const f=ev.target.files[0];ev.target.value='';if(!f)return;toast('Lecture du PDF…');
 const r=await ingestPdf(f);if(!r)return;
 const n=r.parsed?r.parsed.times.length:0;
 testSheet(null,{pdf:r.pdf,parsed:r.parsed,note:r.parsed?`J’ai lu ${n} temps de mesure dans le PDF${r.parsed.date?`, test du ${fmtShort(r.parsed.date)}`:''}. <b>Vérifie les valeurs</b> avec le compte rendu avant d’enregistrer.`:'Je n’ai pas réussi à lire les valeurs de ce PDF. Le PDF est joint : touche « Voir » et recopie les valeurs dans le tableau.'});
});
async function renderPdfInto(box,id){
 box.innerHTML='<p class="muted">Chargement…</p>';
 try{const rec=await FDB.get(id);if(!rec)throw 0;const lib=await loadPdfJs();const doc=await lib.getDocument({data:await rec.blob.arrayBuffer(),isEvalSupported:false,enableXfa:false}).promise;box.innerHTML='';
  const w=Math.min(box.clientWidth||340,560),dpr=Math.min(2,window.devicePixelRatio||1);
  for(let i=1;i<=doc.numPages;i++){const pg=await doc.getPage(i),v1=pg.getViewport({scale:1}),vp=pg.getViewport({scale:w/v1.width*dpr}),cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;cv.style.width='100%';cv.setAttribute('aria-label',`Page ${i}`);box.appendChild(cv);await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise}
  return rec;
 }catch(e){box.innerHTML='<p class="empty">Impossible d’afficher ce PDF ici. Utilise « Partager / enregistrer » pour l’ouvrir.</p>';return null}
}
function pdfViewer(id){
 openSheet(`${head('Compte rendu')}<div id="pv" class="pv"></div><div class="sheet-actions"><button class="btn ghost" id="pv-share">Partager / enregistrer</button><button class="btn primary" data-act="close">Fermer</button></div>`,root=>{
  let rec=null;FDB.get(id).then(r=>rec=r).catch(()=>{});
  $('#pv-share',root).onclick=()=>{if(rec)shareFile(rec.blob,rec.name||'compte-rendu.pdf','application/pdf');else toast('Impossible de retrouver ce PDF.')};
  renderPdfInto($('#pv',root),id);
 });
}
const blobToDataURL=b=>new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=rej;fr.readAsDataURL(b)});
function dataURLToBlob(u){const [h,b64]=u.split(',');const type=(h.match(/data:([^;]+)/)||[])[1]||'application/octet-stream';const bin=atob(b64),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type})}
async function restoreFiles(files){
 for(const [id,f0] of Object.entries(V.obj(files))){const f=V.obj(f0);
  if(!/^pdf-[\w-]{1,80}$/.test(id)||typeof f.data!=='string'||!f.data.startsWith('data:application/pdf;base64,')||f.data.length>30e6)continue;
  try{const blob=dataURLToBlob(f.data);const head=new Uint8Array(await blob.slice(0,5).arrayBuffer());if(String.fromCharCode(...head)!=='%PDF-')continue;
   await FDB.put(id,{name:V.str(f.name,120)||'compte-rendu.pdf',type:'application/pdf',blob})}catch(e){}}
}

/* ---------- Rappels Calendrier (.ics) ---------- */
function icsFor(t){
 const e=s=>String(s).replace(/\\/g,'\\\\').replace(/[,;]/g,m=>'\\'+m).replace(/\r\n|\r|\n/g,'\\n');
 const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
 const count=t.days>0?Math.max(1,t.days-Math.max(0,daysBetween(t.start,dayKey(Date.now())))):90;
 const startDay=t.start>dayKey(Date.now())?t.start:dayKey(Date.now());
 const ev=t.times.map((tm,i)=>['BEGIN:VEVENT',`UID:${t.id}-${i}-${startDay}@ventre-leger`,`DTSTAMP:${stamp}`,`DTSTART:${startDay.replace(/-/g,'')}T${tm.replace(':','')}00`,'DURATION:PT10M',`RRULE:FREQ=DAILY;COUNT=${count}`,`SUMMARY:${e(t.name+(t.dose?' '+t.dose:''))}`,`DESCRIPTION:${e(t.note||'Prise à cocher dans Ventre Léger')}`,'BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${e(t.name)}`,'TRIGGER:PT0M','END:VALARM','END:VEVENT'].join('\r\n'));
 return{text:['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Ventre Leger//FR','CALSCALE:GREGORIAN','METHOD:PUBLISH',...ev,'END:VCALENDAR'].join('\r\n'),count,startDay};
}
function icsSheet(id){
 const t=S.treatments.find(x=>x.id===id);if(!t)return;const r=icsFor(t);
 openSheet(`${head('Rappels dans Calendrier')}
  <p>Un événement avec alerte sera créé à chaque prise (<b>${t.times.join(', ')}</b>), chaque jour pendant <b>${r.count} jour${r.count>1?'s':''}</b> à partir du ${fmtShort(r.startDay)}. L’iPhone sonnera comme pour une notification.</p>
  <div class="stack" style="gap:8px"><button class="btn primary" id="i-open">${I.cal} Ajouter au Calendrier</button><button class="btn ghost" id="i-share">Partager le fichier (si rien ne se passe)</button></div>
  <p class="hint">Si tu changes les heures ou la durée plus tard, supprime d’abord ces événements dans l’app Calendrier, puis ajoute les nouveaux.</p>`,root=>{
  const blob=()=>new Blob([r.text],{type:'text/calendar'});
  $('#i-open',root).onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob());document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},5000)};
  $('#i-share',root).onclick=()=>shareFile(blob(),`rappels-${fold(t.name).replace(/[^a-z0-9]+/g,'-')}.ics`,'text/calendar');
 });
}

/* ---------- Fichiers ---------- */
async function shareFile(blob,name,type){
 const file=new File([blob],name,{type});
 if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:name});return}catch(e){if(e&&e.name==='AbortError')return}}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},5000);
}
function backupBlob(files){return new Blob([JSON.stringify({app:'ventre-leger',version:2,savedAt:new Date().toISOString(),data:S,files},null,1)],{type:'application/json'})}
async function backup(){
 const name=`ventre-leger-${dayKey(Date.now())}.json`,ids=S.tests.map(t=>t.pdf&&t.pdf.id).filter(Boolean);
 if(!ids.length){shareFile(backupBlob({}),name,'application/json');return}
 const files={};for(const id of ids){try{const r=await FDB.get(id);if(r)files[id]={name:r.name,type:r.type,data:await blobToDataURL(r.blob)}}catch(e){}}
 const blob=backupBlob(files);
 openSheet(`${head('Sauvegarde prête')}<p>Elle contient toutes tes données et ${Object.keys(files).length} compte${Object.keys(files).length>1?'s':''} rendu${Object.keys(files).length>1?'s':''} PDF (${fmtSize(blob.size)}).</p><div class="sheet-actions"><button class="btn primary" id="b-go">Enregistrer la sauvegarde</button></div>`,root=>{$('#b-go',root).onclick=()=>{shareFile(blob,name,'application/json');closeSheet()}});
}
const MAX_IMPORT=50*1024*1024;
$('#restore-file').addEventListener('change',async ev=>{
 const f=ev.target.files[0];ev.target.value='';if(!f)return;
 if(f.size>MAX_IMPORT){toast('Ce fichier est trop lourd (50 Mo maximum).');return}
 try{const j=V.obj(JSON.parse(await f.text()));const raw=V.obj(j.data||j);const d=sanitize(raw);
  if(j.merge){
   openSheet(`${head('Importer ?')}<p>${esc(V.str(j.label,120)||'Le contenu de ce fichier')} sera ajouté à tes données, sans rien effacer.</p><div class="sheet-actions"><button class="btn ghost" data-act="close">Annuler</button><button class="btn primary" id="r-ok">Importer</button></div>`,root=>{
    $('#r-ok',root).onclick=()=>{if(S.demo){const s=S.settings;S=blank();S.settings=s}
     for(const col of ['tests','meals','symptoms','stools','treatments','weights','sss','prn'])for(const r of d[col])if(!S[col].some(x=>x.id===r.id))S[col].push(r);
     S=sanitize(S);
     if(d.settings&&d.settings.name&&!S.settings.name)S.settings.name=d.settings.name;
     if(d.context){for(const k of d.context.flags)if(!S.context.flags.includes(k))S.context.flags.push(k);if(d.context.note&&!S.context.note)S.context.note=d.context.note}
     if(d.plannedTest&&!S.plannedTest)S.plannedTest=d.plannedTest;
     restoreFiles(j.files);save();closeSheet();toast('Importé');tab='dossier';render()}});
   return;
  }
  if(!Array.isArray(raw.meals)||!Array.isArray(raw.treatments))throw 0;
  openSheet(`${head('Restaurer la sauvegarde ?')}<p>Elle contient ${d.meals.length} repas, ${(d.symptoms||[]).length} ressentis, ${(d.stools||[]).length} selles, ${d.treatments.length} traitements et ${(d.tests||[]).length} tests. Elle remplacera tout ce qui est actuellement dans l’app.</p><div class="sheet-actions"><button class="btn ghost" data-act="close">Annuler</button><button class="btn primary" id="r-ok">Remplacer</button></div>`,root=>{
   $('#r-ok',root).onclick=()=>{S=normalize(d);restoreFiles(j.files);save();closeSheet();toast('Sauvegarde restaurée');render()}});
 }catch(e){toast('Ce fichier n’est pas une sauvegarde Ventre Léger.')}
});

/* ---------- PDF ---------- */
function makePdf(){
 if(!window.jspdf){toast('Le module PDF n’est pas encore chargé. Vérifie la connexion puis réessaie.');return}
 const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:'mm',format:'a4'});
 const L=s=>String(s).replace(/œ/g,'oe').replace(/Œ/g,'OE').replace(/[’‘]/g,"'").replace(/[“”«»]/g,'"').replace(/[–—]/g,'-').replace(/…/g,'...').replace(/≥/g,'>=').replace(/₂/g,'2').replace(/₄/g,'4').replace(/→/g,'->').replace(/[^\x00-\xFF]/g,'');
 const M=16,W=178,ink=[28,28,28],mut=[106,120,132],acc=[48,134,200],red=[200,70,60];let y=18;
 const need=h=>{if(y+h>284){doc.addPage();y=18}};
 const text=(s,{size=10,bold=false,color=ink,x=M,w=W,gap=1.3}={})=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);for(const ln of doc.splitTextToSize(L(s),w)){need(size*.42);doc.text(ln,x,y);y+=size*.42+gap}};
 const H2=t=>{y+=3;text(t,{size:13,bold:true})};
 const days=rangeDays(range),ds=dayStats(days),today=days[days.length-1],from=startOfDay(days[0]);
 text(`Suivi IMO${S.settings.name?' - '+S.settings.name:''}`,{size:18,bold:true,color:acc});
 text(`Du ${fmtLong(days[0])} au ${fmtLong(today)} (${range} jours) - généré le ${new Date().toLocaleDateString('fr-FR')}`,{color:mut});
 const ctx=[...S.context.flags.map(k=>(CONTEXT.find(c=>c[0]===k)||[,''])[1]),S.context.note].filter(Boolean);
 if(ctx.length)text(`Contexte : ${ctx.join(' ; ')}`);
 const al=alerts();if(al.length){H2('Signes à signaler (7 derniers jours)');for(const a of al)text('- '+a,{color:red})}
 // Tests
 const tests=[...S.tests].sort((a,b)=>a.date.localeCompare(b.date));
 if(tests.length){H2('Tests respiratoires');for(const t of tests){const i=testInfo(t);text(`${fmtShort(t.date)} ${noon(t.date).getFullYear()} (${t.substrate})${t.lab?' - '+t.lab:''} : CH4 basal ${i.basC??'-'} ppm, pic ${i.maxC??'-'} ppm ; H2 pic ${i.maxH??'-'} ppm, hausse max ${i.riseH} ppm avant 90 min. ${i.imo?'IMO (CH4 >= 10 ppm).':'CH4 < 10 ppm.'}${i.sibo?' SIBO à hydrogène.':''}`,{bold:true,size:9.5});text(`H2 : ${t.points.map(p=>`${p.t}'=${p.h2??'-'}`).join('  ')}`,{size:8.5,color:mut});text(`CH4 : ${t.points.map(p=>`${p.t}'=${p.ch4??'-'}`).join('  ')}`,{size:8.5,color:mut});if(t.conclusion)text(`Conclusion : ${t.conclusion}`,{size:9})}}
 if(S.plannedTest)text(`Test de contrôle prévu le ${fmtShort(S.plannedTest)}.`);
 // Traitements
 H2('Traitements');
 const tr=S.treatments.filter(t=>t.start<=today&&(t.days===0||addDays(t.start,t.days-1)>=days[0]));
 if(!tr.length)text('Aucun traitement sur la période.',{color:mut});
 for(const t of tr){if(isPrn(t)){const n=S.prn.filter(p=>p.tid===t.id&&p.ts>=from).length;text(`${t.name}${t.dose?' '+t.dose:''} - à la demande - ${n} prise${n>1?'s':''} sur la période${t.note?' - '+t.note:''}`)}else{const o=observance(t,days[0],today);text(`${t.name}${t.dose?' '+t.dose:''} - ${t.times.length}x/jour (${t.times.join(', ')}) - début ${fmtShort(t.start)}${t.days?`, ${t.days} jours`:', en continu'}${o.exp?` - prises cochées ${o.tak}/${o.exp} (${o.pct} %)`:''}${t.note?' - '+t.note:''}`)}}
 const fc={};for(const d of ds)for(const f of d.flags)fc[f]=(fc[f]||0)+1;
 if(Object.keys(fc).length)text(`Effets indésirables et signes notés : ${Object.entries(fc).map(([k,n])=>`${FLAGTXT[k]||k} (${n})`).join(', ')}.`);
 const cw=cureWindow();
 if(cw&&cw.start<=today){const b=periodStats(addDays(cw.start,-14),addDays(cw.start,-1)),du=periodStats(cw.start,cw.end<today?cw.end:today),af=cw.end<today?periodStats(addDays(cw.end,1),today):null;const f=v=>v==null?'-':fmtNum(v);text(`Avant / pendant / après la cure (${cw.names.join(', ')}, du ${fmtShort(cw.start)} au ${fmtShort(cw.end)}) - ressenti /10 : ${f(b.comp)} / ${f(du.comp)} / ${af?f(af.comp):'-'} ; selles par jour : ${f(b.stools)} / ${f(du.stools)} / ${af?f(af.stools):'-'} ; IBS-SSS : ${b.sss==null?'-':Math.round(b.sss)} / ${du.sss==null?'-':Math.round(du.sss)} / ${af&&af.sss!=null?Math.round(af.sss):'-'}.`)}
 // Synthèse
 H2('Synthèse');
 const withSym=ds.filter(d=>d.comp!=null),avg=f=>{const v=withSym.filter(d=>d[f]!=null);return v.length?fmtNum(v.reduce((a,d)=>a+d[f],0)/v.length):'-'};
 const st=ds.flatMap(d=>d.stools);
 text(`Moyennes /10 - ballonnements ${avg('bloating')}, douleur ${avg('pain')}, gaz ${avg('gas')}, fatigue ${avg('fatigue')} (${withSym.length} jours renseignés).`);
 text(`Selles : ${st.length} sur ${range} jours, ${ds.filter(d=>!d.stools.length).length} jours sans selles${st.length?`, Bristol moyen ${fmtNum(st.reduce((a,s)=>a+s.bristol,0)/st.length)}`:''}${st.filter(s=>s.strain).length?`, effort noté ${st.filter(s=>s.strain).length} fois`:''}${st.filter(s=>s.blood).length?`, SANG noté ${st.filter(s=>s.blood).length} fois`:''}.`);
 const ss=S.sss.filter(s=>s.ts>=from).sort((a,b)=>a.ts-b.ts);if(ss.length)text(`Score IBS-SSS (/500) : ${ss.map(s=>`${fmtShort(dayKey(s.ts))} : ${s.total} (${sssCat(s.total)[0].toLowerCase()})`).join(' ; ')}.`);
 const w=[...S.weights].sort((a,b)=>a.date.localeCompare(b.date)).filter(x=>x.date>=addDays(today,-90));if(w.length)text(`Poids : ${w.map(x=>`${fmtShort(x.date)} ${fmtNum(x.kg)} kg`).join(', ')}.`);
 const meals=ds.flatMap(d=>d.meals),kn=meals.filter(m=>mealLevel(m.items)>0);
 text(`Repas : ${meals.length} notés${kn.length?`, dont ${Math.round(kn.filter(m=>mealLevel(m.items)===1).length/kn.length*100)} % à FODMAP bas et ${kn.filter(m=>mealLevel(m.items)===3).length} à FODMAP élevé`:''}.`);
 const F=S.fodmap,ph={elim:'d’élimination',reintro:'de réintroduction',perso:'de personnalisation'}[F.phase];
 if(ph){const res=FGROUPS.filter(([g])=>F.ch[g]&&F.ch[g].result).map(([g,l])=>`${l} : ${FRES[F.ch[g].result][0].toLowerCase()}`);text(`Régime FODMAP : phase ${ph}${F.phase==='elim'&&F.elimStart?` depuis le ${fmtShort(F.elimStart)}`:''}.${res.length?' Réintroduction - '+res.join(', ')+'.':''}`)}
 const dd=ds.map(d=>d.daily),av=k=>{const v=dd.map(x=>x[k]).filter(v=>v!=null);return v.length?fmtNum(v.reduce((a,b)=>a+b,0)/v.length):'-'};
 text(`Hygiène de vie (moyennes) : eau ${av('water')} verres/jour, sommeil ${av('sleep')}/5, calme ${av('calm')}/5. Règles : ${ds.filter(d=>d.period).length} jours sur la période.`);
 const p=pistes(days);if(p&&p.rows.length)text(`Aliments souvent suivis d'un ressenti plus fort (3 à 24 h) : ${p.rows.map(r=>`${r.k} (+${fmtNum(r.d)}, ${r.n} fois)`).join(', ')}.`);
 // Tableau
 H2('Jour par jour');y+=1;
 const cols=[[M,'Date'],[M+28,'Ballon.'],[M+43,'Doul.'],[M+56,'Gaz'],[M+67,'Fatig.'],[M+81,'Selles (Bristol)'],[M+113,'Prises'],[M+128,'Demande'],[M+145,'FODMAP+'],[M+163,'Règles']];
 const row=(vals,bold)=>{need(6);doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(8.5);doc.setTextColor(...(bold?mut:ink));cols.forEach(([x],i)=>doc.text(L(vals[i]),x,y));y+=5};
 row(cols.map(c=>c[1]),true);doc.setDrawColor(226,236,243);doc.line(M,y-3.6,M+W,y-3.6);
 for(const d of [...ds].reverse()){const dq=dosesFor(d.k).filter(x=>x.day<today||x.tm<=hm(Date.now()));const f=v=>v==null?'-':fmtNum(v);
  row([noon(d.k).toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit'}),f(d.bloating),f(d.pain),f(d.gas),f(d.fatigue),d.stools.length?d.stools.map(s=>s.bristol+(s.strain?'*':'')+(s.blood?'!':'')).join(', '):'aucune',dq.length?`${dq.filter(x=>x.taken).length}/${dq.length}`:'-',d.prn?String(d.prn):'-',d.high?String(d.high):'-',d.period?'oui':''])}
 text('* effort ou évacuation incomplète   ! sang dans les selles',{size:8,color:mut});
 // Repas & notes
 H2('Repas et notes');
 for(const d of [...ds].reverse()){
  const es=entriesOn(d.k).sort((a,b)=>a.ts-b.ts);if(!es.length)continue;
  y+=1.5;text(cap(fmtLong(d.k)),{bold:true,size:10});
  for(const e of es){
   if(e.kind==='meal')text(`${hm(e.ts)}  ${mealLabel(e.type)} : ${e.items.join(', ')||'-'}${e.items.length?` (FODMAP ${LEVEL_TXT[mealLevel(e.items)]})`:''}${e.note?' - '+e.note:''}`,{x:M+4,w:W-4,size:9});
   else if(e.kind==='prn'){const t=tById(e.tid);text(`${hm(e.ts)}  ${t?t.name:'Traitement'} (à la demande)`,{x:M+4,w:W-4,size:9,color:mut})}
   else if(e.kind==='sym'&&(e.note||(e.flags||[]).length))text(`${hm(e.ts)}  Ressenti : ${[...(e.flags||[]).map(f=>FLAGTXT[f]||f),e.note].filter(Boolean).join(', ')}`,{x:M+4,w:W-4,size:9,color:mut});
   else if(e.kind==='stool'&&(e.note||e.blood))text(`${hm(e.ts)}  Selles : ${[e.blood?'sang':'',e.note].filter(Boolean).join(', ')}`,{x:M+4,w:W-4,size:9,color:mut});
  }
 }
 const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(...mut);doc.text(L(`Ventre Léger - page ${i}/${n}`),M,292)}
 shareFile(doc.output('blob'),`suivi-imo-${today}.pdf`,'application/pdf');
}

/* ---------- Exemple ---------- */
function makeDemo(){
 let seed=11;const rnd=()=>(seed=seed*16807%2147483647)/2147483647;const pick=a=>a[Math.floor(rnd()*a.length)];
 const d=blank();d.demo=true;d.settings=S.settings;const now=Date.now(),today=dayKey(now);const start=addDays(today,-9);
 d.treatments=[{id:'demo-rif',name:'Rifaximine',dose:'550 mg',times:['08:00','13:00','20:00'],start,days:14,note:'Exemple : pendant le repas'},{id:'demo-neo',name:'Néomycine',dose:'500 mg',times:['08:00','20:00'],start,days:14,note:''}];
 const M={'petit-dej':[8,[["flocons d'avoine",'myrtilles','lait sans lactose'],['pain au levain','beurre','œufs'],['yaourt sans lactose','kiwi']]],dejeuner:[12.5,[['riz','poulet','courgettes'],['quinoa','saumon','épinards'],['pâtes de blé','sauce tomate','ail'],['pommes de terre','haricots verts','bœuf']]],collation:[16.5,[['banane'],['amandes'],['pomme']]],diner:[19.75,[['soupe de carottes','œufs'],['riz','tofu ferme','poivron rouge'],['pizza','oignon','champignons'],['poisson','patate douce','carottes']]]};
 for(let i=13;i>=0;i--){const k=addDays(today,-i);const base=startOfDay(k);let high=0;
  for(const [type,[h,opts]] of Object.entries(M)){if(type==='collation'&&rnd()<.4)continue;const ts=base+(h+rnd()*.6)*36e5;if(ts>now)continue;const items=pick(opts);if(mealLevel(items)===3)high++;d.meals.push({id:uid()+i+type,ts,type,items:[...items],note:''})}
  const cure=k>=start?Math.min(1,(daysBetween(start,k)+1)/10):0;
  const lvl=v=>Math.max(0,Math.min(10,Math.round(v)));
  for(const hh of [15,21.5]){const ts=base+hh*36e5;if(ts>now||(hh===15&&rnd()<.5))continue;const b=5.5-3*cure+high*2.2+rnd()*1.2-.6;d.symptoms.push({id:uid()+i+hh,ts,bloating:lvl(b),pain:lvl(b-2+rnd()),gas:lvl(b-.5+rnd()),fatigue:lvl(4.5-1.5*cure+rnd()*2),note:hh===21.5&&high?'Ventre gonflé en soirée':''})}
  const every=cure>.5?1:2;if(i%every===0){const ts=base+(7.5+rnd())*36e5;if(ts<=now)d.stools.push({id:uid()+'s'+i,ts,bristol:cure>.5?pick([3,4,4,5]):pick([1,2,2,3]),strain:cure<=.5&&rnd()<.6,note:''})}
  for(const t of d.treatments)if(activeOn(t,k))for(const tm of t.times){const ts=new Date(k+'T'+tm+':00').getTime()+rnd()*20*6e4;if(ts<=now&&rnd()<.93)d.doses[`${t.id}|${k}|${tm}`]=ts}
 }
 d.treatments.push({id:'demo-mac',name:'Macrogol',dose:'1 sachet',times:[],start:addDays(today,-20),days:0,note:'Si pas de selles depuis 2 jours',mode:'prn'});
 for(const i of [12,10,7])d.prn.push({id:'demo-p'+i,tid:'demo-mac',ts:startOfDay(addDays(today,-i))+8*36e5});
 for(let i=13;i>=0;i--){const k=addDays(today,-i);d.daily[k]={water:4+Math.floor(rnd()*4),sleep:2+Math.floor(rnd()*3),calm:2+Math.floor(rnd()*3),act:1+Math.floor(rnd()*3),period:i>=3&&i<=6}}
 if(d.daily[today]){delete d.daily[today].sleep;delete d.daily[today].calm;delete d.daily[today].act}
 d.tests=[{id:'demo-test',date:addDays(today,-12),substrate:'glucose',lab:'Exemple',points:TEST_TIMES.map((t,i)=>({t,h2:[2,3,2,4,3,3,2,3,2,2,3,2,2,2][i],ch4:[18,17,24,22,20,19,23,21,18,17,19,20,18,21][i]})),conclusion:'Exemple : test positif pour une prolifération de méthanogènes (IMO)'}];
 d.plannedTest=addDays(today,40);
 d.sss=[{id:'demo-s1',ts:startOfDay(addDays(today,-11))+20*36e5,painYes:true,pain:55,painDays:6,distYes:true,dist:70,unsat:75,impact:60,total:320},{id:'demo-s2',ts:startOfDay(addDays(today,-4))+20*36e5,painYes:true,pain:35,painDays:3,distYes:true,dist:45,unsat:50,impact:35,total:195}];
 d.weights=[{id:'demo-w1',date:addDays(today,-12),kg:58.6},{id:'demo-w2',date:addDays(today,-5),kg:58.1}];
 d.context={flags:['gastro','constip'],note:''};
 d.fodmap={phase:'elim',elimStart:addDays(today,-10),ch:{}};
 const sx=d.symptoms.filter(s=>s.ts>=startOfDay(start));if(sx[1])sx[1].flags=['nausee'];if(sx[4])sx[4].flags=['gout','tete'];
 return d;
}

/* ---------- Actions ---------- */
let wipeArmed=0;
document.addEventListener('click',ev=>{
 const el=ev.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,today=dayKey(Date.now());
 switch(a){
  case 'tab':tab=el.dataset.tab;render();window.scrollTo(0,0);break;
  case 'add-meal':mealSheet();break;
  case 'add-sym':symSheet();break;
  case 'add-stool':stoolSheet();break;
  case 'add-treat':treatSheet();break;
  case 'edit-treat':treatSheet(el.dataset.id);break;
  case 'edit':({meal:mealSheet,sym:symSheet,stool:stoolSheet,prn:prnSheet})[el.dataset.kind](el.dataset.id);break;
  case 'close':closeSheet();break;
  case 'dose':{const k=el.dataset.key;justKey=k;justOn=!S.doses[k];if(S.doses[k])delete S.doses[k];else{const[,day,tm]=k.split('|');S.doses[k]=day===today?Date.now():new Date(day+'T'+tm+':00').getTime()}save();render();break}
  case 'prn':{const t=tById(el.dataset.id);if(!t)break;burst(el);S.prn.push({id:uid(),tid:t.id,ts:Date.now()});save();render();toast(`${t.name} noté`);break}
  case 'daily':{const d=S.daily[today]=S.daily[today]||{},f=el.dataset.f,v=+el.dataset.v;if(f==='water')d.water=Math.max(0,(d.water||0)+v);else if(f==='period')d.period=!d.period;else if(d[f]===v)delete d[f];else d[f]=v;save();render();break}
  case 'sss':sssSheet();break;
  case 'add-test':testSheet();break;
  case 'test-pdf':$('#test-pdf-file').click();break;
  case 'pdf-view':pdfViewer(el.dataset.id);break;
  case 'edit-test':testSheet(el.dataset.id);break;
  case 'add-weight':{const v=parseFloat(($('#w-kg').value||'').replace(',','.'));if(!(v>=20&&v<=250)){toast('Donne un poids valide, en kg.');break}S.weights=S.weights.filter(x=>x.date!==today);S.weights.push({id:uid(),date:today,kg:Math.round(v*10)/10});save();render();toast('Poids noté');break}
  case 'del-weight':removeRec('weights',el.dataset.id);render();toast('Supprimé');break;
  case 'ctx':{const k=el.dataset.k,f=S.context.flags;S.context.flags=f.includes(k)?f.filter(x=>x!==k):[...f,k];save();render();break}
  case 'fstart':S.fodmap.ch[el.dataset.g]={start:today};save();render();toast('Jour 1 : une petite portion');break;
  case 'fres':{const c=S.fodmap.ch[el.dataset.g];if(c){burst(el);c.result=+el.dataset.v;save();render();toast('Noté. Fais 2 à 3 jours de pause avant le groupe suivant.')}break}
  case 'freset':delete S.fodmap.ch[el.dataset.g];save();render();break;
  case 'more':journalDays+=14;render();break;
  case 'range':range=+el.dataset.n;render();break;
  case 'ics':icsSheet(el.dataset.id);break;
  case 'pdf':makePdf();break;
  case 'backup':backup();break;
  case 'restore':$('#restore-file').click();break;
  case 'demo':if(S.meals.length&&!S.demo){toast('Efface d’abord tes données pour voir l’exemple.');break}S=makeDemo();save();tab='today';render();toast('Exemple chargé');break;
  case 'clear-demo':{const s=S.settings;S=blank();S.settings=s;save();render();toast('Exemple effacé');break}
  case 'wipe':if(Date.now()-wipeArmed<4000){const s=S.settings;S=blank();S.settings=s;save();wipeArmed=0;render();toast('Tout a été effacé')}else{wipeArmed=Date.now();el.textContent='Toucher à nouveau pour confirmer';setTimeout(()=>{if(el.isConnected)el.textContent='Tout effacer'},4000)}break;
 }
});
document.addEventListener('change',ev=>{
 const id=ev.target.id,v=ev.target.value;
 if(id==='set-name'){S.settings.name=v.trim();save();toast('Enregistré')}
 if(id==='set-gap'){S.settings.gap=+v;save();toast('Enregistré')}
 if(id==='set-plan'){S.plannedTest=v;save();toast('Date enregistrée')}
 if(id==='set-phase'){S.fodmap.phase=v;if(v==='elim'&&!S.fodmap.elimStart)S.fodmap.elimStart=dayKey(Date.now());save();render()}
 if(id==='set-elim'){S.fodmap.elimStart=v;save();render()}
 if(id==='set-ctx'){S.context.note=v.trim();save();toast('Enregistré')}
});
let tt;function toast(m,pose){if(!pose)pose=/^(Ajoute|Choisis|Donne|Impossible|Ce fichier|Ce PDF|Efface d|Le module)/.test(m)?'surprise':/effac|Supprim/i.test(m)?'coucou':'pouce';const t=$('#toast');t.innerHTML=`<img src="${MS(pose)}" alt=""><span>${esc(m)}</span>`;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2300)}



/* ---------- Petits effets ---------- */
function burst(el){if(!el||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,cols=['#3086C8','#F9F181','#8FD3B8','#F6A9C2','#FCB98E','#96C4E3'];
 for(let i=0;i<12;i++){const d=document.createElement('span'),a=i/12*Math.PI*2+Math.random()*.4,dist=26+Math.random()*24;d.className='burst';d.style.left=x+'px';d.style.top=y+'px';d.style.background=cols[i%cols.length];d.style.setProperty('--bx',(Math.cos(a)*dist).toFixed(1)+'px');d.style.setProperty('--by',(Math.sin(a)*dist).toFixed(1)+'px');if(i%3===0){d.style.borderRadius='2px';d.style.width=d.style.height='6px'}document.body.appendChild(d);setTimeout(()=>d.remove(),800)}}
function countUp(root){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;$$('.tile b',root).forEach(b=>{const m=b.textContent.match(/^(\d+)(,(\d))?(.*)$/);if(!m)return;const target=parseFloat(m[1]+(m[3]?'.'+m[3]:'')),dec=m[3]?1:0,suf=m[4],t0=performance.now()+250;const step=now=>{const k=Math.min(1,Math.max(0,(now-t0)/700)),e=1-Math.pow(1-k,3);b.textContent=fmtNum(target*e,dec).replace('.',',')+suf;if(k<1)requestAnimationFrame(step)};b.textContent=fmtNum(0,dec)+suf;requestAnimationFrame(step)})}

/* ---------- Fond vivant ---------- */
(function(){
 const petal=(n,a)=>{let d='';for(let i=0;i<=120;i++){const t=i/120*Math.PI*2,r=1-a+a*Math.cos(n*t);d+=(i?'L':'M')+(50+46*r*Math.cos(t)).toFixed(1)+' '+(50+46*r*Math.sin(t)).toFixed(1)}return d+'Z'};
 const SH={
  flower:c=>`<path d="${petal(6,.12)}" fill="${c}"/><circle cx="50" cy="50" r="12" fill="#fff" opacity=".7"/>`,
  blob:c=>`<path d="${petal(3,.08)}" fill="${c}"/>`,
  dot:c=>`<circle cx="50" cy="50" r="44" fill="${c}"/>`,
  ring:c=>`<circle cx="50" cy="50" r="38" fill="none" stroke="${c}" stroke-width="9"/>`,
  wave:c=>`<path d="M6 55 Q 20 35 34 55 T 62 55 T 94 55" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"/>`,
  spark:c=>`<path d="M50 6 C54 38 62 46 94 50 C62 54 54 62 50 94 C46 62 38 54 6 50 C38 46 46 38 50 6Z" fill="${c}"/>`
 };
 const C={sky:'#BFDDF2',sun:'#F9F181',mint:'#BDE8D6',peach:'#FCD3B6',rose:'#F6C9D9'};
 const L=[['flower','sky',-6,14,130,26],['spark','sun',82,9,34,18],['blob','mint',78,30,170,30],['dot','peach',6,46,54,22],['wave','rose',62,52,90,20],
  ['flower','sun',-10,70,110,28],['ring','sky',80,72,70,24],['spark','rose',30,88,26,16],['blob','peach',70,92,140,32],['dot','mint',44,24,22,14],['spark','sky',12,32,22,15],['flower','rose',86,118,90,26],['wave','mint',4,120,80,22],['blob','sky',40,140,120,30]];
 $('#bg').innerHTML=L.map(([k,c,x,y,sz,d],i)=>`<div class="par" data-depth="${(0.05+(i%4)*0.04).toFixed(2)}" style="left:${x}%;top:${y}%;width:${sz}px;height:${sz}px"><svg viewBox="0 0 100 100" style="--d:${d}s;--dl:${-i*2.3}s;--mx:${(i%2?1:-1)*(10+i%5*4)}px;--my:${(i%3?-1:1)*(12+i%4*5)}px;--r:${(i%2?1:-1)*(12+i*3)}deg">${SH[k](C[c])}</svg></div>`).join('');
 const pars=$$('#bg .par');let tick=false;
 const onScroll=()=>{if(tick)return;tick=true;requestAnimationFrame(()=>{const y=window.scrollY;for(const p of pars)p.style.transform=`translateY(${(-y*p.dataset.depth).toFixed(1)}px)`;tick=false})};
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)window.addEventListener('scroll',onScroll,{passive:true});
})();

/* ---------- Démarrage ---------- */
{let raw=null;try{raw=localStorage.getItem(KEY)}catch(e){}
 if(raw){try{S=sanitize(JSON.parse(raw))}catch(e){try{localStorage.setItem(KEY+'-illisible-'+Date.now(),raw)}catch(_){}S=blank();setTimeout(()=>toast('Tes données n’ont pas pu être relues. Une copie a été gardée.'),800)}}}
/*BOOT*/
try{FDB.keys().then(keys=>{const used=new Set(S.tests.map(t=>t.pdf&&t.pdf.id).filter(Boolean));for(const k of keys)if(!used.has(k))FDB.del(k)}).catch(()=>{})}catch(e){}
render();
setInterval(()=>{if(tab==='today'&&$('#sheet').hidden)render()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&$('#sheet').hidden)render()});
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
