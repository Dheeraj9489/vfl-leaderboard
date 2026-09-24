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
  const expanded = new Set([...document.querySelectorAll('.roster-toggle[aria-expanded="true"]')].map(button=>button.dataset.username));
  snapshot = data;
  document.title = `${data.name} · Valorant Fantasy`;
  if (data.name !== 'The Friends League') $('title').textContent = data.name;
  $('event-name').textContent = data.event.name;
  $('player-count').textContent = data.players.length;
  const players = [...data.players].sort((a,b) => (b.points ?? -Infinity) - (a.points ?? -Infinity) || a.username.localeCompare(b.username));
  const scored = players.filter(p => Number.isFinite(p.points));
  const best = scored[0]?.points;
  let rank = 0, previous;
  const rows = players.flatMap((player, index) => {
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
    const link = element('button','username roster-toggle',player.username);
    link.type = 'button';
    link.dataset.username = player.username;
    link.setAttribute('aria-expanded','false');
    link.setAttribute('aria-controls',`roster-${index}`);
    const rosterRow = element('tr','roster-row');
    rosterRow.id = `roster-${index}`;
    rosterRow.hidden = !expanded.has(player.username);
    link.setAttribute('aria-expanded',String(!rosterRow.hidden));
    const cell = element('td'); cell.colSpan = 3;
    const panel = element('section','roster-panel');
    panel.setAttribute('aria-label',`${player.username}'s roster`);
    panel.append(element('h3','',`${player.username}’s roster`));
    if (player.rosterStatus === 'ok') {
      const list = element('ul','roster-list');
      for (const member of player.roster) {
        const item = element('li', member.isIgl ? 'is-igl' : '');
        const heading = element('div','roster-player-heading');
        const points = Number.isFinite(member.points) ? `${number.format(member.points)} pts` : '—';
        heading.append(element('strong','',member.name),element('strong','roster-points',points));
        item.append(heading,element('span','', [member.team, member.isIgl ? 'IGL (2x)' : '', member.isStarter ? '' : 'Bench'].filter(Boolean).join(' · ')));
        list.append(item);
      }
      panel.append(list);
    } else {
      panel.append(element('p','',player.rosterStatus === 'no-link' || !player.teamUrl ? 'Team link hasn’t been added yet.' : player.rosterStatus === 'empty' ? 'No players in this roster yet.' : 'Roster is temporarily unavailable. Check their VFL profile.'));
    }
    if (player.teamUrl && /^https:\/\/www\.valorantfantasyleague\.net\/team\/\d+\/?$/.test(player.teamUrl)) {
      const source = element('a','roster-source','View team on VFL ↗');
      source.href = player.teamUrl; source.target = '_blank'; source.rel = 'noopener noreferrer';
      panel.append(source);
    }
    cell.append(panel); rosterRow.append(cell);
    link.addEventListener('click',()=>{
      rosterRow.hidden = !rosterRow.hidden;
      link.setAttribute('aria-expanded',String(!rosterRow.hidden));
    });
    info.append(link);
    if (!available) {
      info.append(element('span','detail','Not on this event’s leaderboard'));
    }
    manager.append(avatar, info); managerCell.append(manager);
    row.append(rankCell,managerCell,element('td','points',available ? number.format(player.points) : '—'));
    return [row,rosterRow];
  });
  $('rows').replaceChildren(...rows);
  $('tie-note').hidden = !(scored.length > 1 && scored.length === players.length && scored.every(p => p.points === best));
  const date = new Date(data.updatedAt);
  $('updated').textContent = `Updated ${date.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}`;
  $('updated').title = date.toString();
  // Fixed CDT (UTC-5), matching the scheduled workflow.
  const cdt = new Date(Date.now()-5*60*60*1000);
  const minute = cdt.getUTCHours()*60+cdt.getUTCMinutes();
  const inWindow = minute >= 240 && minute <= 720;
  const stale = inWindow && minute >= 330 && Date.now()-date.getTime() > 90*60*1000;
  $('status').textContent = stale ? 'Scores haven’t updated recently. Showing the last successful update.' : !inWindow ? 'Updates resume at 4 a.m. CDT. Showing the latest published scores.' : !players.length ? 'No managers added yet.' : scored.length < players.length ? 'Some managers are not listed for this event yet.' : '';
}
async function refresh() {
  try {
    const response = await fetch(`./leaderboard.json?t=${Date.now()}`, {cache:'no-store'});
    if (!response.ok) throw new Error('Snapshot unavailable');
    const data = await response.json();
    if (!Array.isArray(data.players) || !data.event?.name || !Number.isFinite(Date.parse(data.updatedAt))) throw new Error('Invalid snapshot');
    render(data);
  } catch(error) {
    console.error('Failed to load or render leaderboard:', error);
    $('status').textContent = snapshot ? 'Couldn’t refresh. Your last loaded scores are still shown.' : 'Couldn’t load scores. Check your connection and reload the page.';
    if(!snapshot) { $('event-name').textContent = 'Event unavailable'; $('updated').textContent = 'Waiting for scores'; }
  }
}
refresh();
setInterval(() => {
  const cdt = new Date(Date.now()-5*60*60*1000);
  const minute = cdt.getUTCHours()*60+cdt.getUTCMinutes();
  if (!document.hidden && minute >= 240 && minute <= 720) refresh();
}, 30*60*1000);
