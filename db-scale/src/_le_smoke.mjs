globalThis.document = { createElement: () => ({ innerHTML:'', querySelector(){ return { querySelector(){ return {}; } }; } }) };
const { renderLeaderElectionScene } = await import('./db/leader-election-scene.js');
const views = ['why','election','majority','split','reelect','recap'];
for (const v of views) {
  let svgStr = '';
  globalThis.document.createElement = () => ({ set innerHTML(x){ svgStr = x; }, get innerHTML(){ return svgStr; }, querySelector(){ return { querySelector(){ return {}; } }; } });
  try { renderLeaderElectionScene({ view: v, note: 'n' }); }
  catch (e) { console.log(v.padEnd(10), 'THREW', e.message); continue; }
  const nan = (svgStr.match(/NaN/g) || []).length;
  const und = (svgStr.match(/>undefined<|"undefined"|undefined /g) || []).length;
  console.log(v.padEnd(10), 'NaN='+nan, 'undefinedish='+und, 'len='+svgStr.length);
}
