const crypto = require('node:crypto');
const uid = () => crypto.randomUUID();
function domain(value) {
  const raw=String(value).trim(); if(!raw) return null;
  let url; try {url=new URL(raw.includes('://')?raw:'https://'+raw);}catch{return null;}
  const host=url.hostname.toLowerCase().replace(/^www\./,'').replace(/\.$/,'');
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||!host.includes('.')||host==='127.0.0.1'||host.endsWith('.localhost')||! /^[a-z0-9.-]+$/.test(host))return null;
  return host;
}
function validatePlan(p) {
  if(!p||typeof p.name!=='string'||!p.name.trim()||p.name.length>80)throw Error('Give your plan a name (up to 80 characters).');
  if(!Array.isArray(p.intervals)||p.intervals.length<1||p.intervals.length>100)throw Error('Add between 1 and 100 intervals.');
  const intervals=p.intervals.map(i=>{const minutes=Number(i.minutes);if(!['focus','break'].includes(i.type)||!Number.isFinite(minutes)||minutes<1||minutes>240)throw Error('Each interval must be between 1 and 240 minutes.');return {type:i.type,minutes};});
  if(!intervals.some(i=>i.type==='focus'))throw Error('Include at least one focus interval.');
  const sites=Array.isArray(p.sites)?p.sites:[];
  if(sites.length>100)throw Error('Use at most 100 blocked websites.');
  const normalized=sites.filter(s=>String(s).trim()).map(s=>{const d=domain(s);if(!d)throw Error('Invalid website: '+String(s).slice(0,80));return d;});
  return {id:typeof p.id==='string'?p.id:uid(),name:p.name.trim(),intervals,sites:[...new Set(normalized)],tasks:(Array.isArray(p.tasks)?p.tasks:[]).slice(0,100).map(t=>String(t).trim().slice(0,200)).filter(Boolean)};
}
function initial(){return {version:1,plans:[validatePlan({name:'Deep study',intervals:[{type:'focus',minutes:25},{type:'break',minutes:5},{type:'focus',minutes:25},{type:'break',minutes:5},{type:'focus',minutes:25}],sites:['facebook.com','instagram.com'],tasks:[]}),validatePlan({name:'A little momentum',intervals:[{type:'focus',minutes:15},{type:'break',minutes:3},{type:'focus',minutes:15}],sites:[],tasks:[]})],history:[],daily:{},session:null,spotify:'',settings:{autoAdvance:true,sound:true,alarmVolume:70,theme:'light'},token:crypto.randomBytes(24).toString('hex')};}
class Engine {
 constructor(data=initial(),now=()=>Date.now()){this.data=data;this.now=now;this.last=now();this.event=null;}
 current(){const s=this.data.session;return s?.intervals[s.index];}
 tick(){const now=this.now(),dt=Math.max(0,(now-this.last)/1000);this.last=now;const s=this.data.session;if(!s||s.status!=='running')return;
  if(dt>10){s.status='paused';this.event='Paused while your computer was asleep or unavailable.';return;}
  const elapsed=Math.min(dt,s.remaining);s.remaining=Math.max(0,s.remaining-elapsed);
  if(this.current().type==='focus'){s.focusSeconds+=elapsed;const d=new Date(now),key=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');this.data.daily[key]=(this.data.daily[key]||0)+elapsed;}
  if(s.remaining<=0){s.completedIntervals++;this.next(false);this.event='Interval complete';}
 }
 start(planId){if(this.data.session)throw Error('Finish or end your current session first.');const p=this.data.plans.find(p=>p.id===planId);if(!p)throw Error('Choose a saved plan.');this.data.session={id:uid(),planId:p.id,name:p.name,intervals:structuredClone(p.intervals),sites:[...p.sites],tasks:p.tasks.map(text=>({id:uid(),text,done:false})),index:0,remaining:p.intervals[0].minutes*60,status:'running',focusSeconds:0,completedIntervals:0,skipped:0,startedAt:this.now()};this.last=this.now();}
 next(skipped=true){const s=this.data.session;if(!s)return;if(skipped)s.skipped++;s.index++;if(s.index>=s.intervals.length){this.finish(s.skipped===0?'completed':'ended');return;}s.remaining=this.current().minutes*60;s.status=this.data.settings.autoAdvance?'running':'paused';this.last=this.now();}
 finish(status='ended'){const s=this.data.session;if(!s)return;this.data.history.unshift({...s,status,endedAt:this.now()});this.data.session=null;}
 pause(){this.tick();if(this.data.session)this.data.session.status='paused';}
 resume(){const s=this.data.session;if(s){s.status='running';this.last=this.now();}}
 breakNow(minutes){const s=this.data.session;if(!s||this.current().type!=='focus')throw Error('Start a focus interval before adding a break.');minutes=Number(minutes);if(!Number.isFinite(minutes)||minutes<1||minutes>60)throw Error('Use a break between 1 and 60 minutes.');
  const tail=s.intervals.slice(s.index+1);const remaining=s.remaining;
  s.intervals=[...s.intervals.slice(0,s.index),{type:'break',minutes},{type:'focus',minutes:remaining/60},...tail];s.remaining=minutes*60;s.status='running';this.last=this.now();}
}
module.exports={Engine,initial,validatePlan,domain};
