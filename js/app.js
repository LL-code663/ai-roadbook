/* ================= app ================= */
const $ = s => document.querySelector(s);
const store = {get(k){try{return localStorage.getItem(k)}catch(e){return null}}, set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const esc = s => String(s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const href = u => esc(encodeURI(decodeURI(u)));
const fmt = (s,o) => s.replace(/\{(\w)\}/g,(m,k)=>o[k]!==undefined?o[k]:m);
const norm = s => (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
const FIELD_IDS = Object.keys(FIELDS).filter(f=>f!=="other");

let ui = "zh";
const L = () => I18N[ui];
const T = r => r.t[ui] || r.t.en;
const F = id => FIELDS[id][ui];
const short = s => s.split(/ \/ |・/)[0];

/* ---------- profile ----------
   status: work | nowork | null (skipped)
   sub (when nowork): student | freelance | other | null
   occ (when work): OCC id | "other" | null
   major (when student): field id | "other" | null, majorText: what they typed
   interests: [INTERESTS ids]   goal: use|build|theory|null   code: 0|1|2|null */
const blank = () => ({status:null, sub:null, occ:null, major:null, majorText:"", interests:[], goal:null, code:null, pref:"mine", zero:false, done:false});
let P = blank();
function save(){ store.set("roadbook2", JSON.stringify({p:P, ui})); }

function profileFields(){
  const f=[];
  if(P.status==="work" && OCC[P.occ]) f.push(...OCC[P.occ].fields);
  if(P.status==="nowork" && P.sub==="student" && FIELDS[P.major] && P.major!=="other") f.push(P.major);
  P.interests.forEach(i=>INTERESTS[i].fields.forEach(x=>{ if(!f.includes(x)) f.push(x); }));
  return f;
}
function primaryLabel(){
  if(P.status==="work" && OCC[P.occ]) return OCC[P.occ][ui];
  if(P.status==="nowork" && P.sub==="student" && FIELDS[P.major] && P.major!=="other") return P.majorText || F(P.major)[0];
  return null;
}
const goalOf = () => P.goal || "use";
const codeOf = () => (P.code===null ? 0 : P.code);

/* ---------- resources helpers ---------- */
function rich(text){
  const seen=new Set();
  return esc(text).replace(/\{(\w+):([^}]+)\}/g,(m,id,w)=>{
    if(!GLOSS[id] || seen.has(id)) return w;
    seen.add(id);
    return `<button type="button" class="term" data-g="${id}">${w}</button>`;
  });
}
const plain = t => t.replace(/\{\w+:([^}]+)\}/g,"$1");
function entry(r){ return r.url[ui] ? {u:r.url[ui], label:L().open.local} : {u:r.url.def, label:L().open[r.kind]}; }
const isGh = r => entry(r).u.startsWith(GH);
const readable = r => r.langs.includes(ui) || r.langs.includes("en");
const langChip = r => r.langs.map(l=>L().langName[l]).join(" · ");

function detectField(text){
  const t=norm(text).trim(); if(!t) return null;
  let best=null, bestLen=0;
  for(const [id,f] of Object.entries(FIELDS)) for(const k of f.kw){
    const kk=norm(k); if(t.includes(kk) && kk.length>bestLen){best=id;bestLen=kk.length;}
  }
  return best;
}

/* ---------- scoring & route ---------- */
function makeUser(){
  return {fields:profileFields(), goal:goalOf(), code:codeOf(), pref:P.pref, zero:P.zero};
}
function score(r,u){
  let s=0;
  if(u.fields.length && r.fields.some(f=>u.fields.includes(f))) s+=4;
  else if(r.fields.includes("all")) s+=1.5;
  if(r.goals.includes(u.goal)) s+=3;
  const gap=r.code-u.code; if(gap>0) s-=gap*2;
  if(u.code===0 && r.code===0) s+=1;
  if(u.code===0 && !isGh(r)) s+=1.5;
  if(r.langs.includes(ui)) s += (u.pref==="mine" ? 1.5 : 0.5);
  else if(r.langs.includes("en")) s += (u.pref==="mine" ? -0.5 : 0);
  else s -= 6;
  return s;
}
function reasons(r,u){
  const out=[];
  if(u.fields.length && r.fields.some(f=>u.fields.includes(f))){
    const pl=primaryLabel();
    const viaPrimary = pl && r.fields.some(f=>(P.status==="work" ? (OCC[P.occ]||{fields:[]}).fields : [P.major]).includes(f));
    out.push({t: viaPrimary ? fmt(L().whyField,{f:short(pl)}) : L().whyInterest, c:"why"});
  }
  if(r.goals.includes(u.goal)) out.push({t:L().whyGoal, c:"why"});
  if(r.code>u.code) out.push({t:L().warn, c:"warn"});
  return out;
}
const prereqFor = u => R.find(r=>r.prereq === ((ui==="zh" && !u.zero) ? "zh" : "other"));
function buildRoute(u){
  const used=new Set(), route=[], scored=R.map(r=>({r, s:score(r,u)}));
  const okZero=(r,n)=>!u.zero || (n<3 ? (r.code===0 && !isGh(r)) : (!isGh(r) && r.code<=1));
  for(let n=1;n<=3;n++){
    let items; const pre = u.code===0 ? prereqFor(u) : null;
    if(n===3 && u.goal==="use"){
      const next=Math.min(u.code+1,2);
      items=scored.filter(x=>!used.has(x.r.id) && okZero(x.r,3) && x.r.stage<3 &&
              (x.r===pre || (!x.r.prereq && x.r.code===next && (x.r.goals.includes("use")||x.r.goals.includes("build")))))
            .map(x=>({r:x.r, s:x.s + 2*(x.r.code-u.code) + (x.r===pre?3:0)}));
    } else if(n===3 && u.zero){
      items=scored.filter(x=>!used.has(x.r.id) && okZero(x.r,3) && (x.r===pre || (x.r.stage>=2 && !x.r.prereq && x.r.goals.includes(u.goal))))
            .map(x=>({r:x.r, s:x.s + (x.r===pre?3:0)}));
    } else {
      items=scored.filter(x=>x.r.stage===n && !used.has(x.r.id) && !x.r.prereq && okZero(x.r,n) && (n<3 || x.r.goals.includes(u.goal)));
    }
    items.sort((a,b)=>b.s-a.s);
    let pick=items.filter(x=>x.s>=(n===3?2.5:3)).slice(0,3);
    if(n===1 && u.code===0 && u.goal!=="use" && !u.zero) pick=[{r:pre},...pick].slice(0,3);
    if(pick.length===0) pick=items.filter(x=>x.s>-2).slice(0,2);
    pick.forEach(x=>used.add(x.r.id));
    const st=L().stages[n-1];
    route.push({n, title:st[0], sub:st[1][u.goal], items:pick.map(x=>x.r)});
  }
  return route;
}

/* ---------- recommendation view ---------- */
function cardHTML(r,u){
  const t=T(r), e=entry(r), gh=e.u.startsWith(GH);
  const why=reasons(r,u).map(x=>`<span class="chip ${x.c}">${esc(x.t)}</span>`).join("");
  const pre=r.prereq ? `<span class="chip warn">${esc(L().prereq)}</span>` : "";
  const subs=r.subs ? `<span class="chip">${esc(L().subs)}</span>` : "";
  const repo=r.repo && !gh ? `<a class="repo-link" href="${GH+r.repo}" target="_blank" rel="noopener">${esc(L().repoLink)}</a>` : "";
  return `<article class="card${r.prereq?' prereq':''}">
    <div class="card-top"><h4>${esc(t[0])}</h4><span class="src ${gh?'gh':'web'}">${esc(gh?L().srcGh:L().srcWeb)}</span></div>
    <p>${rich(t[1])}</p>
    <div class="howto"><b>${esc(L().howto)}</b>${rich(t[2])}</div>
    <div class="chips">${pre}${why}<span class="chip">${esc(langChip(r))}</span>${subs}<span class="chip">${esc(L().codeReq[r.code])}</span></div>
    <div class="actions"><a class="go" href="${href(e.u)}" target="_blank" rel="noopener">${esc(e.label)} ↗</a>${repo}</div>
  </article>`;
}
function summaryParts(){
  const l=L(), parts=[];
  if(P.status==="work") parts.push(l.statusLabel.work);
  if(P.status==="nowork" && P.sub) parts.push(l.statusLabel[P.sub]);
  if(P.status==="work" && OCC[P.occ]) parts.push(OCC[P.occ][ui]);
  if(P.status==="nowork" && P.sub==="student" && P.major) parts.push(P.majorText || (P.major==="other" ? l.otherMajor : F(P.major)[0]));
  if(P.interests.length) parts.push(fmt(l.interestsLabel,{x:P.interests.map(i=>INTERESTS[i][ui][0]).join(l.listSep)}));
  if(P.goal) parts.push(l.goalShort[P.goal]);
  if(P.code!==null) parts.push(l.codeShort[P.code]);
  if(P.zero) parts.push(l.zeroTag);
  return parts;
}
let lastRoute=null;
function renderRec(){
  const u=makeUser(), l=L();
  const parts=summaryParts();
  $("#summary").innerHTML = `${parts.length ? `<span><b>${esc(parts[0])}</b>${parts.slice(1).map(p=>' · '+esc(p)).join("")}</span>` : ""}<button type="button" class="linkbtn" data-go="settings">${esc(l.edit)}</button>`;
  // ideas: occupation/major first, then interests, else a general start
  let title, ideas;
  const pl=primaryLabel();
  if(pl){
    const fid = P.status==="work" ? OCC[P.occ].fields[0] : P.major;
    title=fmt(l.ideas,{f:pl}); ideas=F(fid)[2];
  } else if(P.interests.length){
    title=l.ideasInterest; ideas=P.interests.map(i=>INTERESTS[i][ui][1]);
  } else {
    title=l.ideasStart; ideas=F("other")[2];
  }
  $("#ideas").innerHTML=`<h3>${esc(title)}</h3><ul>${ideas.map(i=>`<li>${esc(i)}</li>`).join("")}</ul>`;
  lastRoute=buildRoute(u);
  $("#stages").innerHTML=lastRoute.map(s=>`
    <section class="stage">
      <div class="rail"><span class="dot">${s.n}</span></div>
      <div class="stage-body">
        <h3>${esc(s.title)}</h3>
        <p class="sub">${esc(s.sub)}</p>
        <div class="cards">${s.items.map(r=>cardHTML(r,u)).join("")}</div>
      </div>
    </section>`).join("");
}

/* ---------- onboarding wizard ---------- */
let hist=["status"];
function nextStep(step){
  switch(step){
    case "status": return P.status==="work" ? "occ" : P.status==="nowork" ? "sub" : "goal";
    case "sub": return P.sub==="student" ? "major" : (P.sub==="freelance"||P.sub==="other") ? "interest" : "goal";
    case "occ": return P.occ==="other" ? "interest" : "goal";
    case "major": return P.major==="other" ? "interest" : "goal";
    case "interest": return "goal";
    case "goal": return "code";
    default: return null;
  }
}
function answer(step, value){
  if(step==="status"){ P.status=value; P.sub=null; P.occ=null; P.major=null; P.majorText=""; P.interests=[]; }
  if(step==="sub"){ P.sub=value; P.major=null; P.majorText=""; P.interests=[]; }
  if(step==="occ"){ P.occ=value; if(value!=="other") P.interests=[]; }
  if(step==="major"){ P.major=value; if(value!=="other") P.interests=[]; }
  if(step==="goal") P.goal=value;
  if(step==="code") P.code=value;
  advance(step);
}
function advance(step){
  save();
  const n=nextStep(step);
  if(!n){ finish(); return; }
  hist.push(n); renderWizard();
}
function finish(){ P.done=true; save(); show("rec"); }
const tile = (v,label,small,cls="",pressed=false) => `<button type="button" class="tile ${cls}" data-v="${v}" aria-pressed="${pressed}"><b>${esc(label)}</b>${small?`<small>${esc(small)}</small>`:""}</button>`;
function renderWizard(){
  const l=L(), step=hist[hist.length-1], q=l.q[step];
  let body="", footRight="";
  if(step==="status"){
    body=`<div class="tiles">${["work","nowork"].map(k=>tile(k,l.status[k][0],l.status[k][1],"",P.status===k)).join("")}${tile("",l.skip,"","skip")}</div>`;
  } else if(step==="sub"){
    body=`<div class="tiles">${["student","freelance","other"].map(k=>tile(k,l.sub[k][0],l.sub[k][1],"",P.sub===k)).join("")}${tile("",l.skip,"","skip")}</div>`;
  } else if(step==="occ"){
    body=`<div class="tiles compact">${Object.keys(OCC).map(k=>tile(k,OCC[k][ui],"","",P.occ===k)).join("")}${tile("other",l.otherOcc,"","other",P.occ==="other")}${tile("",l.skip,"","skip")}</div>`;
  } else if(step==="major"){
    body=`<div class="major-in"><input class="text-in" id="wz-major" placeholder="${esc(l.majorInputPh)}" value="${esc(P.majorText)}" list="wz-majors"><datalist id="wz-majors">${l.majors.map(m=>`<option value="${esc(m)}">`).join("")}</datalist><button type="button" class="btn primary" id="wz-use" disabled>${esc(l.useTyped)}</button></div>
      <p class="detect-msg" id="wz-detect"></p>
      <div class="tiles compact">${FIELD_IDS.map(k=>tile(k,F(k)[0],"","",P.major===k)).join("")}${tile("other",l.otherMajor,"","other",P.major==="other")}${tile("",l.skip,"","skip")}</div>`;
  } else if(step==="interest"){
    body=`<div class="chips-pick">${Object.keys(INTERESTS).map(k=>`<button type="button" class="pick" data-i="${k}" aria-pressed="${P.interests.includes(k)}">${esc(INTERESTS[k][ui][0])}</button>`).join("")}</div>`;
    footRight=`<button type="button" class="btn" id="wz-iskip">${esc(l.skip)}</button><button type="button" class="btn primary" id="wz-inext">${esc(l.next)}</button>`;
  } else if(step==="goal"){
    body=`<div class="tiles">${["use","build","theory"].map(k=>tile(k,l.goals[k][0],l.goals[k][1],"",P.goal===k)).join("")}${tile("",l.skip,"","skip")}</div>`;
  } else if(step==="code"){
    body=`<div class="tiles">${[0,1,2].map(k=>tile(k,l.codes[k],"","",P.code===k)).join("")}${tile("",l.skip,"","skip")}</div>`;
  }
  const back = hist.length>1 ? `<button type="button" class="btn" id="wz-back">${esc(l.back)}</button>` : "";
  $("#wizard").innerHTML = `<div class="wz-body">
      <span class="wz-step">${esc(fmt(l.stepN,{a:hist.length}))}</span>
      ${hist.length===1 ? `<p class="wz-welcome">${esc(l.welcome)}</p>` : ""}
      <h2>${esc(q[0])}</h2><p class="wz-sub">${esc(q[1])}</p>
      ${body}
    </div>
    <div class="wz-foot">${back}<button type="button" class="linkbtn" id="wz-skipall">${esc(l.skipAll)}</button><div class="right">${footRight}</div></div>`;

  // wire up
  $("#wizard").querySelectorAll(".tile").forEach(b=>b.onclick=()=>{
    const raw=b.dataset.v; let v = raw==="" ? null : raw;
    if(step==="code" && v!==null) v=+v;
    if(step==="major") P.majorText="";
    answer(step, v);
  });
  if(step==="interest"){
    $("#wizard").querySelectorAll(".pick").forEach(b=>b.onclick=()=>{
      const k=b.dataset.i; P.interests = P.interests.includes(k) ? P.interests.filter(x=>x!==k) : [...P.interests,k];
      b.setAttribute("aria-pressed", P.interests.includes(k));
    });
    $("#wz-inext").onclick=()=>advance("interest");
    $("#wz-iskip").onclick=()=>{ P.interests=[]; advance("interest"); };
  }
  if(step==="major"){
    const inp=$("#wz-major"), btn=$("#wz-use"), msg=$("#wz-detect");
    const upd=()=>{
      const v=inp.value.trim(); btn.disabled=!v;
      if(!v){ msg.textContent=""; return; }
      const d=detectField(v);
      msg.textContent = d ? fmt(l.detected,{f:F(d)[0]}) : l.notDetected;
      $("#wizard").querySelectorAll(".tile").forEach(t=>t.setAttribute("aria-pressed", d ? t.dataset.v===d : t.dataset.v==="other"));
    };
    inp.oninput=upd; upd();
    const go=()=>{ const v=inp.value.trim(); if(!v) return; P.majorText=v; answer("major", detectField(v)||"other"); };
    btn.onclick=go; inp.onkeydown=e=>{ if(e.key==="Enter"){ e.preventDefault(); go(); } };
  }
  if($("#wz-back")) $("#wz-back").onclick=()=>{ hist.pop(); renderWizard(); };
  $("#wz-skipall").onclick=finish;
}

/* ---------- settings ---------- */
function pills(group, opts, current, multi=false){
  return `<div class="pills" data-group="${group}">${opts.map(([v,label,cls])=>{
    const on = multi ? current.includes(v) : current===v;
    return `<button type="button" class="pill ${cls||""}" data-v="${v===null?"":v}" aria-pressed="${on}">${esc(label)}</button>`;
  }).join("")}</div>`;
}
function renderSettings(){
  const l=L(), U=["",l.notSure,"unsure"];
  const g=(title,inner)=>`<div class="sgroup"><h3>${esc(title)}</h3><div>${inner}</div></div>`;
  let h="";
  h+=g(l.setStatus, pills("status",[["work",l.status.work[0]],["nowork",l.status.nowork[0]],U], P.status||""));
  if(P.status==="nowork") h+=g(l.setSub, pills("sub",[["student",l.sub.student[0]],["freelance",l.sub.freelance[0]],["other",l.sub.other[0]],U], P.sub||""));
  if(P.status==="work") h+=g(l.setOcc, pills("occ",[...Object.keys(OCC).map(k=>[k,OCC[k][ui]]),["other",l.otherOcc],U], P.occ||""));
  if(P.status==="nowork" && P.sub==="student") h+=g(l.setMajor, `<input class="text-in" id="set-major" placeholder="${esc(l.majorInputPh)}" value="${esc(P.majorText)}">`+pills("major",[...FIELD_IDS.map(k=>[k,F(k)[0]]),["other",l.otherMajor],U], P.major||""));
  h+=g(l.setInterests, pills("interests", Object.keys(INTERESTS).map(k=>[k,INTERESTS[k][ui][0]]), P.interests, true));
  h+=g(l.goal, pills("goal",[...["use","build","theory"].map(k=>[k,l.goals[k][0]]),U], P.goal||""));
  h+=g(l.code, pills("code",[...[0,1,2].map(k=>[String(k),l.codes[k]]),U], P.code===null?"":String(P.code)));
  h+=g(l.resLang, pills("pref",[["mine",l.resMine],["any",l.resAny]], P.pref));
  h+=g(l.setOther, `<label class="zero" for="set-zero"><input type="checkbox" id="set-zero" ${P.zero?"checked":""}><span><b>${esc(l.zeroT)}</b><span>${esc(l.zeroD)}</span></span></label>`);
  $("#sets").innerHTML=h;

  $("#sets").querySelectorAll(".pills").forEach(box=>box.onclick=e=>{
    const b=e.target.closest(".pill"); if(!b) return;
    const grp=box.dataset.group, raw=b.dataset.v, v = raw==="" ? null : raw;
    if(grp==="status"){ if(P.status!==v){ P.status=v; P.sub=null; P.occ=null; P.major=null; P.majorText=""; } }
    else if(grp==="sub"){ if(P.sub!==v){ P.sub=v; P.major=null; P.majorText=""; } }
    else if(grp==="occ") P.occ=v;
    else if(grp==="major"){ P.major=v; P.majorText=""; }
    else if(grp==="interests") P.interests = P.interests.includes(v) ? P.interests.filter(x=>x!==v) : [...P.interests,v];
    else if(grp==="goal") P.goal=v;
    else if(grp==="code") P.code = v===null ? null : +v;
    else if(grp==="pref") P.pref=v;
    save(); renderSettings();
  });
  const sm=$("#set-major");
  if(sm) sm.onchange=()=>{ const v=sm.value.trim(); P.majorText=v; if(v) P.major=detectField(v)||"other"; save(); renderSettings(); };
  $("#set-zero").onchange=e=>{ P.zero=e.target.checked; save(); };
}

/* ---------- library ---------- */
const lib={q:"", src:"all", code:"all", lang:"all", type:"all"};
function fgroup(el,key,opts){
  el.innerHTML=opts.map(([v,label])=>`<button type="button" data-v="${v}" aria-pressed="${v===lib[key]}">${esc(label)}</button>`).join("");
  el.onclick=e=>{ const b=e.target.closest("button"); if(!b) return; lib[key]=b.dataset.v; el.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed", x===b)); renderLib(); };
}
function buildFilters(){
  const A=[["all",L().all]];
  fgroup($("#f-src"),"src",[...A,["web",L().srcWeb],["gh",L().srcGh]]);
  fgroup($("#f-code"),"code",[...A,...L().codeReq.map((c,i)=>[String(i),c])]);
  fgroup($("#f-lang"),"lang",[...A,...UI_LANGS.map(([k,n])=>[k,n])]);
  fgroup($("#f-type"),"type",[...A,...[...new Set(R.map(r=>r.type))].map(t=>[t,L().types[t]])]);
}
function renderLib(){
  const q=norm(lib.q);
  const list=R.filter(r=>{
    const gh=isGh(r), t=T(r);
    if(lib.src==="web" && gh) return false;
    if(lib.src==="gh" && !gh) return false;
    if(lib.code!=="all" && String(r.code)!==lib.code) return false;
    if(lib.lang!=="all" && !r.langs.includes(lib.lang)) return false;
    if(lib.type!=="all" && r.type!==lib.type) return false;
    if(q && !norm(t[0]+(r.repo||"")+plain(t[1])+plain(t[2])+L().types[r.type]).includes(q)) return false;
    return true;
  }).sort((a,b)=>(readable(b)-readable(a)) || a.code-b.code || a.stage-b.stage);
  $("#count").textContent=fmt(L().count,{a:list.length,b:R.length});
  $("#rows").innerHTML=list.length ? list.map(r=>{
    const t=T(r), e=entry(r), gh=e.u.startsWith(GH);
    return `<div class="row">
      <div class="nm"><b>${esc(t[0])}</b><span class="src ${gh?'gh':'web'}">${esc(gh?L().srcGh:L().srcWeb)}</span></div>
      <div class="body"><p>${rich(t[1])}</p><div class="howto"><b>${esc(L().howto)}</b>${rich(t[2])}</div>
        <div class="links"><a href="${href(e.u)}" target="_blank" rel="noopener">${esc(e.label)} ↗</a>${r.repo && !gh ? `<a class="muted" href="${GH+r.repo}" target="_blank" rel="noopener">${esc(L().repoLink)}</a>`:""}</div></div>
      <div class="chips"><span class="chip">${esc(L().types[r.type])}</span><span class="chip">${esc(L().codeReq[r.code])}</span><span class="chip">${esc(langChip(r))}</span></div>
    </div>`;}).join("") : `<div class="empty">${esc(L().empty)}</div>`;
}

/* ---------- glossary popover ---------- */
const pop=$("#pop"); let popFor=null;
function showPop(btn){
  if(popFor===btn && !pop.hidden){ hidePop(); return; }
  const g=GLOSS[btn.dataset.g][ui];
  pop.innerHTML=`<b>${esc(g[0])}</b>${esc(g[1])}`; pop.hidden=false; popFor=btn;
  const b=btn.getBoundingClientRect(), w=pop.offsetWidth, vw=document.documentElement.clientWidth;
  pop.style.left=(Math.max(16,Math.min(b.left,vw-w-16))+window.scrollX)+"px"; pop.style.top=(b.bottom+window.scrollY+6)+"px";
}
function hidePop(){ pop.hidden=true; popFor=null; }
document.addEventListener("click", e=>{
  const t=e.target.closest(".term"); if(t){ e.preventDefault(); showPop(t); return; }
  if(!e.target.closest("#pop")) hidePop();
  const go=e.target.closest("[data-go]"); if(go) show(go.dataset.go);
});
document.addEventListener("keydown", e=>{ if(e.key==="Escape") hidePop(); });
window.addEventListener("resize", hidePop);

/* ---------- views ---------- */
const VIEWS=["onboard","rec","lib","guide","settings"];
let view="onboard";
function show(v){
  if(!VIEWS.includes(v)) v="rec";
  view=v; hidePop();
  VIEWS.forEach(x=>{ $("#v-"+x).hidden = x!==v; });
  $("#tabs").hidden = v==="onboard";
  $("#tabs").querySelectorAll("button").forEach(b=>b.setAttribute("aria-current", b.dataset.v===v ? "page" : "false"));
  if(v==="onboard") renderWizard();
  if(v==="rec") renderRec();
  if(v==="lib") renderLib();
  if(v==="settings") renderSettings();
  try{ if(v!=="onboard" && location.hash!=="#"+v) history.replaceState(null,"","#"+v); }catch(e){}
  window.scrollTo(0,0);
}

function applyLang(){
  const l=L();
  document.documentElement.lang=UI_LANGS.find(x=>x[0]===ui)[2];
  document.title=l.docTitle;
  $("#brand").innerHTML=`${esc(l.h1[0])}<span class="hl">${esc(l.h1[1])}</span>`;
  $("#langs").innerHTML=UI_LANGS.map(([k,n])=>`<button type="button" data-l="${k}" aria-pressed="${k===ui}" lang="${k}">${n}</button>`).join("");
  $("#tabs").innerHTML=["rec","lib","guide","settings"].map(k=>`<button type="button" data-v="${k}">${esc(l.nav[k])}</button>`).join("");
  $("#h1").innerHTML=`${esc(l.h1[0])}<span class="hl">${esc(l.h1[1])}</span>`;
  $("#lede").textContent=l.lede;
  $("#m-total").innerHTML=fmt(l.mTotal,{n:R.length});
  $("#m-web").innerHTML=fmt(l.mWeb,{n:R.filter(r=>!isGh(r)).length});
  $("#m-date").innerHTML=l.mDate;
  document.querySelectorAll("[data-i]").forEach(el=>{ if(typeof l[el.dataset.i]==="string") el.textContent=l[el.dataset.i]; });
  $("#q").placeholder=l.search; $("#q").setAttribute("aria-label", l.search);
  $("#steps").innerHTML=l.steps.map(s=>`<li><div><b>${esc(s[0])}</b><span>${esc(s[1])}</span></div></li>`).join("");
  $("#gloss").innerHTML=Object.values({...GLOSS_EXTRA,...GLOSS}).map(g=>`<div><dt>${esc(g[ui][0])}</dt><dd>${esc(g[ui][1])}</dd></div>`).join("");
  buildFilters();
}

function init(){
  let saved=null; try{ saved=JSON.parse(store.get("roadbook2")||"null"); }catch(e){}
  let old=null; try{ old=JSON.parse(store.get("roadbook")||"null"); }catch(e){}
  // English by default; a language the visitor picked before is remembered
  ui = saved && I18N[saved.ui] ? saved.ui : old && I18N[old.ui] ? old.ui : "en";
  if(saved && saved.p) P=Object.assign(blank(), saved.p);
  applyLang();

  $("#langs").addEventListener("click", e=>{ const b=e.target.closest("button"); if(!b || b.dataset.l===ui) return; ui=b.dataset.l; save(); applyLang(); show(view); });
  $("#tabs").addEventListener("click", e=>{ const b=e.target.closest("button"); if(b) show(b.dataset.v); });
  $("#brand").addEventListener("click", ()=>show(P.done ? "rec" : "onboard"));
  $("#see-rec").addEventListener("click", ()=>show("rec"));
  $("#restart").addEventListener("click", ()=>{ const keep={pref:P.pref, zero:P.zero}; P=Object.assign(blank(), keep); hist=["status"]; save(); show("onboard"); });
  $("#q").addEventListener("input", e=>{ lib.q=e.target.value.trim(); renderLib(); });
  $("#copy").addEventListener("click", ()=>{
    if(!lastRoute) return; const l=L();
    const lines=[`${l.copyHead} · ${summaryParts().join(" · ")}`];
    lastRoute.forEach(s=>{ lines.push("",`${s.n}. ${s.title}`); s.items.forEach(r=>{ const t=T(r); lines.push(`- ${t[0]}: ${encodeURI(decodeURI(entry(r).u))}`,`  ${l.copyOpen}${plain(t[2])}`); }); });
    const done=ok=>{ const t=$("#toast"); t.textContent=ok?l.copied:l.copyFail; t.hidden=false; clearTimeout(t._h); t._h=setTimeout(()=>t.hidden=true,1800); };
    try{ navigator.clipboard.writeText(lines.join("\n")).then(()=>done(true),()=>done(false)); }catch(e){ done(false); }
  });
  window.addEventListener("hashchange", ()=>{ const h=location.hash.slice(1); if(P.done && VIEWS.includes(h) && h!==view) show(h); });

  const h=location.hash.slice(1);
  show(P.done ? (VIEWS.includes(h) && h!=="onboard" ? h : "rec") : "onboard");
}
init();
