const $ = id => document.getElementById(id);
const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
let snapshot;
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function render(data) {
  snapshot = data;
  document.title = `${data.name} · Valorant Fantasy`;
  if (data.name !== 'The Friends League') $('title').textContent = data.name;
  $('event-name').textContent = data.event.name;
  $('player-count').textContent = data.players.length;
  const players = [...data.players].sort((a,b) => (b.points ?? -Infinity) - (a.points ?? -Infinity) || a.username.localeCompare(b.username));
  const scored = players.filter(p => Number.isFinite(p.points));
  const best = scored[0]?.points;
  let rank = 0, previous;
  const rows = players.map((player, index) => {
    const available = Number.isFinite(player.points);
    if (available && player.points !== previous) rank = index + 1;
    previous = player.points;
    const tied = available && scored.filter(p => p.points === player.points).length > 1;
    const row = element('tr', available && player.points === best ? 'leading' : '');
    const rankCell = element('td','rank', available ? `${tied ? '=' : ''}${rank}` : '—');
    rankCell.setAttribute('aria-label', available ? `${tied ? 'Tied ' : ''}Rank ${rank}` : 'Unranked');
    const managerCell = element('td');
    const manager = element('div','manager');
    const avatar = element('span','avatar',player.username.slice(0,2).toUpperCase());
    avatar.setAttribute('aria-hidden','true');
    const info = element('div','manager-text');
    const link = element('a','username',player.username);
    const url = new URL('https://www.valorantfantasyleague.net/leaderboard');
    url.searchParams.set('search',player.username); url.searchParams.set('exact','true');
    link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    info.append(link, element('span','detail', !available ? 'Not on this event’s leaderboard' : player.points === best ? tied ? 'Tied for the lead' : 'Setting the pace' : `${number.format(best-player.points)} pts behind`));
    manager.append(avatar, info); managerCell.append(manager);
    row.append(rankCell,managerCell,element('td','points',available ? number.format(player.points) : '—'));
    return row;
  });
  $('rows').replaceChildren(...rows);
  $('tie-note').hidden = !(scored.length > 1 && scored.length === players.length && scored.every(p => p.points === best));
  const date = new Date(data.updatedAt);
  $('updated').textContent = `Updated ${date.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}`;
  $('updated').title = date.toString();
  const stale = Date.now()-date.getTime() > 90*60*1000;
  $('status').textContent = stale ? 'Scores haven’t updated recently. Showing the last successful update.' : !players.length ? 'No managers added yet.' : scored.length < players.length ? 'Some managers are not listed for this event yet.' : '';
}
async function refresh(manual = false) {
  $('refresh').disabled = true;
  $('refresh').setAttribute('aria-busy','true');
  try {
    const response = await fetch(`./leaderboard.json?t=${Date.now()}`, {cache:'no-store'});
    if (!response.ok) throw new Error('Snapshot unavailable');
    const data = await response.json();
    if (!Array.isArray(data.players) || !data.event?.name || !Number.isFinite(Date.parse(data.updatedAt))) throw new Error('Invalid snapshot');
    render(data);
    if(manual && !$('status').textContent) $('status').textContent = 'You’re viewing the latest published scores.';
  } catch(error) {
    $('status').textContent = snapshot ? 'Couldn’t refresh. Your last loaded scores are still shown.' : 'Couldn’t load scores. Check your connection and try Refresh.';
    if(!snapshot) { $('event-name').textContent = 'Event unavailable'; $('updated').textContent = 'Waiting for scores'; }
  } finally { $('refresh').disabled = false; $('refresh').removeAttribute('aria-busy'); }
}
$('refresh').addEventListener('click',()=>refresh(true));
refresh();
