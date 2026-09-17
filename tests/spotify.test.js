const test=require('node:test'),assert=require('node:assert/strict');
const {spotifyLink}=require('../spotify');
const id='37i9dQZF1DX8NTLI2TtZa6';
test('accepts Spotify share links, locale links, embed links, and URIs',()=>{for(const value of [`https://open.spotify.com/playlist/${id}?si=abc`,`https://open.spotify.com/intl-de/playlist/${id}`,`https://open.spotify.com/embed/playlist/${id}`,`spotify:playlist:${id}`,`open.spotify.com/playlist/${id}`])assert.equal(spotifyLink(value),`https://open.spotify.com/playlist/${id}`);});
test('empty links produce an actionable error instead of silently clearing the player',()=>{assert.throws(()=>spotifyLink('  '),/Paste a Spotify/);});
test('rejects unrelated sites, credentials, invalid IDs and home links',()=>{for(const value of ['https://evil.com/track/'+id,'https://open.spotify.com.evil.com/track/'+id,'https://user:pass@open.spotify.com/track/'+id,'https://open.spotify.com','javascript:alert(1)','https://open.spotify.com/track/xxx'])assert.throws(()=>spotifyLink(value));});
test('short links give a helpful instruction',()=>assert.throws(()=>spotifyLink('https://spotify.link/example'),/full open.spotify.com/));
