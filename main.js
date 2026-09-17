const {app,BrowserWindow,ipcMain,dialog,shell,powerMonitor,safeStorage}=require('electron');
// Avoid GPU crashes on Windows.
app.disableHardwareAcceleration();
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {Engine,initial,validatePlan}=require('./engine');
const {spotifyLink,desktopSpotify}=require('./spotify');
const {SpotifyAPI}=require('./spotify-api');
let spotifyApi;
let musicStatus={connected:false,message:'Connect to the Spotify desktop app to control your music here.'},musicBusy=false;
async function refreshMusic(command='status'){if(musicBusy){if(command==='status')return musicStatus;while(musicBusy)await new Promise(r=>setTimeout(r,80));}musicBusy=true;try{musicStatus=await desktopSpotify(command);return musicStatus;}finally{musicBusy=false;}}

const root=process.env.STILL_DATA_DIR||path.join(path.dirname(process.execPath),'data');
app.setPath('userData',root);app.setName('Still');
let win,mini,engine,server,lastExtension=0,bridgeError='',loadWarning='',dirty=false;
const file=path.join(root,'still.json');
function save(){try{fs.mkdirSync(root,{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(engine.data));if(fs.existsSync(file))fs.copyFileSync(file,file+'.bak');fs.renameSync(file+'.tmp',file);dirty=false;}catch(e){loadWarning='Could not save: '+e.message;}}
function read(){for(const candidate of [file,file+'.bak'])try{if(!fs.existsSync(candidate))continue;const d=JSON.parse(fs.readFileSync(candidate,'utf8'));if(d.version!==1||!Array.isArray(d.plans)||!Array.isArray(d.history)||!d.daily||!d.settings)throw Error('Invalid saved data');d.plans=d.plans.map(validatePlan);if(d.session)d.session.status='paused';if(candidate.endsWith('.bak'))loadWarning='Recovered your data from the automatic backup.';return d;}catch{loadWarning='Saved data could not be read. A backup will be used if available.';}return initial();}
function state(){return {...engine.data,spotifyDesktop:musicStatus,spotifyQueue:spotifyApi?.snapshot(),pinned:win?.isAlwaysOnTop()||false,compact:!!mini&&!mini.isDestroyed(),extensionConnected:Date.now()-lastExtension<45000,bridgeError,loadWarning,event:engine.event};}
function broadcast(){for(const w of [win,mini])if(w&&!w.isDestroyed())w.webContents.send('state',state());engine.event=null;}
function createWindow(compact=false){const w=new BrowserWindow({width:compact?350:1280,height:compact?300:870,minWidth:compact?330:920,minHeight:compact?270:680,title:'Still · Your focus studio',backgroundColor:'#f7f8f3',autoHideMenuBar:true,alwaysOnTop:compact,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false,autoplayPolicy:"no-user-gesture-required"}});w.loadFile(path.join(__dirname,'index.html'),{query:compact?{mini:'1'}:{}});w.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\/(open|accounts)\.spotify\.com\//.test(url))shell.openExternal(url);return {action:'deny'};});w.webContents.on('will-navigate',e=>e.preventDefault());return w;}
function trusted(event){return event.senderFrame===event.sender.mainFrame&&event.senderFrame.url.startsWith('file://')&&[win,mini].some(w=>w&&!w.isDestroyed()&&w.webContents===event.sender);}
ipcMain.handle('state',e=>{if(!trusted(e))throw Error('Invalid caller');return state();});
ipcMain.handle('action',async(e,name,p)=>{if(!trusted(e))throw Error('Invalid caller');try{engine.tick();switch(name){
 case 'start':engine.start(p);break;case 'pause':engine.pause();break;case 'resume':engine.resume();break;case 'skip':engine.next();break;case 'end':engine.finish();break;case 'break':engine.breakNow(p);break;
 case 'savePlan':{const plan=validatePlan(p),i=engine.data.plans.findIndex(x=>x.id===plan.id);if(i<0)engine.data.plans.push(plan);else engine.data.plans[i]=plan;break;}
 case 'deletePlan':if(engine.data.plans.length<2)throw Error('Keep at least one plan.');engine.data.plans=engine.data.plans.filter(x=>x.id!==p);break;
 case 'taskAdd':{const s=engine.data.session;if(!s)throw Error('Start a session to add a task.');const text=String(p).trim().slice(0,200);if(text&&s.tasks.length<100)s.tasks.push({id:require('crypto').randomUUID(),text,done:false});break;}
 case 'taskToggle':{const t=engine.data.session?.tasks.find(t=>t.id===p);if(t)t.done=!t.done;break;}
 case 'taskDelete':if(engine.data.session)engine.data.session.tasks=engine.data.session.tasks.filter(t=>t.id!==p);break;
 case 'settings':if(Number.isFinite(p.alarmVolume))engine.data.settings.alarmVolume=Math.max(0,Math.min(100,p.alarmVolume));for(const k of ['autoAdvance','sound'])if(typeof p[k]==='boolean')engine.data.settings[k]=p[k];if(['light','dark'].includes(p.theme))engine.data.settings.theme=p.theme;break;
 case 'spotify':engine.data.spotify=spotifyLink(p);break;
 case 'unlinkSpotify':engine.data.spotify='';break;
 case 'spotifyDesktop':{const result=await refreshMusic(p);broadcast();if(!result.connected||result.accepted===false)throw Error(result.message);break;}
 case 'spotifyQueueConnect':await spotifyApi.connect(p);break;
 case 'spotifyQueueRefresh':await spotifyApi.sync();break;
 case 'spotifyQueueAdd':await spotifyApi.add(p);break;
 case 'spotifyQueuePlay':await spotifyApi.play(p);break;
 case 'spotifyQueueDisconnect':spotifyApi.disconnect();break;
 case 'spotifyQueueCancel':spotifyApi.stopLogin();broadcast();break;
 case 'spotifyDeveloper':await shell.openExternal('https://developer.spotify.com/dashboard');break;
 case 'openSpotifyApp':{const uri=engine.data.spotify?engine.data.spotify.replace('https://open.spotify.com/','spotify:').replace('/',':'):'spotify:';try{await shell.openExternal(uri);}catch{throw Error('Could not open Spotify. Use Open web player, or install the Spotify desktop app.');}break;}
 case 'openSpotify':await shell.openExternal(engine.data.spotify||'https://open.spotify.com');break;
 case 'pin':win.setAlwaysOnTop(!win.isAlwaysOnTop());break;
 case 'mini':if(mini&&!mini.isDestroyed()){mini.focus();}else{mini=createWindow(true);mini.on('closed',()=>{mini=null;broadcast();});}break;
 case 'expand':win.show();win.focus();if(mini&&!mini.isDestroyed())mini.close();break;
 case 'extensionFolder':await shell.openPath(path.join(__dirname,'extension'));break;
 case 'export':{const r=await dialog.showSaveDialog(win,{defaultPath:'Still-backup.json',filters:[{name:'JSON backup',extensions:['json']}]});if(!r.canceled)fs.writeFileSync(r.filePath,JSON.stringify({...engine.data,token:undefined,session:null},null,2));break;}
 case 'import':{if(engine.data.session)throw Error('End your active session before importing.');const r=await dialog.showOpenDialog(win,{filters:[{name:'Still backup',extensions:['json']}],properties:['openFile']});if(r.canceled)break;const content=fs.readFileSync(r.filePaths[0],'utf8');if(content.length>10000000)throw Error('Backup is too large.');const d=JSON.parse(content);if(d.version!==1||!Array.isArray(d.plans)||!d.plans.length)throw Error('Invalid Still backup.');const plans=d.plans.map(validatePlan);const confirm=await dialog.showMessageBox(win,{type:'question',message:'Replace your plans and progress with this backup?',buttons:['Cancel','Restore backup'],defaultId:0,cancelId:0});if(confirm.response!==1)break;if(!Array.isArray(d.history)||!d.daily||Object.values(d.daily).some(v=>typeof v!=='number'||v<0||!Number.isFinite(v)))throw Error('Invalid progress data.');for(const s of d.history)if(typeof s.name!=='string'||!Number.isFinite(s.focusSeconds)||s.focusSeconds<0||!Number.isFinite(s.endedAt)||!Array.isArray(s.tasks))throw Error('Invalid session history.');engine.data={...initial(),plans,history:d.history,daily:d.daily,token:engine.data.token};break;}
 default:throw Error('Unknown action');}
 save();broadcast();return {ok:true};}catch(err){return {ok:false,error:err.message};}});
function bridge(){server=http.createServer((req,res)=>{const origin=req.headers.origin||'';res.setHeader('Cache-Control','no-store');if(origin.startsWith('chrome-extension://'))res.setHeader('Access-Control-Allow-Origin',origin);if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Headers','X-Still-Token');res.setHeader('Access-Control-Allow-Methods','GET');res.writeHead(204);return res.end();}
 if(req.method!=='GET'||req.url!=='/state'||req.headers['x-still-token']!==engine.data.token){res.writeHead(403);return res.end();}
 lastExtension=Date.now();const s=engine.data.session;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({active:!!s&&s.status==='running'&&engine.current()?.type==='focus',sites:s?.sites||[],expiresAt:Date.now()+45000}));});server.on('error',err=>{bridgeError='Browser connection unavailable: '+err.message;});server.listen(17843,'127.0.0.1');}
if(!app.requestSingleInstanceLock())app.quit();else{app.on('second-instance',()=>{if(win){win.restore();win.show();win.focus();}});app.whenReady().then(()=>{engine=new Engine(read());spotifyApi=new SpotifyAPI({root,storage:safeStorage,openExternal:url=>shell.openExternal(url),onChange:()=>{if(win)broadcast();}});win=createWindow();refreshMusic().then(broadcast).catch(()=>{});if(spotifyApi.snapshot().connected)spotifyApi.sync().catch(()=>{});setInterval(()=>{if(spotifyApi.snapshot().connected)spotifyApi.sync().catch(()=>{});},30000);win.on('close',()=>{engine.pause();save();if(mini&&!mini.isDestroyed())mini.close();});bridge();powerMonitor.on('suspend',()=>{engine.pause();save();broadcast();});setInterval(()=>{engine.tick();dirty=true;broadcast();},250);setInterval(()=>{if(musicStatus.connected&&!musicBusy)refreshMusic().then(broadcast).catch(()=>{});},5000);setInterval(()=>{if(dirty)save();},5000);});app.on('window-all-closed',()=>app.quit());app.on('before-quit',()=>{spotifyApi?.stopLogin();if(engine){engine.pause();save();}server?.close();});}
