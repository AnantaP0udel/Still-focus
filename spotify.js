const {execFile}=require('node:child_process');
const path=require('node:path');
function spotifyLink(value){
 const input=String(value??'').trim();
 if(!input)throw Error('Paste a Spotify playlist, album, or track link first.');
 const uri=/^spotify:(playlist|album|track|episode|show):([a-zA-Z0-9]{22})$/.exec(input);
 if(uri)return `https://open.spotify.com/${uri[1]}/${uri[2]}`;
 let u;try{u=new URL(input.startsWith('open.spotify.com/')?'https://'+input:input);}catch{throw Error('Copy a link from Spotify → Share → Copy link, then paste it here.');}
 if(u.hostname==='spotify.link')throw Error('Open that short link, then copy the full open.spotify.com link from your browser.');
 if(u.protocol!=='https:'||u.hostname!=='open.spotify.com'||u.username||u.password)throw Error('Use a link from open.spotify.com.');
 const match=/^\/(?:intl-[a-zA-Z-]+\/)?(?:embed\/)?(playlist|album|track|episode|show)\/([a-zA-Z0-9]{22})\/?$/.exec(u.pathname);
 if(!match)throw Error('Choose a playlist, album, track, show, or episode link—not your profile or Spotify home page.');
 return `https://open.spotify.com/${match[1]}/${match[2]}`;
}
function desktopSpotify(command='status'){
 if(!['status','toggle','next','previous'].includes(command))return Promise.reject(Error('Unknown music control.'));
 const exe=path.join(__dirname,'native','SpotifyControl.exe');
 return new Promise((resolve,reject)=>execFile(exe,[command],{windowsHide:true,timeout:16000,encoding:'utf8',maxBuffer:2097152},(err,out)=>{if(err)return reject(Error('Windows could not reach Spotify. Open Spotify, play a song, then try Connect again.'));try{resolve(JSON.parse(out.replace(/^\uFEFF/, '').trim()));}catch{reject(Error('Spotify did not return a player status. Try opening a song in Spotify first.'));}}));
}
module.exports={spotifyLink,desktopSpotify};
