/* ============================================================
   progress.js (module) — Progress & Mastery. Route: #progress
   Explainable mastery per domain: coverage + quiz accuracy.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function pct(x){return Math.round(x*100);}

  var Module={
    id:"progress", title:"Progress", fullWidth:false,
    render:function(container){
      var P=DL.Progress; var overall=P?P.overall():{viewed:0,total:(DL.concepts||[]).length};
      var html='<div class="module-header animate-fade-in-up">'+
        '<div class="module-eyebrow">Progress</div>'+
        '<h1 class="module-title gradient-text">Mastery</h1>'+
        '<p class="module-subtitle">Mastery = 70% coverage (concepts explored) + 30% quiz accuracy. '+
        overall.viewed+' of '+overall.total+' concepts explored.</p></div>';

      html+='<div class="mastery-list">';
      (DL.domains||[]).forEach(function(d){
        var s=P?P.domainStats(d):{mastery:0,coverage:0,accuracy:null,viewed:0,total:1};
        html+='<a class="mastery-row" href="#learn/'+encodeURIComponent(d)+'">'+
          '<div class="mastery-top"><span class="mastery-name">'+esc(d)+'</span>'+
          '<span class="mastery-pct">'+pct(s.mastery)+'%</span></div>'+
          '<div class="dom-bar"><span class="dom-fill" style="width:'+pct(s.mastery)+'%"></span></div>'+
          '<div class="mastery-meta">'+s.viewed+'/'+s.total+' explored'+
          (s.accuracy===null?' · not yet quizzed':' · '+pct(s.accuracy)+'% quiz accuracy')+'</div></a>';
      });
      html+='</div>';

      var weak=P?P.weakConcepts():[];
      if(weak.length){
        html+='<section class="learn-domain"><div class="learn-domain-head"><h2 class="learn-domain-title">Focus next</h2></div><div class="chip-row">';
        weak.slice(0,8).forEach(function(w){var c=DL.conceptById[w.id];if(c)html+='<a class="chip chip-warn" href="#concept/'+c.slug+'">'+(c.icon||"•")+' '+esc(c.title)+'</a>';});
        html+='</div></section>';
      }
      container.innerHTML=html;
      var canvas=document.getElementById("canvas"); if(canvas)canvas.scrollTop=0;
    },
  };
  DL.registerModule(Module);
})();
