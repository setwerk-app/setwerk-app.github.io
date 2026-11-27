/* Setwerk – Erweiterungen
   Home · Gespeicherte Sets · Gigs + Packliste · Library Health · Live-Assistent ·
   Kapitel (ganze Nacht) · DJ-Schule · Musikordner (Vorhören, Übergang anhören, Energie aus Audio) */

/* ================= Helpers ================= */
const todayISO=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const daysUntil=iso=>Math.round((new Date(iso+'T00:00')-new Date(todayISO()+'T00:00'))/864e5);
const relDay=n=>n===0?'heute':n===1?'morgen':n===-1?'gestern':n>0?`in ${n} Tagen`:`vor ${-n} Tagen`;
const MON=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
function goTab(t){const b=$(`nav button[data-tab="${t}"]`);if(b)b.click()}
function armed(btn,fn,label='Sicher? Nochmal klicken'){
  if(btn.dataset.armed){fn();return}
  const o=btn.textContent;btn.dataset.armed='1';btn.textContent=label;btn.style.color='var(--bad)';
  setTimeout(()=>{if(btn.isConnected&&btn.dataset.armed){delete btn.dataset.armed;btn.textContent=o;btn.style.color=''}},3500);
}
const moodOpts=sel=>MOODS.map(m=>`<option value="${m.id}" ${m.id===sel?'selected':''}>${m.name}</option>`).join('');
const curveOpts=sel=>CURVES.map(c=>`<option value="${c.id}" ${c.id===sel?'selected':''}>${c.name}</option>`).join('');
const nameOf=(arr,id)=>((arr.find(x=>x.id===id)||{}).name||'').replace(/^[^\p{L}\d]+\s/u,'');

/* ================= Saved sets ================= */
function setSummary(ids){
  const byId=new Map(state.tracks.map(t=>[t.id,t]));const ts=ids.map(i=>byId.get(i)).filter(Boolean);const b=ts.map(t=>t.bpm).filter(Boolean);
  return{ts,bpm:b.length?`${Math.round(Math.min(...b))}–${Math.round(Math.max(...b))}`:'–',keys:[...new Set(ts.map(t=>t.key).filter(Boolean))].slice(0,3)};
}
function saveCurrentSet(){
  const S=state.set;if(!S)return;const ev=evalSet();const gig=S.gigId&&state.gigs.find(g=>g.id===S.gigId);
  const data={ids:S.ids.slice(),pool:(S.pool||[]).slice(0,500),mood:S.mood,curve:S.curve,ppt:S.ppt,targets:S.targets?resample(S.targets,S.ids.length):null,chapters:S.chapters||null,score:Math.round(ev.score),gigId:S.gigId||null,updated:Date.now()};
  let rec=S.savedId&&state.sets.find(x=>x.id===S.savedId);
  if(rec)Object.assign(rec,data);
  else{rec={id:uid(),created:Date.now(),name:gig?`${gig.name} – Set`:(S.chapters&&S.chapters.length>1?`Nacht · ${S.chapters.length} Kapitel`:`${nameOf(MOODS,S.mood)} · ${nameOf(CURVES,S.curve)}`)+` · ${new Date().toLocaleDateString('de-DE')}`,...data};state.sets.unshift(rec);S.savedId=rec.id}
  if(gig)gig.setId=rec.id;
  save();renderSet();renderExtras();toast(`Set „${rec.name}“ gespeichert`);
}
function openSet(id){
  const r=state.sets.find(x=>x.id===id);if(!r)return;
  state.set={ids:r.ids.slice(),pool:(r.pool||[]).slice(),mood:r.mood,curve:r.curve,ppt:r.ppt,ms:0,seed:0,targets:r.targets?r.targets.slice():null,chapters:r.chapters||null,gigId:r.gigId||null,savedId:r.id};
  undoStack=[];openAlt=-1;openCoach.clear();save();goTab('build');renderSet();
}
function renderSets(){
  $('#setsCnt').textContent=state.sets.length;
  $('#setsList').innerHTML=state.sets.length?state.sets.map(r=>{const sm=setSummary(r.ids);const gig=r.gigId&&state.gigs.find(g=>g.id===r.gigId);
    return`<div class="setcard"><div class="sbadge" style="border-color:${scoreColor(r.score)};color:${scoreColor(r.score)}"><b>${r.score}</b><span>Score</span></div>
      <div style="flex:1;min-width:200px"><input class="rename" data-ren="${r.id}" value="${esc(r.name)}" title="Klicken zum Umbenennen"><div class="small muted" style="padding-left:5px">${sm.ts.length} Tracks · ${fmtDur(sm.ts.length*r.ppt)} · ${sm.bpm} BPM · ${new Date(r.updated).toLocaleDateString('de-DE')}${gig?` · 📅 ${esc(gig.name)}`:''}${r.chapters&&r.chapters.length>1?` · 🌙 ${r.chapters.length} Kapitel`:''}${sm.ts.length<r.ids.length?` · <span style="color:var(--mid)">${r.ids.length-sm.ts.length} Tracks fehlen in der Bibliothek</span>`:''}</div></div>
      <div class="row" style="gap:4px">${sm.keys.map(keyHtml).join('')}</div>
      <div class="row" style="gap:6px"><button class="btn sm pri" data-open="${r.id}">Öffnen</button><button class="btn sm" data-dup="${r.id}">Duplizieren</button><button class="btn sm" data-sdel="${r.id}">✕</button></div></div>`}).join('')
    :`<div class="empty"><div class="big">💾</div>Noch keine gespeicherten Sets.<br><span class="small">Bau im Set-Builder ein Set und klick auf <b>💾 Set speichern</b>.</span></div>`;
}
$('#tab-sets').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
  if(d.open)openSet(d.open);
  else if(d.dup){const r=state.sets.find(x=>x.id===d.dup);state.sets.unshift({...JSON.parse(JSON.stringify(r)),id:uid(),name:r.name+' (Kopie)',created:Date.now(),updated:Date.now()});save();renderExtras()}
  else if(d.sdel)armed(b,()=>{state.sets=state.sets.filter(x=>x.id!==d.sdel);if(state.set&&state.set.savedId===d.sdel)state.set.savedId=null;save();renderExtras()},'Löschen?');
});
$('#tab-sets').addEventListener('change',e=>{const id=e.target.dataset.ren;if(!id)return;const r=state.sets.find(x=>x.id===id);r.name=e.target.value.trim()||r.name;save();toast('Umbenannt')});

/* ================= Gigs ================= */
const CHECK=[
  ['usb','Set exportiert & auf USB-Stick (plus Ersatz-Stick)'],
  ['phones','Kopfhörer + Adapter (3,5 ↔ 6,3 mm)'],
  ['cables','Kabel: Cinch, Klinke, ggf. XLR'],
  ['power','Laptop-Netzteil & Mehrfachsteckdose'],
  ['offline','Alle Tracks offline – nicht auf Streaming verlassen'],
  ['backup','Notfall-Playlist (z. B. auf dem Handy)'],
  ['pdf','Trackliste/PDF griffbereit'],
  ['ears','Gehörschutz'],
  ['contact','Ansprechpartner, Ankunftszeit & Soundcheck geklärt'],
  ['gear','Technik vor Ort geklärt (Controller, CDJs, Mixer, Monitor?)'],
];
let gEdit=null;
function fillGigForm(g){
  $('#gName').value=g?.name||'';$('#gDate').value=g?.date||todayISO();$('#gTime').value=g?.time||'22:00';$('#gLen').value=g?.len||60;$('#gPlace').value=g?.place||'';$('#gNotes').value=g?.notes||'';
  $('#gMood').innerHTML=moodOpts(g?.mood||state.mood);$('#gCurve').innerHTML=curveOpts(g?.curve||state.curve);
  gEdit=g?.id||null;$('#gFormTitle').textContent=g?'Gig bearbeiten':'Neuer Gig';$('#gSave').textContent=g?'Änderungen speichern':'Gig speichern';
}
function gigCard(g){
  const n=daysUntil(g.date),d=new Date(g.date+'T00:00'),done=CHECK.filter(([k])=>g.check&&g.check[k]).length;
  const set=g.setId&&state.sets.find(s=>s.id===g.setId);
  return`<div class="gigcard" style="${n<0?'opacity:.6':''}"><div class="datebox"><b>${d.getDate()}</b><span>${MON[d.getMonth()]}</span></div>
    <div style="min-width:0"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><b style="font-size:16px">${esc(g.name)}</b><div class="small muted">${[g.place,g.time,fmtDur(g.len)].filter(Boolean).map(esc).join(' · ')} · <b style="color:${n<0?'var(--muted)':n<=2?'var(--accent2)':'var(--good)'}">${relDay(n)}</b></div></div>
      <div class="row" style="gap:6px"><button class="btn sm pri" data-gbuild="${g.id}">⚡ Set bauen</button>${set?`<button class="btn sm" data-gopen="${set.id}">Set öffnen (${set.score})</button>`:''}<button class="btn sm" data-gedit="${g.id}">Bearbeiten</button><button class="btn sm" data-gdel="${g.id}">✕</button></div></div>
      <div class="small muted" style="margin-top:4px">${nameOf(MOODS,g.mood)} · ${nameOf(CURVES,g.curve)}${g.notes?` · 📝 ${esc(g.notes.slice(0,90))}${g.notes.length>90?'…':''}`:''}</div>
      <details style="margin-top:6px"><summary style="margin:4px 0">🎒 Packliste ${done}/${CHECK.length}</summary>
        <div class="pbar" style="margin:0 0 8px"><i style="width:${done/CHECK.length*100}%;background:${done===CHECK.length?'var(--good)':'var(--accent2)'}"></i></div>
        ${CHECK.map(([k,l])=>`<label class="check"><input type="checkbox" data-gchk="${g.id}:${k}" ${g.check&&g.check[k]?'checked':''}> ${l}</label>`).join('')}
      </details></div></div>`;
}
function renderGigs(){
  $('#gigsCnt').textContent=state.gigs.filter(g=>daysUntil(g.date)>=0).length;
  const up=state.gigs.filter(g=>daysUntil(g.date)>=0).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const past=state.gigs.filter(g=>daysUntil(g.date)<0).sort((a,b)=>b.date.localeCompare(a.date));
  $('#gigList').innerHTML=`<h2>Kommende Gigs</h2><p class="sub">Klick auf „Set bauen“: Setwerk nimmt Länge, Stimmung und Kurve des Gigs und verknüpft das gespeicherte Set.</p>`+
    (up.map(gigCard).join('')||'<div class="empty" style="padding:30px">Keine kommenden Gigs. Leg links deinen nächsten an.</div>')+
    (past.length?`<h2 style="margin-top:22px">Vergangene Gigs</h2>`+past.map(gigCard).join(''):'');
}
$('#tab-gigs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
  if(b.id==='gSave'){const g={name:$('#gName').value.trim(),date:$('#gDate').value,time:$('#gTime').value,len:+$('#gLen').value||60,place:$('#gPlace').value.trim(),mood:$('#gMood').value,curve:$('#gCurve').value,notes:$('#gNotes').value.trim()};
    if(!g.name||!g.date)return toast('Bitte Name und Datum angeben');
    if(gEdit)Object.assign(state.gigs.find(x=>x.id===gEdit),g);else state.gigs.push({id:uid(),check:{},...g});
    save();fillGigForm(null);renderExtras();toast('Gig gespeichert')}
  else if(b.id==='gReset')fillGigForm(null);
  else if(d.gedit)fillGigForm(state.gigs.find(g=>g.id===d.gedit));
  else if(d.gdel)armed(b,()=>{state.gigs=state.gigs.filter(g=>g.id!==d.gdel);save();renderExtras()},'Löschen?');
  else if(d.gopen)openSet(d.gopen);
  else if(d.gbuild)buildForGig(d.gbuild);
});
$('#tab-gigs').addEventListener('change',e=>{const k=e.target.dataset.gchk;if(!k)return;const[id,key]=k.split(':');const g=state.gigs.find(x=>x.id===id);g.check=g.check||{};g.check[key]=e.target.checked;save();
  const det=e.target.closest('details');renderGigs();const again=[...$$('#gigList details')].find(x=>x.querySelector(`[data-gchk^="${id}:"]`));if(again&&det)again.open=true});
function buildForGig(id){
  const g=state.gigs.find(x=>x.id===id);if(!g)return;
  if(!state.tracks.length){toast('Zuerst eine Bibliothek importieren');return goTab('lib')}
  state.mood=g.mood;state.curve=g.curve;state.chaptersOn=false;$('#chOn').checked=false;
  const len=clamp(Math.round(g.len/5)*5,15,240);$('#len').value=len;$('#lenV').textContent=len+' min';
  renderControls();renderChapters();goTab('build');generate(Date.now(),{gigId:g.id});
}

/* ================= Library Health ================= */
const normKey=s=>(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g,'');
function genreVariants(){
  const groups=new Map();
  for(const t of state.tracks){if(!t.genre||!t.genre.trim())continue;const k=normKey(t.genre);if(!groups.has(k))groups.set(k,new Map());const m=groups.get(k);m.set(t.genre,(m.get(t.genre)||0)+1)}
  const out=[];for(const m of groups.values())if(m.size>1){const sp=[...m.entries()].sort((a,b)=>b[1]-a[1]);out.push({canon:sp[0][0],spellings:sp.map(x=>x[0])})}
  return out;
}
function cleanArtist(a){return(a||'').replace(/\s+/g,' ').trim().replace(/\s+(ft\.?|feat\.?|featuring)\s+/i,' feat. ')}
function dupGroups(){
  const g=new Map();for(const t of state.tracks){const k=normKey(t.artist)+'|'+normKey(t.title);if(!k.replace('|',''))continue;if(!g.has(k))g.set(k,[]);g.get(k).push(t)}
  return[...g.values()].filter(x=>x.length>1);
}
function libHealth(){
  const ts=state.tracks,n=ts.length||1;
  const genre=ts.filter(t=>t.genre&&t.genre.trim()).length/n,key=ts.filter(t=>t.key).length/n,bpm=ts.filter(t=>t.bpm>0).length/n,energy=ts.filter(t=>t.eSrc!=='est').length/n;
  const variants=genreVariants(),dups=dupGroups(),artists=ts.filter(t=>t.artist!==cleanArtist(t.artist)).length;
  const todo=ts.filter(t=>!t.genre||!t.genre.trim()||!t.key||!t.bpm).length;
  const penalty=Math.min(8,variants.length*2)+Math.min(8,dups.length*2)+Math.min(4,artists);
  const score=ts.length?clamp(Math.round(100*(.25*genre+.3*key+.25*bpm+.2*energy)-penalty),0,100):0;
  return{score,genre,key,bpm,energy,variants,dups,artists,todo,n:ts.length};
}
const libFilterFn=f=>{if(f==='dup'){const s=new Set(dupGroups().flat().map(t=>t.id));return t=>s.has(t.id)}if(f==='todo')return t=>!t.genre||!t.genre.trim()||!t.key||!t.bpm;if(f==='est')return t=>t.eSrc==='est';return()=>true};
function ringSvg(v,size=110){const r=44,c=2*Math.PI*r;return`<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 110 110" width="${size}" height="${size}"><circle cx="55" cy="55" r="${r}" fill="none" stroke="#2a3040" stroke-width="9"/><circle cx="55" cy="55" r="${r}" fill="none" stroke="${scoreColor(v)}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${c*v/100} ${c}" transform="rotate(-90 55 55)"/></svg><b>${v}<small>HEALTH</small></b></div>`}
const pctColor=v=>v>=.9?'var(--good)':v>=.6?'var(--mid)':'var(--bad)';
function renderHealth(){
  const box=$('#health');if(!state.tracks.length){box.innerHTML='';return}
  const H=libHealth(),P=v=>`<b style="color:${pctColor(v)}">${Math.round(v*100)} %</b>`;
  box.innerHTML=`<div class="card" style="background:var(--panel2)"><div class="row" style="align-items:flex-start;gap:20px">
    ${ringSvg(H.score)}
    <div style="flex:1;min-width:220px"><h3 style="margin-bottom:4px">Library Health</h3>
      <div class="metric"><span>Genre gepflegt</span>${P(H.genre)}</div>
      <div class="metric"><span>Tonart vorhanden</span>${P(H.key)}</div>
      <div class="metric"><span>BPM vorhanden</span>${P(H.bpm)}</div>
      <div class="metric"><span>Echte Energie-Daten (Tag, Audio oder manuell)</span>${P(H.energy)}</div></div>
    <div style="flex:1;min-width:240px"><h3 style="margin-bottom:8px">Aufräumen</h3><div style="display:grid;gap:6px">
      <button class="btn sm" id="hGenre" ${H.variants.length?'':'disabled'}>🏷 Genre-Schreibweisen vereinheitlichen (${H.variants.length})</button>
      <button class="btn sm" id="hArtist" ${H.artists?'':'disabled'}>👤 Artist-Namen bereinigen (${H.artists})</button>
      <button class="btn sm" id="hDup" ${H.dups.length?'':'disabled'}>👯 Duplikate anzeigen (${H.dups.length})</button>
      <button class="btn sm" id="hTodo" ${H.todo?'':'disabled'}>⚠️ Unvollständige Tracks anzeigen (${H.todo})</button>
      ${state.tracks.some(t=>t.eSrc==='est')?`<button class="btn sm" id="hEst">⚡ Tracks mit geschätzter Energie anzeigen</button>`:''}
    </div></div></div>
    ${H.variants.length?`<div class="small muted" style="margin-top:10px">Beispiel: ${H.variants.slice(0,3).map(v=>v.spellings.map(s=>`„${esc(s)}“`).join(' / ')+` → „${esc(v.canon)}“`).join(' · ')}</div>`:''}
    ${libFilter?`<div class="row" style="margin-top:10px"><span class="pill" style="border-color:var(--accent)">Filter: ${{dup:'Duplikate',todo:'Unvollständig',est:'Energie geschätzt'}[libFilter]}</span>${libFilter==='dup'?'<button class="btn sm" id="hDupRm">Doppelte aus Setwerk entfernen (erste behalten)</button>':''}<button class="btn sm" id="hClr">Filter aufheben</button></div>`:''}
  </div>`;
}
$('#health').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.id==='hGenre'){const map=new Map();for(const v of genreVariants())for(const sp of v.spellings)map.set(sp,v.canon);let n=0;for(const t of state.tracks)if(map.has(t.genre)&&map.get(t.genre)!==t.genre){t.genre=map.get(t.genre);n++}save();renderAll();toast(`${n} Genres vereinheitlicht`)}
  else if(b.id==='hArtist'){let n=0;for(const t of state.tracks){const c=cleanArtist(t.artist);if(c!==t.artist){t.artist=c;n++}}save();renderAll();toast(`${n} Artist-Namen bereinigt`)}
  else if(b.id==='hDup'){libFilter='dup';renderLib();renderHealth()}
  else if(b.id==='hTodo'){libFilter='todo';renderLib();renderHealth()}
  else if(b.id==='hEst'){libFilter='est';renderLib();renderHealth()}
  else if(b.id==='hClr'){libFilter=null;renderLib();renderHealth()}
  else if(b.id==='hDupRm')armed(b,()=>{const rm=new Set(dupGroups().flatMap(g=>g.slice(1).map(t=>t.id)));state.tracks=state.tracks.filter(t=>!rm.has(t.id));libFilter=null;save();renderAll();toast(`${rm.size} Duplikate entfernt`)});
});

/* ================= Musikordner: Vorhören, Set vorhören, Übergang anhören, Energie aus Audio ================= */
const audioFiles=new Map();
const AUDIO_RE=/\.(mp3|wav|aiff?|flac|m4a|aac|ogg|alac|mp4)$/i;
const baseName=p=>(p||'').split(/[\\/]/).pop().normalize('NFC').toLowerCase();
function fileFor(t){return t&&(audioFiles.get(baseName(t.path))||audioFiles.get(baseName(t.seratoPath)))||null}
let analyzing=null;
function renderAudioBox(){
  const box=$('#audioBox');if(!state.tracks.length){box.innerHTML='';return}
  const matched=state.tracks.filter(fileFor).length;
  box.innerHTML=`<div class="card" style="background:var(--panel2)"><div class="row" style="justify-content:space-between">
    <div><h3 style="margin-bottom:2px">🎵 Musikordner verbinden <span style="text-transform:none;letter-spacing:0;font-weight:500">– optional</span></h3>
    <div class="small muted">${audioFiles.size?`<b style="color:var(--text)">${matched}</b> von ${state.tracks.length} Tracks verbunden. Jetzt kannst du Tracks vorhören, das Set vorhören und Übergänge anhören.`:'Wähle den Ordner mit deinen Musikdateien. Sie werden nur lokal abgespielt und nie hochgeladen. Danach: Vorhören, „Übergang anhören“ und Energie aus dem Audio messen.'}</div></div>
    <div class="row"><label class="btn sm" style="cursor:pointer">📁 Ordner wählen<input type="file" id="musicDir" webkitdirectory multiple hidden></label>
    ${matched?`<button class="btn sm pri" id="anaGo" ${analyzing?'disabled':''}>⚡ Energie aus Audio messen</button>`:''}</div></div>
    ${analyzing?`<div style="margin-top:10px"><div class="row small" style="justify-content:space-between"><span>Analysiere ${analyzing.i}/${analyzing.n}: ${esc(analyzing.cur||'')}</span><button class="btn sm" id="anaStop">Abbrechen</button></div><div class="progress" style="margin-top:6px"><i style="width:${analyzing.i/analyzing.n*100}%"></i></div></div>`:''}
  </div>`;
}
$('#audioBox').addEventListener('change',e=>{if(e.target.id!=='musicDir')return;let n=0;for(const f of e.target.files)if(AUDIO_RE.test(f.name)){audioFiles.set(f.name.normalize('NFC').toLowerCase(),f);n++}
  e.target.value='';renderAll();toast(`${n} Audiodateien gefunden · ${state.tracks.filter(fileFor).length} Tracks verbunden`)});
$('#audioBox').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='anaGo')analyzeEnergy();if(b.id==='anaStop'&&analyzing)analyzing.stop=true});

async function analyzeEnergy(){
  const items=state.tracks.filter(t=>fileFor(t)&&t.eSrc!=='manual');if(!items.length)return toast('Keine verbundenen Tracks');
  let ctx;try{ctx=new AudioContext({sampleRate:22050})}catch(_){ctx=new AudioContext()}
  analyzing={i:0,n:items.length,stop:false};const feats=[];
  for(const t of items){
    if(analyzing.stop)break;analyzing.i++;analyzing.cur=t.artist+' – '+t.title;renderAudioBox();
    const f=fileFor(t);if(f.size>200e6)continue;
    try{
      const buf=await ctx.decodeAudioData(await f.arrayBuffer());
      const ch=buf.getChannelData(0),sr=buf.sampleRate,win=1024,from=Math.floor(ch.length*.2),to=Math.floor(ch.length*.8);
      let sum=0,cnt=0,flux=0,prev=0,zc=0;
      for(let i=from;i+win<to;i+=win){let e2=0;for(let j=i;j<i+win;j+=2){const v=ch[j];e2+=v*v;if((v>=0)!==(ch[j+2]>=0))zc++}const rms=Math.sqrt(e2/(win/2));sum+=rms;cnt++;if(rms>prev)flux+=rms-prev;prev=rms}
      const dur=(to-from)/sr;feats.push({t,rms:sum/Math.max(cnt,1),flux:flux/Math.max(dur,1),zcr:zc/Math.max(cnt*win/2,1)});
    }catch(_){/* unsupported file format */}
    await new Promise(r=>setTimeout(r,0));
  }
  ctx.close();
  if(feats.length){
    const rank=k=>{const s=feats.map(f=>f[k]).sort((a,b)=>a-b);return v=>feats.length>1?s.indexOf(v)/(s.length-1):.5};
    const R=rank('rms'),F=rank('flux'),Z=rank('zcr');
    const raw=feats.map(f=>{const b=clamp((effBpm(f.t.bpm,f.t.genre)-90)/60,0,1);return .4*R(f.rms)+.3*F(f.flux)+.1*Z(f.zcr)+.2*b});
    const sorted=[...raw].sort((a,b)=>a-b);
    feats.forEach((f,i)=>{const p=feats.length>=8?sorted.indexOf(raw[i])/(feats.length-1):raw[i];f.t.energy=clamp(1+Math.round(p*9),1,10);f.t.eSrc='audio'});
    save();
  }
  const done=feats.length,stopped=analyzing.stop;analyzing=null;renderAll();
  toast(`${done} Tracks gemessen${stopped?' (abgebrochen)':''} – Energie relativ zu deiner Bibliothek`);
}

// Simple preview player
const pAudio=$('#pAudio');let playQueue=null;
function playTrack(id,startAt){
  const t=state.tracks.find(x=>x.id===id),f=fileFor(t);
  if(!f){toast('Datei nicht verbunden – unter „Bibliothek“ den Musikordner verbinden');return}
  stopBlend();
  if(pAudio._url)URL.revokeObjectURL(pAudio._url);
  pAudio._url=URL.createObjectURL(f);pAudio.src=pAudio._url;
  pAudio.onloadedmetadata=()=>{pAudio.currentTime=startAt!=null?startAt:(pAudio.duration>90?Math.min(pAudio.duration*.3,75):0)};
  pAudio.play().catch(()=>{});$('#pTitle').textContent=`${t.artist} – ${t.title}`;$('#player').hidden=false;
  if(!playQueue)$('#pNext').hidden=true;
}
function playSetFrom(i){
  const ev=evalSet();if(!ev)return;
  const list=ev.tracks.map((t,k)=>({t,k})).filter(x=>x.k>=i&&fileFor(x.t));
  if(!list.length)return toast('Keine verbundenen Dateien im Set');
  playQueue={list,pos:0};$('#pNext').hidden=false;playQueueItem();
}
function playQueueItem(){const q=playQueue;if(!q)return;const it=q.list[q.pos];if(!it){playQueue=null;$('#pNext').hidden=true;return}
  playTrack(it.t.id);$('#pTitle').textContent=`${it.k+1}. ${it.t.artist} – ${it.t.title}  (Vorhören, 40 s)`;q.until=null}
pAudio.addEventListener('timeupdate',()=>{const q=playQueue;if(!q)return;if(q.until==null&&pAudio.currentTime>0)q.until=pAudio.currentTime+40;if(q.until!=null&&pAudio.currentTime>=q.until){q.pos++;playQueueItem()}});
pAudio.addEventListener('ended',()=>{if(playQueue){playQueue.pos++;playQueueItem()}});
$('#pNext').onclick=()=>{if(playQueue){playQueue.pos++;playQueueItem()}};
$('#pClose').onclick=()=>{playQueue=null;pAudio.pause();stopBlend();$('#player').hidden=true};

// Transition preview: tempo-matched, crossfade with bass swap (Web Audio)
let blend=null,bctx=null;
function stopBlend(){if(!blend)return;blend.els.forEach(el=>{el.pause();URL.revokeObjectURL(el.src)});blend.timers.forEach(clearTimeout);blend=null}
async function playBlend(i){
  const ev=evalSet(),a=ev.tracks[i-1],b=ev.tracks[i],x=ev.tx[i-1],fa=fileFor(a),fb=fileFor(b);
  if(!fa||!fb)return toast('Beide Dateien müssen verbunden sein');
  playQueue=null;pAudio.pause();stopBlend();
  bctx=bctx||new AudioContext();if(bctx.state==='suspended')await bctx.resume();
  const tip=mixTip(a,b,x),mult=x.bp.hd?(b.bpm>a.bpm?2:.5):1,rateB=clamp(a.bpm*mult/b.bpm,.5,2);
  const mk=(f,rate)=>{const el=new Audio(URL.createObjectURL(f));el.preservesPitch=true;el.playbackRate=rate;const src=bctx.createMediaElementSource(el);const low=bctx.createBiquadFilter();low.type='lowshelf';low.frequency.value=200;const g=bctx.createGain();src.connect(low).connect(g).connect(bctx.destination);return{el,low,g}};
  const A=mk(fa,1),B=mk(fb,rateB);
  await Promise.all([A.el,B.el].map(el=>new Promise(r=>{if(el.readyState>=1)r();else el.onloadedmetadata=r})));
  const bar=240/a.bpm,blendS=Math.min(tip.secs,64),lead=4*bar;
  A.el.currentTime=Math.max(0,A.el.duration-blendS-lead-8*bar);B.el.currentTime=0;
  const t0=bctx.currentTime+.15,tB=t0+lead,tSwap=tB+blendS/2,tEnd=tB+blendS;
  A.g.gain.setValueAtTime(1,t0);A.low.gain.setValueAtTime(0,t0);
  B.g.gain.setValueAtTime(0,t0);B.low.gain.setValueAtTime(-40,t0);
  B.g.gain.setValueAtTime(0,tB);B.g.gain.linearRampToValueAtTime(1,tB+blendS*.35);
  A.low.gain.setValueAtTime(0,tSwap-.05);A.low.gain.linearRampToValueAtTime(-40,tSwap+.05);
  B.low.gain.setValueAtTime(-40,tSwap-.05);B.low.gain.linearRampToValueAtTime(0,tSwap+.05);
  A.g.gain.setValueAtTime(1,tSwap+blendS*.25);A.g.gain.linearRampToValueAtTime(0,tEnd);
  blend={els:[A.el,B.el],timers:[]};
  A.el.play().catch(()=>{});
  blend.timers.push(setTimeout(()=>B.el.play().catch(()=>{}),lead*1000+150));
  blend.timers.push(setTimeout(()=>toast('Bass-Swap!'),(lead+blendS/2)*1000+150));
  blend.timers.push(setTimeout(stopBlend,(lead+blendS+8*bar)*1000));
  $('#pTitle').textContent=`Übergang ${i}→${i+1}: ${a.title} → ${b.title}`;$('#player').hidden=false;$('#pNext').hidden=true;
}

/* ================= Live-Assistent ================= */
const DIRS=[['down','⬇ Runterfahren',-1.5],['hold','➡ Halten',0],['up','⬆ Hochfahren',1.5],['boost','⚡ Peak',2.5]];
let liveQ='';
function liveSuggest(){
  const L=state.live,byId=new Map(state.tracks.map(t=>[t.id,t])),cur=byId.get(L.cur);if(!cur)return[];
  const played=new Set(L.hist),delta=(DIRS.find(d=>d[0]===L.dir)||DIRS[1])[2],tg=clamp(cur.energy+delta,1,10);
  const playedSongs=new Set([...L.hist.map(id=>byId.get(id)).filter(Boolean).map(songKey),songKey(cur)]);
  const out=[],seen=new Set();
  for(const x of sourceTracks().filter(t=>t.id!==cur.id&&!played.has(t.id)&&t.bpm>0&&!playedSongs.has(songKey(t))).map(t=>({t,x:trans(cur,t,tg)})).sort((a,b)=>b.x.total-a.x.total)){const k=songKey(x.t);if(seen.has(k))continue;seen.add(k);out.push(x);if(out.length>=12)break}
  return out;
}
function liveSet(id){const L=state.live;L.cur=id;if(L.hist[L.hist.length-1]!==id)L.hist.push(id);liveQ='';save();renderLive()}
function renderLive(){
  const L=state.live,byId=new Map(state.tracks.map(t=>[t.id,t])),cur=byId.get(L.cur),box=$('#live');
  if(!state.tracks.length){box.innerHTML=`<div class="card empty"><div class="big">🎚️</div>Für den Live-Assistenten brauchst du eine Bibliothek.<br><button class="btn pri" style="margin-top:12px" onclick="goTab('lib')">Bibliothek importieren</button></div>`;return}
  const src=sourceTracks().length;
  const sugg=cur?liveSuggest():[];
  box.innerHTML=`<div class="grid2">
  <div style="display:grid;gap:14px;align-content:start">
    <div class="card"><h2>Live-Assistent</h2><p class="sub">Beim Auflegen: Sag Setwerk, was gerade läuft – du bekommst sofort die besten nächsten Tracks.</p>
      <div style="position:relative"><input type="search" id="liveQ" placeholder="Track suchen: Titel, Artist, 8A, 126 …" value="${esc(liveQ)}" style="width:100%">
      ${liveQ?`<div class="dd">${state.tracks.filter(t=>(t.title+' '+t.artist+' '+t.key+' '+Math.round(t.bpm)).toLowerCase().includes(liveQ.toLowerCase())).slice(0,10).map(t=>`<div data-lset="${t.id}"><b>${esc(t.title)}</b> <span class="muted">· ${esc(t.artist)} · ${t.key||'?'} · ${Math.round(t.bpm)}</span></div>`).join('')||'<div class="muted">Nichts gefunden</div>'}</div>`:''}</div>
      <div class="small muted" style="margin-top:8px">Vorschläge kommen aus der Quelle im Set-Builder (${src} Tracks).</div></div>
    ${cur?`<div class="livecur"><div class="small muted">LÄUFT GERADE</div><div style="font-size:20px;font-weight:800;margin:2px 0">${esc(cur.title)}</div><div class="muted">${esc(cur.artist)} · ${esc(cur.genre||'')}</div>
      <div class="row" style="margin-top:10px"><b>${cur.bpm.toFixed(1)} BPM</b>${keyHtml(cur.key)}${eHtml(cur.energy)}${fileFor(cur)?`<button class="btn sm" data-lplay="${cur.id}">▶</button>`:''}</div></div>
    <div class="card"><h3>Wohin soll die Energie?</h3><div class="chips">${DIRS.map(([id,l])=>`<button class="chip ${L.dir===id?'on':''}" data-ldir="${id}">${l}</button>`).join('')}</div></div>`:''}
    <div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Gespielt (${L.hist.length})</h3><div class="row" style="gap:6px"><button class="btn sm" id="lToSet" ${L.hist.length>1?'':'disabled'}>Als Set übernehmen</button><button class="btn sm" id="lClear" ${L.hist.length?'':'disabled'}>Leeren</button></div></div>
      <div style="margin-top:8px;max-height:260px;overflow:auto">${L.hist.map((id,i)=>{const t=byId.get(id);return t?`<div class="small" style="padding:4px 0;border-bottom:1px solid var(--line)"><span class="muted">${i+1}.</span> ${esc(t.artist)} – ${esc(t.title)} <span class="muted">· ${t.key||'?'} · ${Math.round(t.bpm)}</span></div>`:''}).join('')||'<div class="small muted">Noch nichts gespielt.</div>'}</div></div>
  </div>
  <div class="card"><h3>${cur?'Passt als Nächstes':'Wähle links den Track, der gerade läuft'}</h3>
    ${sugg.map(({t,x})=>`<div class="sugg"><span class="sc" style="background:${scoreColor(x.total)};font-size:14px;text-align:center;padding:6px 0">${Math.round(x.total)}</span>
      <div style="min-width:0"><b>${esc(t.title)}</b><div class="small muted">${esc(t.artist)} · ${esc(t.genre||'—')}</div>
      <div class="row" style="gap:6px;margin-top:4px"><span class="pill" style="border-color:${x.k.s>=.8?'var(--good)':x.k.s>=.45?'var(--mid)':'var(--bad)'}">${cur.key||'?'}→${t.key||'?'} ${x.k.l}</span><span class="pill">BPM ${x.bp.d>=0?'+':''}${x.bp.d.toFixed(1)}%</span><span class="pill">Energie ${t.energy-cur.energy>=0?'+':''}${t.energy-cur.energy}</span></div></div>
      <div class="row" style="gap:6px">${keyHtml(t.key)}${fileFor(t)?`<button class="btn sm" data-lplay="${t.id}">▶</button>`:''}<button class="btn sm pri" data-lset="${t.id}">Als Nächstes ✓</button></div></div>`).join('')||(cur?'<div class="muted">Keine Vorschläge in der Quelle.</div>':'<div class="empty">🎧<br>Such oben links nach dem aktuellen Track.</div>')}
  </div></div>`;
  if(document.activeElement?.id!=='liveQ'&&liveQ){}
}
$('#live').addEventListener('input',e=>{if(e.target.id==='liveQ'){liveQ=e.target.value;renderLive();const q=$('#liveQ');q.focus();q.setSelectionRange(q.value.length,q.value.length)}});
$('#live').addEventListener('click',e=>{const el=e.target.closest('[data-lset],[data-ldir],[data-lplay],button');if(!el)return;const d=el.dataset;
  if(d.lset)liveSet(d.lset);
  else if(d.ldir){state.live.dir=d.ldir;save();renderLive()}
  else if(d.lplay)playTrack(d.lplay);
  else if(el.id==='lClear')armed(el,()=>{state.live={cur:null,hist:[],dir:state.live.dir};save();renderLive()},'Leeren?');
  else if(el.id==='lToSet'){const L=state.live;const byId=new Map(state.tracks.map(t=>[t.id,t]));const ids=L.hist.filter(id=>byId.has(id));
    state.set={ids,pool:state.tracks.map(t=>t.id),mood:state.mood,curve:state.curve,ppt:+$('#ppt').value,ms:0,seed:0,targets:ids.map(id=>byId.get(id).energy),chapters:null,gigId:null,savedId:null};
    undoStack=[];openAlt=-1;save();goTab('build');renderSet();toast('Gespielte Tracks als Set übernommen')}
});

/* ================= Kapitel (ganze Nacht) ================= */
const CH_PRESETS={
  club:['🏙 Club-Nacht · 4 h',[['Warm-up','deep','build',60],['Aufbau','groove','build',60],['Peak','dark','peak',90],['Closing','emo','sunset',30]]],
  party:['🎉 Geburtstag/Party · 3 h',[['Ankommen','chill','build',45],['Party','groove','waves',90],['Höhepunkt','euph','peak',30],['Ausklang','emo','sunset',15]]],
  bar:['🍸 Bar/Lounge · 2 h',[['Lounge','chill','build',60],['Groove','groove','waves',60]]],
  festival:['🎪 Festival-Slot · 1 h',[['Intro','euph','build',10],['Main','dark','peak',40],['Finale','euph','journey',10]]],
};
function renderChapters(){
  const on=state.chaptersOn;$('#chOn').checked=on;$('#chBox').hidden=!on;$('#lenSec').hidden=on;
  if(!on)return;
  if(!state.chapters.length)state.chapters=CH_PRESETS.club[1].map(([label,mood,curve,min])=>({label,mood,curve,min}));
  const total=state.chapters.reduce((a,c)=>a+(+c.min||0),0);
  $('#chBox').innerHTML=`<div class="small muted" style="margin-bottom:8px">Jedes Kapitel bekommt eigene Stimmung und Kurve – die Übergänge zwischen den Kapiteln werden ganz normal gemixt.</div>
    <div class="chips" style="margin-bottom:10px">${Object.entries(CH_PRESETS).map(([k,[n]])=>`<button class="chip" data-chp="${k}">${n}</button>`).join('')}</div>
    <div class="chrow small muted" style="font-weight:700"><span>Name</span><span>Stimmung</span><span>Kurve</span><span>Min</span><span></span></div>
    ${state.chapters.map((c,i)=>`<div class="chrow"><input type="text" data-chf="${i}:label" value="${esc(c.label)}" placeholder="Kapitel ${i+1}"><select data-chf="${i}:mood">${moodOpts(c.mood)}</select><select data-chf="${i}:curve">${curveOpts(c.curve)}</select><input type="number" data-chf="${i}:min" value="${c.min}" min="5" max="240"><button class="btn sm" data-chx="${i}" ${state.chapters.length<2?'disabled':''}>✕</button></div>`).join('')}
    <div class="row" style="justify-content:space-between;margin-top:6px"><button class="btn sm" id="chAdd">+ Kapitel</button><span class="small"><b>${fmtDur(total)}</b> gesamt · ca. ${Math.round(total/+$('#ppt').value)} Tracks</span></div>`;
}
$('#chOn').onchange=e=>{state.chaptersOn=e.target.checked;save();renderChapters()};
$('#chBox').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
  if(d.chp){state.chapters=CH_PRESETS[d.chp][1].map(([label,mood,curve,min])=>({label,mood,curve,min}))}
  else if(d.chx)state.chapters.splice(+d.chx,1);
  else if(b.id==='chAdd')state.chapters.push({label:'',mood:state.mood,curve:state.curve,min:30});
  else return;
  save();renderChapters();
});
$('#chBox').addEventListener('change',e=>{const f=e.target.dataset.chf;if(!f)return;const[i,k]=f.split(':');state.chapters[+i][k]=k==='min'?clamp(+e.target.value||30,5,240):e.target.value;save();renderChapters()});

/* ================= DJ-Schule ================= */
const LESSONS=[
['1 · Beatmatching – zwei Tracks im gleichen Takt',`<p>Damit zwei Tracks zusammen klingen, müssen sie <b>gleich schnell</b> laufen (gleiche BPM) und ihre Kicks müssen <b>gleichzeitig</b> kommen.</p>
<p><b>So geht’s:</b> Starte Track B im Kopfhörer. Gleiche mit dem Pitch-Fader das Tempo an (Setwerk sagt dir im Mix-Tipp genau, wie viel Prozent). Dann schiebst du B mit dem Jogwheel, bis die Kicks deckungsgleich sind. Läuft B davon, minimal nachpitchen.</p>
<p>💡 Sync-Button ist kein Schummeln – aber übe es auch ohne. Dann bist du sicher, wenn Sync mal danebenliegt.</p>`],
['2 · Phrasing – auf der Eins mixen',`<p>Elektronische Musik ist in <b>Takten</b> gebaut: 4 Schläge = 1 Takt, 8 Takte = kleiner Abschnitt, <b>16 oder 32 Takte = eine Phrase</b>. An Phrasengrenzen passiert etwas – Break, Drop, neue Elemente.</p>
<p><b>Regel:</b> Starte Track B immer auf der „Eins“ einer neuen Phrase von Track A. Dann fallen die Höhepunkte beider Tracks zusammen und der Übergang wirkt geplant statt zufällig.</p>
<p>💡 Zähl mit: „1-2-3-4, 2-2-3-4, …“ bis 8 oder 16. Nach ein paar Mixen hörst du die Phrasen von allein. Der Takte-Rechner unten sagt dir, wie lang 16 oder 32 Takte bei deinem Tempo dauern.</p>`],
['3 · EQ-Mixing & Bass-Swap',`<p>Zwei Basslines gleichzeitig = Matsch. Deshalb: <b>Bass von B raus</b>, wenn du ihn startest. In der Mitte des Übergangs tauschst du auf der Eins: <b>A-Bass raus, B-Bass rein</b> – das ist der Bass-Swap.</p>
<p>Mitten und Höhen kannst du langsamer übergeben. Zum Schluss nimmst du A mit dem Fader oder einem Hochpass-Filter raus.</p>
<p>💡 Jeder Mix-Tipp in Setwerk zeigt dir den genauen Takt für den Bass-Swap. Mit verbundenem Musikordner kannst du ihn dir sogar vorher anhören.</p>`],
['4 · Harmonisches Mixen mit dem Camelot-Rad',`<p>Jede Tonart hat einen Platz auf dem <b>Camelot-Rad</b> (z. B. 8A = a-Moll, 8B = C-Dur). Tracks, die nah beieinander liegen, klingen zusammen harmonisch.</p>
<p><b>Sichere Wechsel:</b> gleiche Zahl (8A→8A), ±1 (8A→9A oder 7A), gleiche Zahl anderer Buchstabe (8A→8B). <b>Energie-Boost:</b> +2 (8A→10A) hebt die Stimmung spürbar.</p>
<p>💡 Klick unten im Rad auf eine Tonart – Setwerk zeigt dir alle passenden.</p>`],
['5 · Energie lesen & ein Set aufbauen',`<p>Ein gutes Set ist eine <b>Reise</b>: Niemand will 2 Stunden nur Vollgas. Starte ruhiger als du denkst (Warm-up), baue auf, setze Höhepunkte und gib dem Floor auch mal eine Pause.</p>
<p><b>Lies die Tanzfläche:</b> Wird’s voller und lauter → Energie hoch. Leute gehen zur Bar → kurz zurücknehmen oder etwas Bekanntes spielen.</p>
<p>💡 Der <b>Live-Assistent</b> hilft dir genau dabei: Sag, ob es hoch, gleich oder runter gehen soll.</p>`],
['6 · Gig-Vorbereitung',`<p><b>Vorher:</b> Technik vor Ort klären (welcher Controller/CDJs?), Set exportieren, auf zwei USB-Sticks ziehen, Musik offline verfügbar machen.</p>
<p><b>Vor Ort:</b> Früh da sein, Kopfhörer und Pegel checken, Gain so einstellen, dass die Anzeige nicht ins Rote geht.</p>
<p>💡 Leg deinen Termin unter <b>Gigs</b> an – dort gibt’s eine abhakbare Packliste.</p>`],
];
let wheelSel='8A',taps=[];
function camelotWheel(sel){
  const cx=200,cy=200,arc=(r1,r2,a0,a1)=>{const p=(r,a)=>[cx+r*Math.sin(a),cy-r*Math.cos(a)];const[x1,y1]=p(r2,a0),[x2,y2]=p(r2,a1),[x3,y3]=p(r1,a1),[x4,y4]=p(r1,a0);return`M${x1},${y1}A${r2},${r2} 0 0 1 ${x2},${y2}L${x3},${y3}A${r1},${r1} 0 0 0 ${x4},${y4}Z`};
  const sk={kn:parseInt(sel),kl:sel.slice(-1)};let g='';
  for(let n=1;n<=12;n++)for(const l of['A','B']){
    const k=n+l,a=((n%12)*30-15)*Math.PI/180,b=((n%12)*30+15)*Math.PI/180,rel=keyRel(sk,{kn:n,kl:l});
    const isSel=k===sel,good=rel.s>=.85,ok=rel.s>=.45;
    const op=isSel||good?1:ok?.75:.2;
    const[r1,r2]=l==='B'?[135,190]:[80,135],mid=(a+b)/2,rr=(r1+r2)/2;
    g+=`<path d="${arc(r1,r2,a,b)}" fill="${keyColor(k)}" opacity="${op}" data-wk="${k}" style="${isSel?'stroke:#fff;stroke-width:4':''}"><title>${k}: ${isSel?'gewählt':rel.l}</title></path><text x="${cx+rr*Math.sin(mid)}" y="${cy-rr*Math.cos(mid)+4}" text-anchor="middle" font-size="12" font-weight="800" fill="#0d0f14" pointer-events="none" opacity="${op<.5?.4:1}">${k}</text>`;
  }
  return`<svg class="wheel" viewBox="0 0 400 400">${g}<circle cx="200" cy="200" r="78" fill="#151922"/><text x="200" y="196" text-anchor="middle" fill="#e8ebf2" font-size="30" font-weight="900">${sel}</text><text x="200" y="218" text-anchor="middle" fill="#8b93a7" font-size="11">${keyName(sel)}</text></svg>`;
}
const KEY_NAMES={'1A':'gis-Moll','2A':'es-Moll','3A':'b-Moll','4A':'f-Moll','5A':'c-Moll','6A':'g-Moll','7A':'d-Moll','8A':'a-Moll','9A':'e-Moll','10A':'h-Moll','11A':'fis-Moll','12A':'cis-Moll','1B':'H-Dur','2B':'Fis-Dur','3B':'Des-Dur','4B':'As-Dur','5B':'Es-Dur','6B':'B-Dur','7B':'F-Dur','8B':'C-Dur','9B':'G-Dur','10B':'D-Dur','11B':'A-Dur','12B':'E-Dur'};
const keyName=k=>KEY_NAMES[k]||'';
function wheelInfo(sel){
  const sk={kn:parseInt(sel),kl:sel.slice(-1)},all=[];
  for(let n=1;n<=12;n++)for(const l of['A','B']){const r=keyRel(sk,{kn:n,kl:l});if(r.s>=.45&&n+l!==sel)all.push([n+l,r])}
  all.sort((a,b)=>b[1].s-a[1].s);
  const inLib=state.tracks.filter(t=>t.key===sel).length;
  return`<div style="display:grid;gap:4px">${all.map(([k,r])=>`<div class="row" style="gap:8px">${keyHtml(k)}<span>${r.l}</span><span class="muted small">${state.tracks.filter(t=>t.key===k).length} Tracks</span></div>`).join('')}</div><div class="small muted" style="margin-top:8px">${inLib} Tracks in deiner Bibliothek sind in ${sel}.</div>`;
}
function renderSchool(){
  const box=$('#school');
  box.innerHTML=`<div class="grid2" style="grid-template-columns:1.3fr 1fr">
  <div class="card"><h2>DJ-Schule</h2><p class="sub">Die Grundlagen, kurz und praktisch – passend zu dem, was Setwerk dir in jedem Mix-Tipp anzeigt.</p>
    ${LESSONS.map(([t,b],i)=>`<details class="lesson" ${i===0?'open':''}><summary>${t}</summary><div class="body">${b}</div></details>`).join('')}</div>
  <div style="display:grid;gap:14px;align-content:start">
    <div class="card"><h3>Camelot-Rad – klick eine Tonart</h3>${camelotWheel(wheelSel)}<div id="wheelInfo" style="margin-top:10px">${wheelInfo(wheelSel)}</div></div>
    <div class="card"><h3>Werkzeuge</h3><div style="display:grid;gap:12px">
      <div class="tool"><b>👆 Tap-Tempo</b><div class="small muted" style="margin-bottom:8px">Im Takt auf den Button tippen (oder Leertaste), um die BPM zu bestimmen.</div><div class="row" style="align-items:center"><button class="tapbtn" id="tapBtn" style="flex:1">TAP</button><div style="min-width:110px;text-align:center"><div class="big" id="tapBpm">–</div><div class="small muted">BPM</div></div></div></div>
      <div class="tool"><b>⏱ Takte-Rechner</b><div class="row" style="margin-top:8px"><label class="f">BPM<input type="number" id="calcBpm" value="126"></label><label class="f">Takte<select id="calcBars"><option>4</option><option>8</option><option selected>16</option><option>32</option><option>64</option></select></label><div><div class="big" id="calcOut" style="font-size:28px">–</div><div class="small muted">Minuten:Sekunden</div></div></div></div>
      <div class="tool"><b>🎚 Pitch-Rechner</b><div class="row" style="margin-top:8px"><label class="f">Track A (läuft)<input type="number" id="pA" value="124"></label><label class="f">Track B (neu)<input type="number" id="pB" value="128"></label><div><div class="big" id="pOut" style="font-size:28px">–</div><div class="small muted">Pitch für Track B</div></div></div></div>
    </div></div>
  </div></div>`;
  calcTools();
}
function calcTools(){
  const bpm=+$('#calcBpm').value||0,bars=+$('#calcBars').value;$('#calcOut').textContent=bpm?fmtTime(bars*240/bpm):'–';
  const a=+$('#pA').value||0,b=+$('#pB').value||0;if(a&&b){const p=(a/b-1)*100;$('#pOut').textContent=(p>0?'+':'')+p.toFixed(1)+' %';$('#pOut').style.color=Math.abs(p)>8?'var(--bad)':Math.abs(p)>4?'var(--mid)':'var(--good)'}else $('#pOut').textContent='–';
}
function tap(){const now=performance.now();if(taps.length&&now-taps[taps.length-1]>2000)taps=[];taps.push(now);if(taps.length>9)taps.shift();
  if(taps.length>1){const iv=(taps[taps.length-1]-taps[0])/(taps.length-1);$('#tapBpm').textContent=(60000/iv).toFixed(1)}
  const b=$('#tapBtn');b.style.background='#ff5c3940';setTimeout(()=>b.style.background='',90)}
$('#school').addEventListener('click',e=>{const w=e.target.closest('[data-wk]');if(w){wheelSel=w.dataset.wk;const sc=scrollY;renderSchool();scrollTo(0,sc);return}if(e.target.id==='tapBtn')tap()});
$('#school').addEventListener('input',calcTools);
addEventListener('keydown',e=>{if(e.code==='Space'&&$('#tab-school').classList.contains('on')&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();tap()}});

/* ================= Home ================= */
const TIPS=[
  'Spiel im Warm-up ruhiger, als du denkst. Der Floor muss erst warm werden – der Peak kommt später.',
  'Starte neue Tracks immer auf der „Eins“ einer Phrase (alle 16 oder 32 Takte). Dann wirkt jeder Übergang geplant.',
  'Nie zwei Basslines gleichzeitig: Bass von Track B erst beim Bass-Swap reindrehen.',
  'Energie-Boost-Trick: Ein Wechsel um +2 auf dem Camelot-Rad (z. B. 8A → 10A) hebt die Stimmung spürbar.',
  'Pack immer einen zweiten USB-Stick ein. Sticks gehen genau dann kaputt, wenn man sie braucht.',
  'Gain so einstellen, dass die Pegelanzeige im grünen/gelben Bereich bleibt – rot klingt verzerrt und schadet der Anlage.',
  'Leute gehen zur Bar? Kurz Energie rausnehmen oder etwas Bekanntes spielen – dann wieder aufbauen.',
  'Bereite mehr Tracks vor, als du brauchst. Die 3 Alternativen pro Slot (⇄) sind dein Plan B.',
  'Bei großen Tempo-Sprüngen: lieber kurz und knackig wechseln (8 Takte) oder per Echo-Out, statt lange zu überblenden.',
];
function renderHome(){
  const box=$('#home'),h=new Date().getHours(),greet=h<11?'Guten Morgen':h<18?'Hallo':'Guten Abend',name=(state.brand.dj||'').trim();
  const up=state.gigs.filter(g=>daysUntil(g.date)>=0).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)),next=up[0];
  const avg=state.sets.length?Math.round(state.sets.reduce((a,s)=>a+s.score,0)/state.sets.length):'–';
  const H=libHealth(),tip=TIPS[Math.floor(Date.now()/864e5)%TIPS.length];
  const d=new Date();
  box.innerHTML=`<div class="hero"><div><h1>${greet}${name?',':''}<br><span>${name?esc(name):'DJ'}</span></h1>
      <div class="muted" style="margin-top:6px">${d.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'})}${up.length?` · ${up.length} kommende${up.length===1?'r Gig':' Gigs'}`:''}${state.sets.length?` · ${state.sets.length} gespeicherte Sets`:''}</div></div>
      <button class="btn pri" style="padding:14px 22px;font-size:16px" data-go="build">⚡ Set bauen</button></div>
    ${updateBannerHtml()}
    ${name?'':`<div class="small muted" style="margin-top:8px">Tipp: Trag deinen DJ-Namen ein – er erscheint hier und auf deinen PDF-Tracklisten. <input type="text" id="homeName" placeholder="DJ-Name" style="width:160px;margin-left:6px"></div>`}
    <div class="stats" style="margin-top:18px">
      <div class="stat"><div class="v">${state.sets.length}</div><div class="l">Gespeicherte Sets</div></div>
      <div class="stat"><div class="v">${state.tracks.length}</div><div class="l">Tracks in der Bibliothek</div></div>
      <div class="stat"><div class="v" style="color:${avg==='–'?'':scoreColor(avg)}">${avg}</div><div class="l">Ø Set-Score</div></div>
      <div class="stat"><div class="v">${up.length}</div><div class="l">Kommende Gigs</div></div></div>
    <div class="actions">
      <button class="action pri" data-go="build"><div class="ic">⚡</div><b>Set generieren</b><span>Stimmung wählen – Set in Sekunden</span></button>
      <button class="action" data-go="lib"><div class="ic">📥</div><b>Bibliothek importieren</b><span>Serato · Rekordbox · Traktor</span></button>
      <button class="action" data-go="live"><div class="ic">🎚️</div><b>Live-Assistent</b><span>Was passt als Nächstes?</span></button>
      <button class="action" data-go="gigs"><div class="ic">📅</div><b>Gig anlegen</b><span>Termin, Set & Packliste</span></button></div>
    <div class="homegrid">
      <div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Letzte Sets</h3><button class="btn sm" data-go="sets">Alle anzeigen →</button></div>
        <div style="margin-top:10px">${state.sets.slice(0,5).map(r=>{const sm=setSummary(r.ids);return`<div class="setcard" style="cursor:pointer" data-hopen="${r.id}"><div class="sbadge" style="border-color:${scoreColor(r.score)};color:${scoreColor(r.score)};width:46px;height:46px"><b style="font-size:17px">${r.score}</b><span>Score</span></div><div style="flex:1;min-width:0"><b>${esc(r.name)}</b><div class="small muted">${sm.ts.length} Tracks · ${sm.bpm} BPM · ${new Date(r.updated).toLocaleDateString('de-DE')}</div></div><div class="row" style="gap:4px">${sm.keys.map(keyHtml).join('')}</div></div>`}).join('')||`<div class="empty" style="padding:30px">Noch keine Sets gespeichert.<br><span class="small">${state.tracks.length?'Bau dein erstes Set und speichere es.':'Starte mit „Bibliothek importieren“ oder lade die Demo.'}</span></div>`}</div>
        <div class="hintbox" style="margin:14px 0 0">💡 <b>Tipp des Tages:</b> ${tip}</div>${NL()?`<div style="border-top:1px solid var(--line);margin-top:14px">${newsletterHtml(true)}</div>`:''}</div>
      <div style="display:grid;gap:16px">
        <div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Library Health</h3><button class="btn sm" data-go="lib">Verbessern →</button></div>
          ${state.tracks.length?`<div class="row" style="margin-top:10px;gap:16px">${ringSvg(H.score,96)}<div style="flex:1;min-width:150px">
            <div class="metric"><span>Genre</span><b style="color:${pctColor(H.genre)}">${Math.round(H.genre*100)} %</b></div>
            <div class="metric"><span>Tonart</span><b style="color:${pctColor(H.key)}">${Math.round(H.key*100)} %</b></div>
            <div class="metric"><span>Energie-Daten</span><b style="color:${pctColor(H.energy)}">${Math.round(H.energy*100)} %</b></div>
            <div class="metric"><span>Braucht Aufmerksamkeit</span><b style="color:${H.todo?'var(--mid)':'var(--good)'}">${H.todo+H.dups.length}</b></div></div></div>`:'<div class="small muted" style="margin-top:8px">Noch keine Bibliothek.</div>'}</div>
        <div class="card"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Nächster Gig</h3><button class="btn sm" data-go="gigs">Alle Gigs →</button></div>
          ${next?(()=>{const dd=new Date(next.date+'T00:00'),done=CHECK.filter(([k])=>next.check&&next.check[k]).length;return`<div class="row" style="margin-top:10px;align-items:flex-start;gap:12px"><div class="datebox" style="width:58px"><b>${dd.getDate()}</b><span>${MON[dd.getMonth()]}</span></div><div style="flex:1"><b>${esc(next.name)}</b><div class="small muted">${[next.place,next.time,fmtDur(next.len)].filter(Boolean).map(esc).join(' · ')} · <b style="color:var(--accent2)">${relDay(daysUntil(next.date))}</b></div><div class="small muted" style="margin-top:4px">🎒 Packliste ${done}/${CHECK.length}</div><div class="row" style="margin-top:8px;gap:6px"><button class="btn sm pri" data-hgig="${next.id}">⚡ Set für diesen Gig</button>${next.setId&&state.sets.find(s=>s.id===next.setId)?`<button class="btn sm" data-hopen="${next.setId}">Set öffnen</button>`:''}</div></div></div>`})():'<div class="small muted" style="margin-top:8px">Kein Gig geplant.</div>'}</div>
      </div></div>`;
}
$('#home').addEventListener('click',e=>{const el=e.target.closest('[data-go],[data-hopen],[data-hgig]');if(!el)return;const d=el.dataset;
  if(d.go){if(d.go==='lib'&&!state.tracks.length)toast('Tipp: Ohne eigene Bibliothek kannst du die Demo laden');goTab(d.go)}
  else if(d.hopen)openSet(d.hopen);else if(d.hgig)buildForGig(d.hgig)});
$('#home').addEventListener('change',e=>{if(e.target.id==='homeName'){state.brand.dj=e.target.value.trim();save();renderHome()}});

/* ================= Versionen, Neuigkeiten, Updates, Newsletter ================= */
const APP_VERSION='1.2.0';
const SITE_URL='https://setwerk-app.github.io/';
const RELEASES_API='https://api.github.com/repos/setwerk-app/setwerk-app.github.io/releases/latest';
const CHANGELOG={
  '1.2.0':['🪟 Setwerk gibt es jetzt auch für Windows (Installer)','🔔 Update-Hinweise direkt in der App','📬 Newsletter für neue Funktionen und Videos','🎵 Doppelte Songs landen nie zweimal im Set','📱 Besseres Layout auf dem Handy'],
  '1.1.0':['🏠 Home-Dashboard','🎧 Mix-Coach für jeden Übergang','⇄ 3 Alternativen pro Slot + Rückgängig','🎚️ Live-Assistent','🌙 Ganze Nacht in Kapiteln','📅 Gigs mit Packliste','🩺 Library Health','🎓 DJ-Schule mit Camelot-Rad'],
};
const vNum=v=>String(v||'0').replace(/^v/,'').split('.').map(n=>+n||0).reduce((a,n)=>a*1000+n,0);
const lsGet=k=>{try{return localStorage.getItem(k)}catch(_){return null}},lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(_){}};
const NL=()=>window.SETWERK_NEWSLETTER&&window.SETWERK_NEWSLETTER.action?window.SETWERK_NEWSLETTER:null;
function newsletterHtml(compact){
  const nl=NL();
  if(!nl)return compact?'':`<div class="small muted" style="margin-top:10px">🔔 Keine Neuigkeit verpassen: Auf <a href="https://github.com/setwerk-app/setwerk-app.github.io" target="_blank" style="color:var(--accent2)">GitHub</a> oben rechts auf <b>Watch → Custom → Releases</b> klicken.</div>`;
  return`<form class="nlform" action="${esc(nl.action)}" method="post" target="_blank" style="margin-top:12px">
    <div class="small" style="font-weight:700;margin-bottom:6px">📬 Updates, neue Funktionen & Video-Tutorials per E-Mail</div>
    <div class="row" style="gap:6px"><input type="email" name="${esc(nl.field||'email')}" required placeholder="deine@email.de" style="flex:1;min-width:180px"><button class="btn sm pri" type="submit">Anmelden</button></div>
    <div class="small muted" style="margin-top:6px">Du bekommst eine Bestätigungsmail (Double-Opt-in). Abmelden jederzeit mit einem Klick.</div></form>`;
}
function showWhatsNew(from){
  const vs=Object.keys(CHANGELOG).filter(v=>vNum(v)>vNum(from)).sort((a,b)=>vNum(b)-vNum(a));if(!vs.length)return;
  const m=document.createElement('div');m.className='modal';m.innerHTML=`<div class="card" style="max-width:480px"><h2>✨ Neu in Setwerk ${APP_VERSION}</h2>
    ${vs.map(v=>`<div style="margin-top:12px"><div class="small muted" style="font-weight:700">Version ${v}</div><ul style="margin:6px 0 0;padding-left:18px;line-height:1.7">${CHANGELOG[v].map(x=>`<li>${x}</li>`).join('')}</ul></div>`).join('')}
    ${newsletterHtml()}
    <div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn pri" id="wnOk">Los geht’s</button></div></div>`;
  document.body.appendChild(m);const close=()=>m.remove();m.querySelector('#wnOk').onclick=close;m.onclick=e=>{if(e.target===m)close()};
}
let updateInfo=null;
async function checkForUpdate(){
  const cur=window.__SETWERK_VERSION__;if(!cur)return; // nur in der Mac-/Windows-App; die Web-App aktualisiert sich selbst
  try{
    const cache=JSON.parse(lsGet('setwerk.update')||'null');let tag,url;
    if(cache&&Date.now()-cache.t<6*36e5){tag=cache.tag}else{const r=await fetch(RELEASES_API);if(!r.ok)return;const j=await r.json();tag=j.tag_name;lsSet('setwerk.update',JSON.stringify({t:Date.now(),tag}))}
    if(vNum(tag)>vNum(cur)){updateInfo={tag};if($('nav button.on')?.dataset.tab==='home')renderHome()}
  }catch(_){}
}
function updateBannerHtml(){
  if(!updateInfo)return'';
  const dl=SITE_URL+(/Windows/.test(navigator.userAgent)?'#web':'#pkg');
  return`<div class="hintbox" style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:14px 0 0;border-color:#3ddc9766;background:#3ddc9712">
    <span>🔔 <b>Neue Version ${esc(updateInfo.tag.replace(/^v/,''))} verfügbar</b> – du nutzt ${esc(window.__SETWERK_VERSION__)}.</span>
    <a class="btn sm pri" href="${dl}" target="_blank" style="text-decoration:none">Jetzt aktualisieren</a></div>`;
}
(()=>{const seen=lsGet('setwerk.seenVersion');if(seen&&vNum(seen)<vNum(APP_VERSION))setTimeout(()=>showWhatsNew(seen),600);lsSet('setwerk.seenVersion',APP_VERSION);setTimeout(checkForUpdate,1500)})();

/* ================= Wiring ================= */
function renderExtras(){
  renderSets();renderGigs();renderHealth();renderAudioBox();
  const on=$('nav button.on')?.dataset.tab;
  if(on==='home')renderHome();if(on==='live')renderLive();if(on==='school'&&!$('#school').innerHTML)renderSchool();
}
function onTab(t){if(t==='home')renderHome();if(t==='live')renderLive();if(t==='school')renderSchool();if(t==='gigs')renderGigs();if(t==='sets')renderSets();if(t==='lib'){renderHealth();renderAudioBox()}}
fillGigForm(null);renderChapters();renderExtras();renderHome();
if(state.set)renderSet();
// Hash links (#build, #gigs …) once all tabs exist
(()=>{const t=location.hash.slice(1);if(t)goTab(t)})();
