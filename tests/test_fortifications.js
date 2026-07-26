const fs=require('fs'),path=require('path');const ROOT=require('path').join(__dirname,'..');
global.window=global;
global.document={createElement:()=>({getContext:()=>null,style:{},addEventListener:()=>{}}),addEventListener:()=>{}};
global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
for(const f of ['js/core/util.js','js/core/audio.js','js/data/species.js','js/data/economy.js','js/data/lore.js','js/core/token.js','js/engine/behaviors.js','js/engine/match.js']){
  eval(fs.readFileSync(path.join(ROOT,f),'utf8')+'\n//# sourceURL='+f);
}
const D=global.DYA, U=D.util;
let fails=0; const ok=(n,c,x)=>{ console.log('  '+(c?'PASS':'FAIL'),n, x||''); if(!c)fails++; };

function mkMatch(){
  const m=new D.match.Match({ seed:5, mode:'standard', terrain:'plain',
    settings:{pulseInterval:5,pulseAmount:3,chaos:false},
    teams:[{name:'A',controller:'ai',pouch:[D.token.mint({speciesId:'harkal',rng:new U.Rng(1)})]},
           {name:'B',controller:'ai',pouch:[D.token.mint({speciesId:'harkal',rng:new U.Rng(2)})]}] });
  m.headless=true; return m;
}

console.log('== WALL blocks enemy, passes owner, flyer over ==');
{ const m=mkMatch(); const api=m.api();
  // wall owned by team 0 at (800,500), vertical 22x64
  m.structures.push({id:'w1',type:'wall',team:0,x:800,y:500,w:22,h:64,hp:170,maxHp:170,quality:1,trapped:false,trapCd:0});
  const foe=m.spawnFromToken(D.token.mint({speciesId:'rodak',rng:new U.Rng(3)}),1,800,500); // enemy on the wall
  const ally=m.spawnFromToken(D.token.mint({speciesId:'rodak',rng:new U.Rng(4)}),0,800,500); // ally on the wall
  foe.rooted=false; ally.rooted=false;
  m.stepMisc();
  const foeOut=Math.abs(foe.x-800) >= 11 || Math.abs(foe.y-500) >= 32;
  ok('enemy shoved out of the wall footprint', foeOut, '(dx='+(foe.x-800).toFixed(1)+',dy='+(foe.y-500).toFixed(1)+')');
  ok('ally passes freely through own wall', Math.abs(ally.x-800)<1 && Math.abs(ally.y-500)<1);
}

console.log('== SPIKED wall damages the presser (ground creature) ==');
{ const m=mkMatch();
  m.structures.push({id:'w2',type:'wall',team:0,x:800,y:500,w:22,h:64,hp:170,maxHp:170,quality:1,trapped:true,trapCd:0});
  const foe=m.spawnFromToken(D.token.mint({speciesId:'rodak',rng:new U.Rng(5)}),1,800,500);
  foe.rooted=false; const hp0=foe.hp;
  m.stepMisc();
  ok('trapped wall dealt damage', foe.hp<hp0, '(hp '+hp0.toFixed(1)+'->'+foe.hp.toFixed(1)+')');
  ok('trapped wall slowed the presser', foe.buffs.some(b=>b.speedMul&&b.speedMul<1));
}

console.log('== LOS: enemy wall blocks the shot, own wall does not ==');
{ const m=mkMatch();
  m.structures.push({id:'w3',type:'wall',team:1,x:800,y:500,w:22,h:64,hp:170,maxHp:170,quality:1});
  ok('team-0 shot across a team-1 wall is blocked', m.losBlocked(700,500,900,500,0)===true);
  ok('team-1 shot across its OWN wall is clear', m.losBlocked(700,500,900,500,1)===false);
  ok('shot that misses the wall is clear', m.losBlocked(700,200,900,200,0)===false);
}

console.log('== RELIC WARD seals the relic ==');
{ const m=mkMatch(); const api=m.api();
  const rl=m.relics.find(r=>r.ownerTeam===0);
  ok('team-0 relic exists', !!rl);
  m.structures.push({id:'wd',type:'ward',team:0,x:rl.x,y:rl.y,radius:66,hp:110,maxHp:110,quality:1});
  const thief=m.spawnFromToken(D.token.mint({speciesId:'mikolo_moko',rng:new U.Rng(6)}),1,rl.x,rl.y);
  api._c=thief; api.pickRelic(thief);
  ok('ward blocks the relic pickup', thief.carryingRelic!==true && rl.carrier==null);
  // remove ward, try again
  m.structures.length=0; api.pickRelic(thief);
  ok('relic can be lifted once the ward is gone', rl.carrier===thief.id);
}

console.log('== a fielded Builder raises tower, wall, and ward ==');
{ const m=mkMatch(); const rng=new U.Rng(11);
  const h0=m.teams[0].hoard, rl0=m.relics.find(r=>r.ownerTeam===0);
  const bt=D.token.mint({speciesId:'builder_keilia',rng});
  bt.picks=Object.assign({},bt.picks,{relicIntegration:1,trapIntegration:1,siegeProficiency:1});
  const builder=m.spawnFromToken(bt,0,h0.x,h0.y);
  m.spawnFromToken(D.token.mint({speciesId:'archer_eikar',rng}),0,h0.x,h0.y+40);
  m.spawnFromToken(D.token.mint({speciesId:'sword_keilia',rng}),0,h0.x+120,h0.y); // a screen so the builder survives
  // an enemy runner far away, plus a fighter applying pressure (triggers walls)
  const foeH=m.teams[1].hoard;
  m.spawnFromToken(D.token.mint({speciesId:'mikolo_moko',rng}),1,foeH.x,foeH.y);
  m.spawnFromToken(D.token.mint({speciesId:'harkal',rng}),1,h0.x+300,h0.y);
  let seenTower=false, seenWall=false, seenWard=false, peak=0;
  for(let i=0;i<1600 && !m.over;i++){ m.doTick();
    for(const s of m.structures){ if(s.type==='tower')seenTower=true; if(s.type==='wall')seenWall=true; if(s.type==='ward')seenWard=true; }
    peak=Math.max(peak,m.structures.length);
  }
  ok('a tower was built', seenTower);
  ok('a wall was built', seenWall);
  ok('a Relic Ward was built', seenWard);
  console.log('    (peak structures:', peak, '| ticks-over:', m.over, m.result&&m.result.how, ')');
}

console.log(fails? ('\nFORTIFICATIONS: '+fails+' FAILURE(S)') : '\nFORTIFICATIONS: ALL PASS');
process.exit(fails?1:0);
