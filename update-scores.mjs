import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const BASE = 'https://api.valorantfantasyleague.net';
export function validateConfig(config) {
  if (!config || typeof config.name !== 'string' || !config.name.trim()) throw new Error('league.json needs a name.');
  if (!Array.isArray(config.usernames) || !config.usernames.length || config.usernames.some(u=>typeof u!=='string'||!u.trim())) throw new Error('Add at least one nonempty username to league.json.');
  if (config.eventId !== null && (!Number.isInteger(config.eventId) || config.eventId < 1)) throw new Error('eventId must be null (current event) or a positive integer.');
  return {...config, usernames: [...new Set(config.usernames.map(u=>u.trim().toLowerCase()))]};
}
export async function getJSON(endpoint) {
  for(let attempt=0;attempt<3;attempt++) {
    try {
      const response = await fetch(`${BASE}${endpoint}`, {signal:AbortSignal.timeout(20000),headers:{Accept:'application/json'}});
      if(!response.ok) throw new Error(`VFL returned HTTP ${response.status} for ${endpoint}`);
      return await response.json();
    } catch(error) { if(attempt===2) throw error; await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1))); }
  }
}
export async function collectScores(input, get = getJSON) {
  const config = validateConfig(input);
  const event = await get(config.eventId === null ? '/api/event/currentevent' : `/api/event/event?eventId=${config.eventId}`);
  if (!Number.isInteger(event?.id) || typeof event.name !== 'string') throw new Error('Unexpected VFL event response.');
  const base = `/api/leaderboard/total?eventId=${event.id}`;
  const pageSize = 20;
  const pages = new Map();
  async function page(number) {
    if(!pages.has(number)) pages.set(number, get(`${base}&page=${number}&pageSize=${pageSize}`).then(rows=>{
      if(!Array.isArray(rows)) throw new Error('Unexpected leaderboard response.');
      return rows;
    }));
    return pages.get(number);
  }
  const players = [];
  for(const username of config.usernames) {
    const result = await get(`/api/leaderboard/total/position?eventId=${event.id}&username=${encodeURIComponent(username)}`);
    const position = typeof result === 'number' ? result : result?.position;
    if (!Number.isInteger(position)) throw new Error(`Unexpected position response for ${username}.`);
    if(position <= 0) { players.push({username,points:null,status:'not-found'}); continue; }
    const pageNumber = Math.ceil(position/pageSize);
    const matches = row => typeof row.username === 'string' && row.username.toLowerCase() === username;
    let match = (await page(pageNumber)).find(matches);
    // A score change between the position and page requests can move a player across a page boundary.
    if(!match && pageNumber > 1) match = (await page(pageNumber-1)).find(matches);
    if(!match) match = (await page(pageNumber+1)).find(matches);
    if(!match) throw new Error(`Exact username ${username} was not found near its reported position. Refusing to publish another user's points.`);
    if(!Number.isFinite(match.totalPoints)) throw new Error(`Invalid points for ${username}.`);
    players.push({username,points:match.totalPoints,status:'ok'});
  }
  return {name:config.name,event:{id:event.id,name:event.name},updatedAt:new Date().toISOString(),players};
}
async function main() {
  const root = fileURLToPath(new URL('./',import.meta.url));
  const config = JSON.parse(await readFile(path.join(root,'league.json'),'utf8'));
  const snapshot = await collectScores(config);
  const destination = path.join(root,'leaderboard.json');
  await writeFile(`${destination}.tmp`,JSON.stringify(snapshot,null,2)+'\n');
  await rename(`${destination}.tmp`,destination);
  console.log(`Updated ${snapshot.players.length} managers for ${snapshot.event.name}.`);
}
if(process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error=>{console.error(error.message);process.exitCode=1;});
