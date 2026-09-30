/* ============================================================
   learn.js — Domain browser. Route: #learn  or  #learn/<domain>
   Lists concepts grouped by learning domain; links to workspaces.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}

  function domainFromHash(){
    var raw=(location.hash||"").replace(/^#/,"").trim().split("/");
    return raw[1]?decodeURIComponent(raw[1]):null;
  }

  var Module={
    id:"learn", title:"Learn", _onHash:null,
    render:function(container){
      var self=this; this._draw(container);
      this._onHash=function(){ if((location.hash||"").indexOf("#learn")===0) self._draw(container); };
      window.addEventListener("hashchange",this._onHash);
    },
    destroy:function(){ if(this._onHash){window.removeEventListener("hashchange",this._onHash);this._onHash=null;} },
    _draw:function(container){
      var P=DL.Progress, only=domainFromHash();
      var domains=(DL.domains||[]).filter(function(d){return !only||d===only;});
      var html='<div class="module-header animate-fade-in-up">'+
        '<div class="module-eyebrow">Learn</div>'+
        '<h1 class="module-title gradient-text">'+(only?esc(only):"All Concepts")+'</h1>'+
        '<p class="module-subtitle">'+ (DL.concepts||[]).length +' interactive concepts across '+(DL.domains||[]).length+' domains. Every concept has a live simulation.</p>'+
        (only?'<a class="btn btn-secondary" href="#learn">← All domains</a>':'')+
        '</div>';

      domains.forEach(function(d){
        var list=DL.conceptsByDomain(d);
        var done=list.filter(function(c){return P&&P.isViewed(c.id);}).length;
        html+='<section class="learn-domain"><div class="learn-domain-head">'+
          '<h2 class="learn-domain-title">'+esc(d)+'</h2>'+
          '<span class="learn-domain-count">'+done+' / '+list.length+'</span></div>';
        html+='<div class="concept-grid">';
        list.forEach(function(c){
          var viewed=P&&P.isViewed(c.id);
          html+='<a class="concept-card'+(c.authored?" authored":"")+'" href="#concept/'+c.slug+'">'+
            '<span class="concept-card-icon">'+(c.icon||"•")+'</span>'+
            '<span class="concept-card-title">'+esc(c.title)+'</span>'+
            (viewed?'<span class="concept-card-dot" title="Viewed">✓</span>':'')+
            (c.authored?'<span class="concept-card-badge">deep-dive</span>':'')+
            '</a>';
        });
        html+='</div></section>';
      });
      container.innerHTML=html;
      var canvas=document.getElementById("canvas"); if(canvas)canvas.scrollTop=0;
    },
  };
  DL.registerModule(Module);
})();
