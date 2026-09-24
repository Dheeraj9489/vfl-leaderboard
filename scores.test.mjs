import test from 'node:test';
import assert from 'node:assert/strict';
import { collectScores, validateConfig } from './update-scores.mjs';
const config = {name:'Friends',eventId:null,usernames:['alice','bob']};
test('exact matching, real zero scores, and shared page caching',async()=>{
  let calls=0;
  const get = async url => {
    if(url.includes('currentevent')) return {id:11,name:'Champions'};
    if(url.includes('/position')) return url.includes('alice') ? 1 : {position:2,userId:22};
    calls++; return [{username:'alice2',totalPoints:900},{username:'ALICE',totalPoints:0},{username:'bob',totalPoints:9}];
  };
  const result=await collectScores(config,get);
  assert.deepEqual(result.players.map(p=>p.points),[0,9]);assert.equal(calls,1);
});
test('not found stays null instead of becoming zero',async()=>{
 const result=await collectScores({...config,usernames:['missing']},async u=>u.includes('currentevent')?{id:11,name:'Champions'}:-1);
 assert.equal(result.players[0].points,null);
});
test('fetch failures prevent publishing a partial leaderboard',async()=>{
 await assert.rejects(collectScores(config,async u=>{if(u.includes('currentevent'))return{id:11,name:'Champions'};throw Error('offline');}),/offline/);
});
test('refuses fuzzy matches and invalid scores',async()=>{
 await assert.rejects(collectScores({...config,usernames:['alice']},async u=>u.includes('currentevent')?{id:11,name:'Champions'}:u.includes('position')?1:[{username:'alice2',totalPoints:99}]),/Exact username/);
 await assert.rejects(collectScores({...config,usernames:['alice']},async u=>u.includes('currentevent')?{id:11,name:'Champions'}:u.includes('position')?1:[{username:'alice',totalPoints:null}]),/Invalid points/);
});
test('deduplicates usernames and validates configuration',()=>{
 assert.deepEqual(validateConfig({...config,usernames:[' ALICE ','alice','Bob']}).usernames,['alice','bob']);
 assert.throws(()=>validateConfig({...config,eventId:'11'}),/eventId/);
});
test('rosters use configured profile IDs and retain player names and IGL',async()=>{
 const get=async u=>u.includes('currentevent')?{id:11,name:'Champions'}:u.includes('/position')?1:u.includes('/fantasyteam/')?{players:[{isStarter:true,isIgl:true,eventPlayer:{player:{name:'something'},totalEventPoints:{totalPoints:37},team:{shortName:'PRX'}}}]}:[{username:'alice',totalPoints:0}];
 const result=await collectScores({...config,usernames:['alice'],teamUrls:{alice:'https://www.valorantfantasyleague.net/team/56251'}},get);
 assert.equal(result.players[0].rosterStatus,'ok');assert.deepEqual(result.players[0].roster,[{name:'something',points:37,team:'PRX',isIgl:true,isStarter:true}]);
});
test('missing profile links do not trigger roster requests',async()=>{
 const result=await collectScores({...config,usernames:['alice']},async u=>u.includes('currentevent')?{id:11,name:'Champions'}:u.includes('/position')?1:[{username:'alice',totalPoints:4}]);
 assert.equal(result.players[0].rosterStatus,'no-link');
 assert.throws(()=>validateConfig({...config,teamUrls:{alice:'https://example.com/team/1'}}),/teamUrls/);
});
