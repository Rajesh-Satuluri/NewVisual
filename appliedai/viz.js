/* ============================================================
   Applied AI — Study Lab  ·  Interactive visual engine
   Each VIZ[name](stage, ctrls) builds inline SVG + controls and
   returns an optional destroy() to cancel animations.
   Pure vanilla + SVG — no dependencies.
   ============================================================ */
(function(){
  const NS="http://www.w3.org/2000/svg";
  const CLS=[["setosa","#22D3EE"],["versicolor","#A78BFA"],["virginica","#F472B6"]];
  const AX="#5b6b86", GRID="#2a3b57", BRAND="#8B5CF6", CY="#22D3EE", MUT="#8a9ab8", TXT="#c7d2e6";

  /* ---------- tiny dom helpers ---------- */
  function E(t,a,kids){const e=document.createElementNS(NS,t);for(const k in(a||{}))e.setAttribute(k,a[k]);(kids||[]).forEach(c=>e.appendChild(c));return e;}
  function svg(w,h){return E("svg",{viewBox:`0 0 ${w} ${h}`,preserveAspectRatio:"xMidYMid meet"});}
  function txt(x,y,s,o){o=o||{};return E("text",Object.assign({x,y,fill:o.fill||MUT,"font-size":o.fs||13,"text-anchor":o.ta||"middle","font-family":"-apple-system,Segoe UI,Roboto,sans-serif","font-weight":o.fw||400},o.extra||{}),[tn(s)]);}
  function tn(s){const t=document.createElementNS(NS,"title");return document.createTextNode(s);} // not used
  function T(x,y,s,o){o=o||{};const e=E("text",Object.assign({x,y,fill:o.fill||MUT,"font-size":o.fs||13,"text-anchor":o.ta||"middle","font-family":"-apple-system,Segoe UI,Roboto,sans-serif","font-weight":o.fw||400},o.extra||{}));e.textContent=s;return e;}
  function btn(label,on){const b=document.createElement("button");b.className="vbtn"+(on?" on":"");b.innerHTML=label;return b;}
  function pill(label){const b=document.createElement("button");b.className="vbtn play";b.innerHTML=label;return b;}

  /* ---------- stats ---------- */
  function feat(cls,i){return IRIS[cls].map(r=>r[i]);}
  const sortN=a=>a.slice().sort((x,y)=>x-y);
  const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
  const std=a=>{const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/a.length);};
  function quantile(a,q){const s=sortN(a),pos=(s.length-1)*q,b=Math.floor(pos),r=pos-b;return s[b+1]!==undefined?s[b]+r*(s[b+1]-s[b]):s[b];}
  const median=a=>quantile(a,.5);
  function kde(vals,xs,bw){const n=vals.length;return xs.map(x=>{let s=0;for(const v of vals){const u=(x-v)/bw;s+=Math.exp(-.5*u*u);}return s/(n*bw*Math.sqrt(2*Math.PI));});}
  function linspace(a,b,n){return Array.from({length:n},(_,i)=>a+(b-a)*i/(n-1));}
  function raf(fn){let id;const loop=t=>{if(fn(t)!==false)id=requestAnimationFrame(loop);};id=requestAnimationFrame(loop);return()=>cancelAnimationFrame(id);}

  const VIZ={};

  /* =========================================================
     1 · IRIS data matrix
     ========================================================= */
  VIZ["iris-table"]=function(stage){
    const W=760,H=330,s=svg(W,H);
    s.appendChild(T(W/2,24,"The Data Matrix  ·  X",{fill:TXT,fs:15,fw:700}));
    const cols=["Sepal L","Sepal W","Petal L","Petal W","Species"];
    const colX=[120,230,340,450,600], top=52, rh=30;
    // column header
    cols.forEach((c,i)=>s.appendChild(T(colX[i],top,c,{fill:CY,fs:12.5,fw:700})));
    s.appendChild(T(60,top,"xᵢ",{fill:MUT,fs:12,fw:700}));
    s.appendChild(E("line",{x1:40,y1:top+10,x2:720,y2:top+10,stroke:GRID,"stroke-width":1}));
    const rows=[["setosa",0],["setosa",4],["versicolor",0],["versicolor",10],["virginica",0],["virginica",6]];
    const g=E("g");s.appendChild(g);
    rows.forEach((rr,ri)=>{
      const [cls,idx]=rr,row=IRIS[cls][idx],y=top+28+ri*rh,color=CLS.find(c=>c[0]===cls)[1];
      const rg=E("g",{opacity:0});
      rg.appendChild(T(60,y,String(ri+1),{fill:MUT,fs:11}));
      row.forEach((v,ci)=>rg.appendChild(T(colX[ci],y,v.toFixed(1),{fill:TXT,fs:13})));
      rg.appendChild(E("rect",{x:548,y:y-13,width:104,height:19,rx:9,fill:color,opacity:.16}));
      rg.appendChild(T(colX[4],y,cls,{fill:color,fs:12,fw:700}));
      g.appendChild(rg);
      setTimeout(()=>{rg.style.transition="opacity .5s";rg.setAttribute("opacity",1);},180+ri*150);
    });
    s.appendChild(T(130,H-14,"↑ 4 features (columns / variables)",{fill:MUT,fs:12,ta:"start"}));
    s.appendChild(T(600,H-14,"↑ label / target",{fill:MUT,fs:12}));
    stage.appendChild(s);
  };

  /* =========================================================
     2 · 2-D scatter
     ========================================================= */
  VIZ["scatter2d"]=function(stage,ctrls){
    const W=760,H=400,PAD=56,s=svg(W,H);stage.appendChild(s);
    let xi=2,yi=3,showLine=false; // default petal L vs petal W
    const plot=E("g");s.appendChild(plot);
    function draw(animate){
      plot.innerHTML="";
      const xv=[].concat(...CLS.map(c=>feat(c[0],xi))),yv=[].concat(...CLS.map(c=>feat(c[0],yi)));
      const xmin=Math.min(...xv)-.3,xmax=Math.max(...xv)+.3,ymin=Math.min(...yv)-.3,ymax=Math.max(...yv)+.3;
      const X=v=>PAD+(v-xmin)/(xmax-xmin)*(W-PAD*1.4), Y=v=>H-PAD-(v-ymin)/(ymax-ymin)*(H-PAD*1.6);
      // axes
      plot.appendChild(E("line",{x1:PAD,y1:H-PAD,x2:W-20,y2:H-PAD,stroke:AX,"stroke-width":1.4}));
      plot.appendChild(E("line",{x1:PAD,y1:28,x2:PAD,y2:H-PAD,stroke:AX,"stroke-width":1.4}));
      for(let i=0;i<=4;i++){const gx=PAD+(W-PAD-20)*i/4;plot.appendChild(E("line",{x1:gx,y1:28,x2:gx,y2:H-PAD,stroke:GRID,"stroke-width":1,opacity:.5}));}
      plot.appendChild(T(W/2,H-16,FEATURES[xi]+" (cm)",{fill:TXT,fs:13,fw:600}));
      plot.appendChild(E("text",{x:18,y:H/2-20,fill:TXT,"font-size":13,"font-weight":600,"text-anchor":"middle",transform:`rotate(-90 18 ${H/2-20})`,"font-family":"-apple-system,sans-serif"})).textContent=FEATURES[yi]+" (cm)";
      // separating line (only meaningful on petal features)
      if(showLine){
        const sx=feat("setosa",xi),sy=feat("setosa",yi),ox=[].concat(feat("versicolor",xi),feat("virginica",xi));
        const bound=(Math.max(...sx)+Math.min(...ox))/2;
        const bx=X(bound);
        const ln=E("line",{x1:bx,y1:28,x2:bx,y2:H-PAD,stroke:"#FBBF24","stroke-width":2.4,"stroke-dasharray":"7 5"});
        plot.appendChild(ln);
        plot.appendChild(T(bx,42,"if-else rule → Setosa",{fill:"#FBBF24",fs:12,fw:700}));
      }
      // points
      CLS.forEach((c,ci)=>{
        IRIS[c[0]].forEach((r,ri)=>{
          const cx=X(r[xi]),cy=Y(r[yi]);
          const dot=E("circle",{cx,cy,r:animate?0:5.2,fill:c[1],opacity:.85,stroke:"#0b1020","stroke-width":1});
          plot.appendChild(dot);
          if(animate){const d=ci*90+ri*8;dot.style.transition="r .4s cubic-bezier(.3,1.3,.5,1)";setTimeout(()=>dot.setAttribute("r",5.2),d);}
        });
      });
    }
    draw(true);
    // controls
    function sel(label,val,set){
      const wrap=document.createElement("label");wrap.className="vslider";wrap.innerHTML=`<span>${label}</span>`;
      const sl=document.createElement("select");sl.className="vbtn";sl.style.padding="6px 8px";
      FEATURES.forEach((f,i)=>{const o=document.createElement("option");o.value=i;o.textContent=f;if(i===val)o.selected=true;sl.appendChild(o);});
      sl.onchange=()=>{set(+sl.value);draw(true);};wrap.appendChild(sl);return wrap;
    }
    ctrls.appendChild(sel("X:",xi,v=>xi=v));
    ctrls.appendChild(sel("Y:",yi,v=>yi=v));
    const lb=btn("➕ Separating line");
    lb.onclick=()=>{showLine=!showLine;lb.classList.toggle("on",showLine);draw(false);};
    ctrls.appendChild(lb);
    const leg=document.createElement("div");leg.className="legend";
    leg.innerHTML=CLS.map(c=>`<span><i style="background:${c[1]}"></i>${c[0]}</span>`).join("");
    ctrls.appendChild(leg);
  };

  /* =========================================================
     3 · pseudo-3D rotating scatter
     ========================================================= */
  VIZ["scatter3d"]=function(stage,ctrls){
    const W=760,H=420,s=svg(W,H);stage.appendChild(s);
    const g=E("g");s.appendChild(g);
    const fx=0,fy=2,fz=1; // sepalL, petalL, sepalW
    const pts=[];CLS.forEach(c=>IRIS[c[0]].forEach(r=>pts.push({x:r[fx],y:r[fy],z:r[fz],col:c[1]})));
    const nx=a=>{const v=pts.map(p=>p[a]),mn=Math.min(...v),mx=Math.max(...v);return x=>(x-mn)/(mx-mn)-.5;};
    const NX=nx("x"),NY=nx("y"),NZ=nx("z");
    let ang=0.6,auto=true,destroyed=false;
    const cx0=W/2,cy0=H/2+10,SC=300;
    function render(){
      g.innerHTML="";
      // axes gizmo
      const ca=Math.cos(ang),sa=Math.sin(ang);
      const proj=(x,y,z)=>{const X=x*ca - z*sa, Z=x*sa + z*ca;return[cx0+X*SC, cy0 - y*SC*0.9 - Z*18, Z];};
      const P=pts.map(p=>{const[px,py,depth]=proj(NX(p.x),NY(p.y),NZ(p.z));return{px,py,depth,col:p.col};}).sort((a,b)=>a.depth-b.depth);
      P.forEach(p=>{
        const r=4+(p.depth+.5)*3;
        g.appendChild(E("circle",{cx:p.px,cy:p.py,r,fill:p.col,opacity:.55+(p.depth+.5)*.45,stroke:"#0b1020","stroke-width":1}));
      });
      g.appendChild(T(W/2,26,"3 features · rotate to separate",{fill:TXT,fs:14,fw:700}));
    }
    render();
    const stop=raf(()=>{if(destroyed)return false;if(auto){ang+=0.012;render();}});
    const pb=pill("⏸ Pause");pb.onclick=()=>{auto=!auto;pb.innerHTML=auto?"⏸ Pause":"▶ Rotate";};
    ctrls.appendChild(pb);
    const sw=document.createElement("label");sw.className="vslider";sw.innerHTML="<span>Angle</span>";
    const sl=document.createElement("input");sl.type="range";sl.min=0;sl.max=628;sl.value=60;
    sl.oninput=()=>{auto=false;pb.innerHTML="▶ Rotate";ang=sl.value/100;render();};
    sw.appendChild(sl);ctrls.appendChild(sw);
    const leg=document.createElement("div");leg.className="legend";
    leg.innerHTML=CLS.map(c=>`<span><i style="background:${c[1]}"></i>${c[0]}</span>`).join("")+`<span style="color:${MUT}">axes: Sepal L · Petal L · Sepal W</span>`;
    ctrls.appendChild(leg);
    return()=>{destroyed=true;stop();};
  };

  /* =========================================================
     4 · pair plot grid
     ========================================================= */
  VIZ["pairplot"]=function(stage){
    const n=4,cell=165,pad=30,W=pad*2+cell*n,H=pad*2+cell*n,s=svg(W,H);stage.appendChild(s);
    const ranges=FEATURES.map((_,i)=>{const v=[].concat(...CLS.map(c=>feat(c[0],i)));return[Math.min(...v),Math.max(...v)];});
    let k=0;
    for(let r=0;r<n;r++)for(let c=0;c<n;c++){
      const ox=pad+c*cell,oy=pad+r*cell;
      const cg=E("g",{opacity:0,transform:`translate(${ox} ${oy})`});s.appendChild(cg);
      cg.appendChild(E("rect",{x:4,y:4,width:cell-8,height:cell-8,rx:8,fill:"#0e1626",stroke:GRID,"stroke-width":1}));
      if(r===c){
        // diagonal: overlaid KDEs
        const vals=CLS.map(cl=>feat(cl[0],r)),[mn,mx]=ranges[r],xs=linspace(mn,mx,40);
        const dens=vals.map(v=>kde(v,xs,(mx-mn)/8));
        const dmax=Math.max(...dens.flat());
        dens.forEach((d,di)=>{
          let p=`M ${12} ${cell-16}`;xs.forEach((x,ix)=>{const X=12+(x-mn)/(mx-mn)*(cell-24),Y=cell-16-d[ix]/dmax*(cell-44);p+=` L ${X} ${Y}`;});
          p+=` L ${cell-12} ${cell-16} Z`;
          cg.appendChild(E("path",{d:p,fill:CLS[di][1],opacity:.32,stroke:CLS[di][1],"stroke-width":1.4}));
        });
        cg.appendChild(T(cell/2,20,FEATURES[r],{fill:TXT,fs:11,fw:700}));
      }else{
        const [xmn,xmx]=ranges[c],[ymn,ymx]=ranges[r];
        CLS.forEach(cl=>IRIS[cl[0]].forEach(row=>{
          const X=12+(row[c]-xmn)/(xmx-xmn)*(cell-24),Y=cell-12-(row[r]-ymn)/(ymx-ymn)*(cell-24);
          cg.appendChild(E("circle",{cx:X,cy:Y,r:2.6,fill:cl[1],opacity:.8}));
        }));
      }
      if(r===n-1)cg.appendChild(T(cell/2,cell+2,FEATURES[c],{fill:MUT,fs:10}));
      if(c===0){const lab=E("text",{x:-6,y:cell/2,fill:MUT,"font-size":10,"text-anchor":"middle",transform:`rotate(-90 -6 ${cell/2})`});lab.textContent=FEATURES[r];cg.appendChild(lab);}
      setTimeout(()=>{cg.style.transition="opacity .4s";cg.setAttribute("opacity",1);},k*45);k++;
    }
  };

  /* =========================================================
     5 · histogram + PDF (KDE)
     ========================================================= */
  VIZ["histpdf"]=function(stage,ctrls){
    const W=760,H=380,PAD=56,s=svg(W,H);stage.appendChild(s);
    const g=E("g");s.appendChild(g);
    const all=[].concat(...CLS.map(c=>feat(c[0],2))); // petal length
    const mn=Math.min(...all)-.2,mx=Math.max(...all)+.2;
    let bins=12,showKDE=true;
    const X=v=>PAD+(v-mn)/(mx-mn)*(W-PAD-24),Y=v=>H-PAD-v;
    function draw(){
      g.innerHTML="";
      g.appendChild(E("line",{x1:PAD,y1:H-PAD,x2:W-20,y2:H-PAD,stroke:AX,"stroke-width":1.4}));
      // histogram per class stacked-ish (draw separately translucent)
      const bw=(mx-mn)/bins;
      let maxCount=0;const perClass=CLS.map(c=>{const arr=new Array(bins).fill(0);feat(c[0],2).forEach(v=>{let b=Math.min(bins-1,Math.floor((v-mn)/bw));arr[b]++;});return arr;});
      const totals=new Array(bins).fill(0);perClass.forEach(a=>a.forEach((v,i)=>totals[i]+=v));
      maxCount=Math.max(...totals);
      const scaleH=(H-PAD-40)/maxCount;
      for(let b=0;b<bins;b++){
        let base=H-PAD;
        perClass.forEach((arr,ci)=>{
          const h=arr[b]*scaleH;if(h<=0)return;
          const x=X(mn+b*bw)+1.5,w=Math.max(1,X(mn+bw)-X(mn)-3);
          const rect=E("rect",{x,y:base,width:w,height:0,fill:CLS[ci][1],opacity:.55});
          g.appendChild(rect);base-=h;
          rect.style.transition="height .5s,y .5s";setTimeout(()=>{rect.setAttribute("y",base+h);rect.setAttribute("height",h);},40+b*18);
        });
      }
      // KDE curves
      if(showKDE){
        const xs=linspace(mn,mx,120);
        CLS.forEach((c,ci)=>{
          const d=kde(feat(c[0],2),xs,.28),dmax=Math.max(...d);
          const top=(H-PAD-40)*0.92;
          let p="";xs.forEach((x,i)=>{p+=(i?"L":"M")+` ${X(x)} ${H-PAD-d[i]/dmax*top}`;});
          const path=E("path",{d:p,fill:"none",stroke:c[1],"stroke-width":2.6,"stroke-linecap":"round",opacity:.95});
          g.appendChild(path);
          const len=path.getTotalLength();path.setAttribute("stroke-dasharray",len);path.setAttribute("stroke-dashoffset",len);
          path.style.transition="stroke-dashoffset .9s ease";setTimeout(()=>path.setAttribute("stroke-dashoffset",0),120);
        });
      }
      g.appendChild(T(W/2,H-16,"Petal Length (cm)  →",{fill:TXT,fs:13,fw:600}));
      g.appendChild(T(26,30,"count / density",{fill:MUT,fs:11,ta:"start"}));
    }
    draw();
    const kb=btn("〰 KDE / PDF",true);kb.classList.add("on");
    kb.onclick=()=>{showKDE=!showKDE;kb.classList.toggle("on",showKDE);draw();};
    ctrls.appendChild(kb);
    const sw=document.createElement("label");sw.className="vslider";sw.innerHTML=`<span>Bins</span>`;
    const sl=document.createElement("input");sl.type="range";sl.min=5;sl.max=25;sl.value=bins;
    const cnt=document.createElement("b");cnt.style.color=CY;cnt.textContent=bins;
    sl.oninput=()=>{bins=+sl.value;cnt.textContent=bins;draw();};
    sw.appendChild(sl);sw.appendChild(cnt);ctrls.appendChild(sw);
    const leg=document.createElement("div");leg.className="legend";
    leg.innerHTML=CLS.map(c=>`<span><i style="background:${c[1]}"></i>${c[0]}</span>`).join("");
    ctrls.appendChild(leg);
  };

  /* =========================================================
     6 · CDF (with draggable reader)
     ========================================================= */
  VIZ["cdf"]=function(stage,ctrls){
    const W=760,H=380,PAD=56,s=svg(W,H);stage.appendChild(s);
    const all=sortN([].concat(...CLS.map(c=>feat(c[0],2))));
    const mn=all[0]-.2,mx=all[all.length-1]+.2;
    const X=v=>PAD+(v-mn)/(mx-mn)*(W-PAD-30),Y=f=>H-PAD-f*(H-PAD-36);
    // axes
    s.appendChild(E("line",{x1:PAD,y1:H-PAD,x2:W-20,y2:H-PAD,stroke:AX,"stroke-width":1.4}));
    s.appendChild(E("line",{x1:PAD,y1:28,x2:PAD,y2:H-PAD,stroke:AX,"stroke-width":1.4}));
    [0,.25,.5,.75,1].forEach(f=>{s.appendChild(E("line",{x1:PAD,y1:Y(f),x2:W-20,y2:Y(f),stroke:GRID,"stroke-width":1,opacity:.5}));s.appendChild(T(PAD-10,Y(f)+4,(f*100)+"%",{fill:MUT,fs:11,ta:"end"}));});
    // overall CDF
    let p="";all.forEach((v,i)=>{p+=(i?"L":"M")+` ${X(v)} ${Y((i+1)/all.length)}`;});
    const path=E("path",{d:p,fill:"none",stroke:"#FBBF24","stroke-width":3,"stroke-linejoin":"round"});
    s.appendChild(path);
    const len=path.getTotalLength();path.setAttribute("stroke-dasharray",len);path.setAttribute("stroke-dashoffset",len);
    path.style.transition="stroke-dashoffset 1.3s ease";setTimeout(()=>path.setAttribute("stroke-dashoffset",0),200);
    s.appendChild(T(W/2,H-16,"Petal Length (cm)  →",{fill:TXT,fs:13,fw:600}));
    s.appendChild(T(W-40,42,"CDF",{fill:"#FBBF24",fs:14,fw:800,ta:"end"}));
    // reader
    const rl=E("line",{x1:X(all[30]),y1:28,x2:X(all[30]),y2:H-PAD,stroke:CY,"stroke-width":1.6,"stroke-dasharray":"5 4"});s.appendChild(rl);
    const rd=E("circle",{r:6,fill:CY,stroke:"#0b1020","stroke-width":1.5});s.appendChild(rd);
    const lbl=E("rect",{width:168,height:28,rx:7,fill:"#0e1626",stroke:CY,"stroke-width":1});s.appendChild(lbl);
    const lt=T(0,0,"",{fill:TXT,fs:12,fw:700,ta:"middle"});s.appendChild(lt);
    function setReader(val){
      val=Math.max(mn,Math.min(mx,val));
      const frac=all.filter(v=>v<=val).length/all.length;
      const x=X(val),y=Y(frac);
      rl.setAttribute("x1",x);rl.setAttribute("x2",x);rd.setAttribute("cx",x);rd.setAttribute("cy",y);
      lbl.setAttribute("x",Math.min(W-180,x+10));lbl.setAttribute("y",y-34);
      lt.setAttribute("x",Math.min(W-180,x+10)+84);lt.setAttribute("y",y-15);
      lt.textContent=`${(frac*100).toFixed(0)}% ≤ ${val.toFixed(1)} cm`;
    }
    setReader(all[30]);
    let drag=false;const toVal=cx=>{const r=s.getBoundingClientRect();return mn+((cx-r.left)/r.width*W-PAD)/(W-PAD-30)*(mx-mn);};
    s.style.cursor="ew-resize";
    s.addEventListener("pointerdown",e=>{drag=true;setReader(toVal(e.clientX));});
    window.addEventListener("pointermove",e=>{if(drag)setReader(toVal(e.clientX));});
    window.addEventListener("pointerup",()=>drag=false);
    const hint=document.createElement("div");hint.className="vstat";hint.innerHTML="◂ drag anywhere to read the CDF ▸";ctrls.appendChild(hint);
  };

  /* =========================================================
     7 · mean / variance / std with draggable outlier
     ========================================================= */
  VIZ["meanstd"]=function(stage,ctrls){
    const W=760,H=300,PAD=60,s=svg(W,H);stage.appendChild(s);
    const base=[4.4,4.7,4.9,5.0,5.1,5.2,5.4,5.6,5.8,6.0];
    let outlier=6.4;const AXISY=H-110;
    const mn=4,mx=11;const X=v=>PAD+(v-mn)/(mx-mn)*(W-PAD-30);
    const band=E("rect",{y:AXISY-40,height:80,rx:6,fill:BRAND,opacity:.14});s.appendChild(band);
    s.appendChild(E("line",{x1:PAD,y1:AXISY,x2:W-20,y2:AXISY,stroke:AX,"stroke-width":1.4}));
    for(let v=4;v<=11;v++){s.appendChild(E("line",{x1:X(v),y1:AXISY-4,x2:X(v),y2:AXISY+4,stroke:AX,"stroke-width":1}));s.appendChild(T(X(v),AXISY+20,String(v),{fill:MUT,fs:11}));}
    const dots=base.map(v=>{const c=E("circle",{cx:X(v),cy:AXISY,r:6,fill:"#A78BFA",opacity:.85,stroke:"#0b1020","stroke-width":1});s.appendChild(c);return c;});
    const out=E("circle",{cy:AXISY,r:9,fill:"#F87171",stroke:"#fff","stroke-width":2,cursor:"grab"});s.appendChild(out);
    const meanLine=E("line",{y1:AXISY-48,y2:AXISY+48,stroke:CY,"stroke-width":2.4});s.appendChild(meanLine);
    const medLine=E("line",{y1:AXISY-40,y2:AXISY+40,stroke:"#34D399","stroke-width":2.4,"stroke-dasharray":"5 4"});s.appendChild(medLine);
    const mTag=T(0,AXISY-56,"μ",{fill:CY,fs:12,fw:800});s.appendChild(mTag);
    const dTag=T(0,AXISY+64,"median",{fill:"#34D399",fs:11,fw:700});s.appendChild(dTag);
    const stat=T(W/2,40,"",{fill:TXT,fs:14,fw:700});s.appendChild(stat);
    function upd(){
      const data=base.concat([outlier]),m=mean(data),sd=std(data),md=median(data);
      out.setAttribute("cx",X(outlier));
      const mxX=X(m);meanLine.setAttribute("x1",mxX);meanLine.setAttribute("x2",mxX);mTag.setAttribute("x",mxX);
      const mdX=X(md);medLine.setAttribute("x1",mdX);medLine.setAttribute("x2",mdX);dTag.setAttribute("x",mdX);
      band.setAttribute("x",X(m-sd));band.setAttribute("width",X(m+sd)-X(m-sd));
      stat.textContent=`μ = ${m.toFixed(2)}   σ = ${sd.toFixed(2)}   σ² = ${(sd*sd).toFixed(2)}   median = ${md.toFixed(2)}`;
    }
    upd();
    let drag=false;const toVal=cx=>{const r=s.getBoundingClientRect();return Math.max(mn,Math.min(mx,mn+((cx-r.left)/r.width*W-PAD)/(W-PAD-30)*(mx-mn)));};
    out.addEventListener("pointerdown",e=>{drag=true;out.setAttribute("cursor","grabbing");e.preventDefault();});
    window.addEventListener("pointermove",e=>{if(drag){outlier=toVal(e.clientX);upd();}});
    window.addEventListener("pointerup",()=>{drag=false;out.setAttribute("cursor","grab");});
    s.appendChild(T(W/2,H-18,"↔ drag the red outlier — watch μ and the ±σ band chase it, while the median holds",{fill:MUT,fs:12}));
    const leg=document.createElement("div");leg.className="legend";
    leg.innerHTML=`<span><i style="background:${CY}"></i>mean μ & ±σ band</span><span><i style="background:#34D399"></i>median (robust)</span><span><i style="background:#F87171"></i>drag me</span>`;
    ctrls.appendChild(leg);
  };

  /* =========================================================
     8 · median vs mean robustness
     ========================================================= */
  VIZ["median"]=function(stage,ctrls){
    const W=760,H=280,PAD=60,s=svg(W,H);stage.appendChild(s);
    const core=[4.6,4.8,5.0,5.1,5.2,5.4,5.6,5.8,6.0],AXISY=160;
    let extra=null;const mn=4,mx=14,X=v=>PAD+(v-mn)/(mx-mn)*(W-PAD-30);
    s.appendChild(E("line",{x1:PAD,y1:AXISY,x2:W-20,y2:AXISY,stroke:AX,"stroke-width":1.4}));
    for(let v=4;v<=14;v+=2){s.appendChild(T(X(v),AXISY+20,String(v),{fill:MUT,fs:11}));}
    const layer=E("g");s.appendChild(layer);
    const meanL=E("line",{y1:AXISY-46,y2:AXISY+30,stroke:CY,"stroke-width":2.4});s.appendChild(meanL);
    const medL=E("line",{y1:AXISY-46,y2:AXISY+30,stroke:"#34D399","stroke-width":2.4,"stroke-dasharray":"5 4"});s.appendChild(medL);
    const mTag=T(0,AXISY-52,"mean",{fill:CY,fs:11,fw:800});s.appendChild(mTag);
    const dTag=T(0,AXISY+46,"median",{fill:"#34D399",fs:11,fw:800});s.appendChild(dTag);
    const stat=T(W/2,38,"",{fill:TXT,fs:14,fw:700});s.appendChild(stat);
    function upd(animateNew){
      layer.innerHTML="";const data=extra!=null?core.concat([extra]):core.slice();
      core.forEach(v=>layer.appendChild(E("circle",{cx:X(v),cy:AXISY,r:6,fill:"#A78BFA",opacity:.85,stroke:"#0b1020","stroke-width":1})));
      if(extra!=null){const c=E("circle",{cx:X(extra),cy:AXISY,r:animateNew?0:8,fill:"#F87171",stroke:"#fff","stroke-width":2});layer.appendChild(c);if(animateNew){c.style.transition="r .4s cubic-bezier(.3,1.4,.5,1)";setTimeout(()=>c.setAttribute("r",8),30);}}
      const m=mean(data),md=median(data);
      meanL.setAttribute("x1",X(m));meanL.setAttribute("x2",X(m));mTag.setAttribute("x",X(m));
      medL.setAttribute("x1",X(md));medL.setAttribute("x2",X(md));dTag.setAttribute("x",X(md));
      stat.textContent=`mean = ${m.toFixed(2)}   ·   median = ${md.toFixed(2)}`;
    }
    upd(false);
    const ab=pill("➕ Add outlier (13.5)");
    ab.onclick=()=>{if(extra==null){extra=13.5;ab.innerHTML="↩ Remove outlier";}else{extra=null;ab.innerHTML="➕ Add outlier (13.5)";}upd(true);};
    ctrls.appendChild(ab);
    const note=document.createElement("div");note.className="vstat";note.innerHTML=`the mean <b>jumps</b>, the median barely moves`;ctrls.appendChild(note);
  };

  /* =========================================================
     9 · percentiles & quantiles
     ========================================================= */
  VIZ["percentile"]=function(stage,ctrls){
    const W=760,H=300,PAD=56,s=svg(W,H);stage.appendChild(s);
    const data=sortN([].concat(...CLS.map(c=>feat(c[0],2))));
    const mn=data[0]-.2,mx=data[data.length-1]+.2,AXISY=150;
    const X=v=>PAD+(v-mn)/(mx-mn)*(W-PAD-30);
    s.appendChild(E("line",{x1:PAD,y1:AXISY,x2:W-20,y2:AXISY,stroke:AX,"stroke-width":1.4}));
    // quartile markers
    [[.25,"Q1"],[.5,"Q2·median"],[.75,"Q3"]].forEach(([q,l])=>{const v=quantile(data,q);s.appendChild(E("line",{x1:X(v),y1:AXISY-60,x2:X(v),y2:AXISY+40,stroke:"#FBBF24","stroke-width":1.4,"stroke-dasharray":"4 4",opacity:.7}));s.appendChild(T(X(v),AXISY-66,l,{fill:"#FBBF24",fs:10.5,fw:700}));});
    const dots=data.map((v,i)=>{const c=E("circle",{cx:X(v),cy:AXISY,r:5,fill:"#334",stroke:"#0b1020","stroke-width":1});s.appendChild(c);return c;});
    const handle=E("line",{y1:AXISY-50,y2:AXISY+50,stroke:BRAND,"stroke-width":2.6});s.appendChild(handle);
    const hd=E("circle",{cy:AXISY-50,r:8,fill:BRAND,stroke:"#fff","stroke-width":2,cursor:"grab"});s.appendChild(hd);
    const stat=T(W/2,40,"",{fill:TXT,fs:14,fw:700});s.appendChild(stat);
    let p=.6;
    function upd(){const val=quantile(data,p);const x=X(val);handle.setAttribute("x1",x);handle.setAttribute("x2",x);hd.setAttribute("cx",x);
      const kLeft=data.filter(v=>v<=val).length;
      dots.forEach((c,i)=>c.setAttribute("fill",data[i]<=val?"#A78BFA":"#3a4a66"));
      stat.textContent=`${(p*100).toFixed(0)}ᵗʰ percentile = ${val.toFixed(2)} cm  ·  ${kLeft}/${data.length} points to its left`;
    }
    upd();
    let drag=false;const toP=cx=>{const r=s.getBoundingClientRect();const v=mn+((cx-r.left)/r.width*W-PAD)/(W-PAD-30)*(mx-mn);return Math.max(0,Math.min(1,data.filter(d=>d<=v).length/data.length));};
    const start=()=>drag=true;
    hd.addEventListener("pointerdown",e=>{start();e.preventDefault();});
    s.addEventListener("pointerdown",e=>{drag=true;p=Math.max(.02,Math.min(.98,toPFromX(e.clientX)));upd();});
    function toPFromX(cx){const r=s.getBoundingClientRect();const v=mn+((cx-r.left)/r.width*W-PAD)/(W-PAD-30)*(mx-mn);return (v-mn)/(mx-mn);}
    window.addEventListener("pointermove",e=>{if(drag){p=Math.max(.02,Math.min(.98,toPFromX(e.clientX)));upd();}});
    window.addEventListener("pointerup",()=>drag=false);
    s.appendChild(T(W/2,H-20,"↔ drag the handle — the fraction of points to the left is the percentile",{fill:MUT,fs:12}));
  };

  /* =========================================================
     10 · IQR & MAD
     ========================================================= */
  VIZ["iqr"]=function(stage){
    const W=760,H=300,PAD=56,AXISY=150,s=svg(W,H);stage.appendChild(s);
    const data=sortN([].concat(...CLS.map(c=>feat(c[0],2))));
    const mn=data[0]-.3,mx=data[data.length-1]+.3,X=v=>PAD+(v-mn)/(mx-mn)*(W-PAD-30);
    const q1=quantile(data,.25),q2=quantile(data,.5),q3=quantile(data,.75),iqr=q3-q1,md=median(data);
    const mad=median(data.map(v=>Math.abs(v-md)));
    s.appendChild(E("line",{x1:PAD,y1:AXISY,x2:W-20,y2:AXISY,stroke:AX,"stroke-width":1.4}));
    data.forEach(v=>s.appendChild(E("circle",{cx:X(v),cy:AXISY,r:4.5,fill:"#4a5a76",opacity:.8})));
    // IQR band
    const band=E("rect",{x:X(q1),y:AXISY-46,width:0,height:92,rx:8,fill:BRAND,opacity:.2,stroke:BRAND,"stroke-width":1.5});s.appendChild(band);
    band.style.transition="width .7s cubic-bezier(.3,1,.4,1)";setTimeout(()=>band.setAttribute("width",X(q3)-X(q1)),120);
    [["Q1",q1],["median",q2],["Q3",q3]].forEach(([l,v])=>{s.appendChild(E("line",{x1:X(v),y1:AXISY-46,x2:X(v),y2:AXISY+46,stroke:BRAND,"stroke-width":2}));s.appendChild(T(X(v),AXISY-54,`${l}=${v.toFixed(2)}`,{fill:TXT,fs:11,fw:700}));});
    s.appendChild(E("line",{x1:X(q1),y1:AXISY+64,x2:X(q3),y2:AXISY+64,stroke:CY,"stroke-width":2,"marker-start":"","stroke-linecap":"round"}));
    s.appendChild(T((X(q1)+X(q3))/2,AXISY+82,`IQR = Q3 − Q1 = ${iqr.toFixed(2)}`,{fill:CY,fs:13,fw:800}));
    s.appendChild(T(W/2,36,`MAD = median(|xᵢ − median|) = ${mad.toFixed(2)}`,{fill:"#34D399",fs:13.5,fw:700}));
    s.appendChild(T(W/2,H-16,"the middle 50% of the data — outliers in the tails can't touch it",{fill:MUT,fs:12}));
  };

  /* =========================================================
     11 · box plot
     ========================================================= */
  VIZ["boxplot"]=function(stage,ctrls){
    const W=760,H=420,PAD=70,s=svg(W,H);stage.appendChild(s);
    const vmin=0,vmax=8,Y=v=>H-50-(v-vmin)/(vmax-vmin)*(H-120);
    // y axis
    s.appendChild(E("line",{x1:PAD,y1:40,x2:PAD,y2:H-50,stroke:AX,"stroke-width":1.4}));
    for(let v=0;v<=8;v++){s.appendChild(E("line",{x1:PAD-4,y1:Y(v),x2:W-30,y2:Y(v),stroke:GRID,"stroke-width":1,opacity:.4}));s.appendChild(T(PAD-12,Y(v)+4,String(v),{fill:MUT,fs:11,ta:"end"}));}
    s.appendChild(T(PAD,28,"Petal Length (cm)",{fill:TXT,fs:12,fw:700,ta:"start"}));
    const bw=120,gap=(W-PAD-40)/3;
    CLS.forEach((c,ci)=>{
      const d=sortN(feat(c[0],2)),cx=PAD+40+ci*gap+gap/2-10;
      const q1=quantile(d,.25),q2=quantile(d,.5),q3=quantile(d,.75),iqr=q3-q1;
      const lo=Math.max(d[0],q1-1.5*iqr),hi=Math.min(d[d.length-1],q3+1.5*iqr);
      const g=E("g",{opacity:0});s.appendChild(g);
      // whiskers
      g.appendChild(E("line",{x1:cx,y1:Y(hi),x2:cx,y2:Y(q3),stroke:c[1],"stroke-width":1.6}));
      g.appendChild(E("line",{x1:cx,y1:Y(q1),x2:cx,y2:Y(lo),stroke:c[1],"stroke-width":1.6}));
      g.appendChild(E("line",{x1:cx-22,y1:Y(hi),x2:cx+22,y2:Y(hi),stroke:c[1],"stroke-width":1.6}));
      g.appendChild(E("line",{x1:cx-22,y1:Y(lo),x2:cx+22,y2:Y(lo),stroke:c[1],"stroke-width":1.6}));
      // box
      g.appendChild(E("rect",{x:cx-bw/2,y:Y(q3),width:bw,height:Y(q1)-Y(q3),rx:4,fill:c[1],opacity:.22,stroke:c[1],"stroke-width":1.8}));
      g.appendChild(E("line",{x1:cx-bw/2,y1:Y(q2),x2:cx+bw/2,y2:Y(q2),stroke:c[1],"stroke-width":3}));
      // outliers
      d.forEach(v=>{if(v<lo||v>hi)g.appendChild(E("circle",{cx,cy:Y(v),r:4,fill:"none",stroke:"#F87171","stroke-width":1.6}));});
      g.appendChild(T(cx,H-26,c[0],{fill:c[1],fs:12.5,fw:700}));
      // labels
      [["max/fence",hi],["Q3",q3],["med",q2],["Q1",q1],["min/fence",lo]].forEach(([l,v])=>{if(ci===2)g.appendChild(T(cx+bw/2+8,Y(v)+4,l,{fill:MUT,fs:10,ta:"start"}));});
      setTimeout(()=>{g.style.transition="opacity .5s";g.setAttribute("opacity",1);},ci*220);
    });
    s.appendChild(T(W/2,H-8,"five-number summary per class — compare centre & spread at a glance",{fill:MUT,fs:12}));
  };

  /* =========================================================
     12 · violin
     ========================================================= */
  VIZ["violin"]=function(stage){
    const W=760,H=420,PAD=70,s=svg(W,H);stage.appendChild(s);
    const vmin=0,vmax=8,Y=v=>H-50-(v-vmin)/(vmax-vmin)*(H-120);
    s.appendChild(E("line",{x1:PAD,y1:40,x2:PAD,y2:H-50,stroke:AX,"stroke-width":1.4}));
    for(let v=0;v<=8;v++){s.appendChild(E("line",{x1:PAD-4,y1:Y(v),x2:W-30,y2:Y(v),stroke:GRID,"stroke-width":1,opacity:.35}));s.appendChild(T(PAD-12,Y(v)+4,String(v),{fill:MUT,fs:11,ta:"end"}));}
    const gap=(W-PAD-40)/3,maxW=70;
    CLS.forEach((c,ci)=>{
      const d=feat(c[0],2),cx=PAD+40+ci*gap+gap/2-10;
      const ys=linspace(vmin,vmax,60),dens=kde(d,ys,.3),dmax=Math.max(...dens);
      let left="",right="";ys.forEach((yv,i)=>{const w=dens[i]/dmax*maxW,Yy=Y(yv);right+=(i?"L":"M")+` ${cx+w} ${Yy}`;});
      for(let i=ys.length-1;i>=0;i--){const w=dens[i]/dmax*maxW;left+=` L ${cx-w} ${Y(ys[i])}`;}
      const path=E("path",{d:right+left+" Z",fill:c[1],opacity:.26,stroke:c[1],"stroke-width":1.8,transform:`scale(1 1)`});
      s.appendChild(path);
      path.style.transformOrigin=`${cx}px ${Y((vmin+vmax)/2)}px`;path.style.transform="scaleX(.05)";path.style.transition="transform .6s cubic-bezier(.3,1,.4,1)";
      setTimeout(()=>path.style.transform="scaleX(1)",ci*180+80);
      // mini box inside
      const q1=quantile(d,.25),q2=quantile(d,.5),q3=quantile(d,.75);
      s.appendChild(E("rect",{x:cx-7,y:Y(q3),width:14,height:Y(q1)-Y(q3),rx:3,fill:"#0b1020",opacity:.85}));
      s.appendChild(E("circle",{cx,cy:Y(q2),r:3.5,fill:"#fff"}));
      s.appendChild(T(cx,H-26,c[0],{fill:c[1],fs:12.5,fw:700}));
    });
    s.appendChild(T(W/2,H-8,"box plot + mirrored KDE — width = density; bulges reveal where points pile up",{fill:MUT,fs:12}));
  };

  /* =========================================================
     13 · uni / bi / multi tiers
     ========================================================= */
  VIZ["dimtypes"]=function(stage){
    const W=760,H=330,s=svg(W,H);stage.appendChild(s);
    const tiers=[
      ["Univariate","1 variable",["PDF","CDF","Box plot","Violin"],"#22D3EE"],
      ["Bivariate","2 variables",["2-D scatter","Pair-plot cell"],"#A78BFA"],
      ["Multivariate","3+ variables",["3-D scatter","Contour plot"],"#F472B6"]
    ];
    const cw=228,gap=16,x0=(W-(cw*3+gap*2))/2;
    tiers.forEach((t,i)=>{
      const x=x0+i*(cw+gap),g=E("g",{opacity:0,transform:`translate(${x} 40)`});s.appendChild(g);
      g.appendChild(E("rect",{width:cw,height:H-90,rx:14,fill:"#0e1626",stroke:t[3],"stroke-width":1.5,opacity:.9}));
      g.appendChild(E("rect",{width:cw,height:52,rx:14,fill:t[3],opacity:.16}));
      g.appendChild(T(cw/2,32,t[0],{fill:t[3],fs:17,fw:800}));
      g.appendChild(T(cw/2,72,t[1],{fill:MUT,fs:12.5,fw:600}));
      // little variable glyphs
      const n=i+1;for(let k=0;k<n;k++)g.appendChild(E("circle",{cx:cw/2+(k-(n-1)/2)*26,cy:100,r:8,fill:t[3],opacity:.8}));
      t[2].forEach((p,pi)=>{
        const yy=140+pi*34;
        g.appendChild(E("rect",{x:20,y:yy-18,width:cw-40,height:26,rx:7,fill:t[3],opacity:.1}));
        g.appendChild(T(cw/2,yy-0,p,{fill:TXT,fs:13,fw:600}));
      });
      setTimeout(()=>{g.style.transition="opacity .5s";g.setAttribute("opacity",1);},i*200);
    });
  };

  /* =========================================================
     14 · contour (2-D density hill)
     ========================================================= */
  VIZ["contour"]=function(stage,ctrls){
    const W=760,H=430,s=svg(W,H);stage.appendChild(s);
    // two gaussian blobs → contour via marching-ish concentric rings on a grid
    const peaks=[{x:.38,y:.42,s:.13,a:1},{x:.66,y:.60,s:.16,a:.8}];
    const GW=70,GH=40,field=[];let fmax=0;
    for(let j=0;j<GH;j++){field[j]=[];for(let i=0;i<GW;i++){const x=i/(GW-1),y=j/(GH-1);let v=0;peaks.forEach(p=>{const dx=x-p.x,dy=y-p.y;v+=p.a*Math.exp(-(dx*dx+dy*dy)/(2*p.s*p.s));});field[j][i]=v;fmax=Math.max(fmax,v);}}
    const px=i=>50+i/(GW-1)*(W-90),py=j=>30+j/(GH-1)*(H-90);
    // filled density via small rects (heat)
    const heat=E("g",{opacity:.9});s.appendChild(heat);
    for(let j=0;j<GH;j++)for(let i=0;i<GW;i++){const t=field[j][i]/fmax;if(t<.05)continue;const col=`rgb(${Math.round(30+t*120)},${Math.round(20+t*60)},${Math.round(70+t*170)})`;heat.appendChild(E("rect",{x:px(i),y:py(j),width:(W-90)/GW+1,height:(H-90)/GH+1,fill:col,opacity:.18+t*.5}));}
    // contour rings (iso-levels) using simple per-level polyline on grid crossing — approximate via circles from peaks
    const levels=[.2,.35,.5,.65,.8,.92];
    const cg=E("g");s.appendChild(cg);
    levels.forEach((lv,li)=>{
      // draw iso-contour by sampling grid cells where value≈lv (dot cloud joined)
      const segs=[];for(let j=0;j<GH;j++)for(let i=0;i<GW;i++){const v=field[j][i]/fmax;if(Math.abs(v-lv)<.03)segs.push([px(i),py(j)]);}
      segs.forEach(p=>{const c=E("circle",{cx:p[0],cy:p[1],r:1.6,fill:"#dbe4f5",opacity:0});cg.appendChild(c);setTimeout(()=>{c.style.transition="opacity .4s";c.setAttribute("opacity",.5+li*.08);},300+li*160);});
    });
    // peak markers
    peaks.forEach(p=>s.appendChild(E("circle",{cx:px(p.x*(GW-1)),cy:py(p.y*(GH-1)),r:5,fill:"#fff",stroke:BRAND,"stroke-width":2})));
    s.appendChild(T(W/2,H-24,"two density ‘summits’ — darker, tighter rings = denser regions (a hill seen from above)",{fill:MUT,fs:12.5}));
    s.appendChild(T(W/2,24,"Feature A  →",{fill:TXT,fs:12,fw:600}));
  };

  window.VIZ=VIZ;
})();
