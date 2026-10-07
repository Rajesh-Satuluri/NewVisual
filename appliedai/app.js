/* ============================================================
   Applied AI — Study Lab  ·  App shell / router
   ============================================================ */
(function(){
  const M=MODULE, L=M.lessons;
  const order=[]; M.groups.forEach(g=>g.lessons.forEach(id=>order.push(id)));
  const app=document.getElementById("app");
  const navEl=document.getElementById("nav");
  const contentEl=document.getElementById("content");
  const crumbEl=document.getElementById("crumb");
  const searchEl=document.getElementById("search");
  const progFill=document.getElementById("prog-fill");
  const progTxt=document.getElementById("prog-txt");
  let current=null, destroyViz=null;

  /* ---- visited state ---- */
  const VKEY="aai-eda-visited";
  function getVisited(){try{return JSON.parse(localStorage.getItem(VKEY)||"[]");}catch(e){return [];}}
  function markVisited(id){const v=getVisited();if(!v.includes(id)){v.push(id);try{localStorage.setItem(VKEY,JSON.stringify(v));}catch(e){}}updateProgress();syncNavMarks();}
  function updateProgress(){const v=getVisited().filter(id=>order.includes(id)).length;progTxt.textContent=`${v} / ${order.length}`;progFill.style.width=(v/order.length*100)+"%";}

  /* ---- build nav ---- */
  function buildNav(filter){
    navEl.innerHTML="";const f=(filter||"").trim().toLowerCase();
    M.groups.forEach(g=>{
      const items=g.lessons.filter(id=>{if(!f)return true;const l=L[id];return (l.title+" "+l.sub+" "+l.tag).toLowerCase().includes(f);});
      if(!items.length)return;
      const gh=document.createElement("div");gh.className="nav-group";gh.textContent=g.name;navEl.appendChild(gh);
      items.forEach(id=>{
        const l=L[id],it=document.createElement("div");
        it.className="nav-item"+(id===current?" active":"")+(getVisited().includes(id)?" visited":"");
        it.dataset.id=id;
        it.innerHTML=`<span class="ic">${l.icon}</span><span class="tx">${l.title}</span><span class="done">✓</span>`;
        it.onclick=()=>{go(id);closeNav();};
        navEl.appendChild(it);
      });
    });
    if(!navEl.children.length){const e=document.createElement("div");e.className="nav-group";e.textContent="No matches";navEl.appendChild(e);}
  }
  function syncNavMarks(){[...navEl.querySelectorAll(".nav-item")].forEach(it=>{it.classList.toggle("active",it.dataset.id===current);it.classList.toggle("visited",getVisited().includes(it.dataset.id));});}

  /* ---- render a lesson ---- */
  function render(id){
    if(destroyViz){try{destroyViz();}catch(e){}destroyViz=null;}
    const l=L[id];if(!l){renderHome();return;}
    const idx=order.indexOf(id);
    let html=`<div class="l-tag">${l.icon} ${l.tag}</div>
      <h1 class="l-title">${l.title}</h1>
      <p class="l-sub">${l.sub}</p>
      <div class="l-hr"></div>`;

    // blocks (concept text, keys, callouts) — split around viz insertion
    (l.blocks||[]).forEach(b=>{
      html+=`<div class="block">`;
      if(b.h2)html+=`<div class="h2"><span class="dot"></span>${b.h2}</div>`;
      if(b.p)b.p.forEach(p=>html+=`<p class="p">${p}</p>`);
      if(b.keys){html+=`<ul class="keys">`+b.keys.map(k=>`<li>${k}</li>`).join("")+`</ul>`;}
      if(b.callout==="formula"){html+=`<div class="callout formula"><div class="fx">${b.fx}</div><div class="fex">${b.fex}</div></div>`;}
      else if(b.callout){html+=`<div class="callout ${b.callout}"><span class="ci">${b.ci}</span><div>${b.html}</div></div>`;}
      html+=`</div>`;
    });

    // viz panel
    html+=`<div class="viz"><div class="viz-head"><span class="vb">Interactive</span><span class="vt">${l.title}</span><span class="sp"></span></div>
      <div class="viz-stage" id="viz-stage"></div><div class="viz-ctrls" id="viz-ctrls"></div>
      <div class="viz-caption">${l.vizCaption||""}</div></div>`;

    // Q&A
    if(l.qa&&l.qa.length){
      html+=`<div class="block"><div class="h2"><span class="dot"></span>Interview Q&amp;A</div><div class="qa-wrap">`;
      l.qa.forEach((qa,i)=>{html+=`<div class="qa"><div class="qa-q" data-i="${i}"><span class="qn">${i+1}</span><span>${qa.q}</span><span class="arr">›</span></div><div class="qa-a"><div class="in">${qa.a}</div></div></div>`;});
      html+=`</div></div>`;
    }

    // pager
    const prev=order[idx-1],next=order[idx+1];
    html+=`<div class="pager">
      <div class="pg ${prev?"":"empty"}" ${prev?`data-go="${prev}"`:""}><div class="lbl">← Previous</div><div class="tt">${prev?L[prev].title:""}</div></div>
      <div class="pg next ${next?"":"empty"}" ${next?`data-go="${next}"`:""}><div class="lbl">Next →</div><div class="tt">${next?L[next].title:""}</div></div>
    </div>`;

    contentEl.innerHTML=html;
    crumbEl.innerHTML=`${M.title} · <b>${l.title}</b>`;

    // mount viz
    const stage=document.getElementById("viz-stage"),vc=document.getElementById("viz-ctrls");
    if(VIZ[l.viz]){try{destroyViz=VIZ[l.viz](stage,vc)||null;}catch(e){stage.innerHTML=`<div class="vstat">visual failed to load</div>`;console.error(e);}}

    // qa toggles
    contentEl.querySelectorAll(".qa-q").forEach(q=>q.onclick=()=>q.parentElement.classList.toggle("open"));
    // pager clicks
    contentEl.querySelectorAll("[data-go]").forEach(p=>p.onclick=()=>go(p.dataset.go));

    contentEl.parentElement.scrollTop=0;
  }

  /* ---- home / overview ---- */
  function renderHome(){
    if(destroyViz){try{destroyViz();}catch(e){}destroyViz=null;}
    current=null;crumbEl.innerHTML=M.title;
    let cards="";order.forEach((id,i)=>{const l=L[id];cards+=`<div class="ov-card" data-go="${id}"><span class="step">${String(i+1).padStart(2,"0")}</span><div class="oi">${l.icon}</div><h3>${l.title}</h3><p>${l.sub}</p></div>`;});
    contentEl.innerHTML=`<div class="hero">
        <div class="eyebrow">${M.code} · Applied Machine Learning</div>
        <h2>Exploratory <span class="grad">Data Analysis</span></h2>
        <p>${M.subtitle}</p>
      </div>
      <div class="ov-grid">${cards}</div>
      <p class="viz-caption" style="margin-top:30px">Source: ${M.source}. More modules (Linear Algebra, Probability &amp; Statistics, PCA/t-SNE, KNN, Naive Bayes, SVM, Trees, Clustering, Neural Nets…) land next.</p>`;
    contentEl.querySelectorAll("[data-go]").forEach(p=>p.onclick=()=>go(p.dataset.go));
    syncNavMarks();
    contentEl.parentElement.scrollTop=0;
  }

  /* ---- navigate ---- */
  function go(id){
    if(id==="home"||!L[id]){location.hash="";current=null;renderHome();return;}
    location.hash=id;
  }
  function route(){
    const id=location.hash.replace(/^#/,"");
    if(!id||!L[id]){renderHome();return;}
    current=id;render(id);markVisited(id);syncNavMarks();
  }

  /* ---- mobile nav ---- */
  function openNav(){app.classList.add("nav-open");}
  function closeNav(){app.classList.remove("nav-open");}
  document.getElementById("menu").onclick=openNav;
  document.getElementById("scrim").onclick=closeNav;

  /* ---- prev/next buttons ---- */
  document.getElementById("prev").onclick=()=>{const i=order.indexOf(current);if(i>0)go(order[i-1]);};
  document.getElementById("next").onclick=()=>{const i=order.indexOf(current);if(i<order.length-1)go(order[i+1]);else if(i===-1)go(order[0]);};
  window.addEventListener("keydown",e=>{if(e.target.tagName==="INPUT"||e.target.tagName==="SELECT")return;
    if(e.key==="ArrowLeft"){const i=order.indexOf(current);if(i>0)go(order[i-1]);}
    if(e.key==="ArrowRight"){const i=order.indexOf(current);if(i>=0&&i<order.length-1)go(order[i+1]);}});

  /* ---- theme ---- */
  const themeBtn=document.getElementById("theme");
  function syncTheme(){const t=document.documentElement.getAttribute("data-theme");themeBtn.textContent=t==="light"?"☀️":"🌙";}
  themeBtn.onclick=()=>{const cur=document.documentElement.getAttribute("data-theme")==="light"?"dark":"light";document.documentElement.setAttribute("data-theme",cur);try{localStorage.setItem("aai-theme",cur);}catch(e){}syncTheme();};
  syncTheme();

  /* ---- search ---- */
  searchEl.oninput=()=>buildNav(searchEl.value);

  /* ---- boot ---- */
  buildNav();updateProgress();
  window.addEventListener("hashchange",()=>{buildNav(searchEl.value);route();});
  route();
})();
