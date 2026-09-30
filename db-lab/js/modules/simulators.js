/* ============================================================
   simulators.js — one grid of every interactive simulation.
   Route: #simulators. Each tile opens the concept workspace on
   its Simulate tab.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}

  var Module={
    id:"simulators", title:"Simulators", fullWidth:false,
    render:function(container){
      var byDomain={};
      (DL.concepts||[]).forEach(function(c){ (byDomain[c.domain]=byDomain[c.domain]||[]).push(c); });
      var html='<div class="module-header animate-fade-in-up">'+
        '<div class="module-eyebrow">Simulators</div>'+
        '<h1 class="module-title gradient-text">Interactive Simulators</h1>'+
        '<p class="module-subtitle">'+(DL.concepts||[]).length+' step-through Canvas simulations — play, pause, scrub, and inspect what changes at each step.</p></div>';
      (DL.domains||[]).forEach(function(d){
        var list=byDomain[d]||[]; if(!list.length)return;
        html+='<section class="learn-domain"><div class="learn-domain-head"><h2 class="learn-domain-title">'+esc(d)+'</h2>'+
          '<span class="learn-domain-count">'+list.length+'</span></div><div class="concept-grid">';
        list.forEach(function(c){
          html+='<a class="concept-card" href="#concept/'+c.slug+'">'+
            '<span class="concept-card-icon">'+(c.icon||"▶")+'</span>'+
            '<span class="concept-card-title">'+esc(c.title)+'</span>'+
            '<span class="concept-card-badge">▶ sim</span></a>';
        });
        html+='</div></section>';
      });
      container.innerHTML=html;
      var canvas=document.getElementById("canvas"); if(canvas)canvas.scrollTop=0;
    },
  };
  DL.registerModule(Module);
})();
