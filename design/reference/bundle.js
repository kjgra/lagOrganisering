/* Nymark – hjelpere for forhåndsvisninger: ikoner, demodata, lagfordeling og skjermene. Ingen nettverk. */
(function () {
  var P = {
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'check': '<path d="M20 6 9 17l-5-5"/>',
    'clock': '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    'map-pin': '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    'calendar': '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    'shuffle': '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/>',
    'bookmark': '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
    'eye': '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/>',
    'lock': '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    'grip': '<circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>',
    'minus': '<path d="M5 12h14"/>',
    'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
    'trash': '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    'arrow-down': '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'settings': '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    'send': '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
    'star': '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
    'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    'info': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    'alert': '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>'
  };
  function icon(n, s) { s = s || 24; return '<svg class="nm-icon" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || '') + '</svg>'; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function initials(name) { return name.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2); }

  var TEAMS = [{ n: 1, name: 'Oransje' }, { n: 2, name: 'Blå' }, { n: 3, name: 'Gul' }, { n: 4, name: 'Grønn' }, { n: 5, name: 'Rød' }, { n: 6, name: 'Lilla' }];
  var K = 'kommer', U = 'ikke-svart', N = 'kommer-ikke';
  var LOGO = '/_blob/3e650796de9d94b38f80cb0fee6f990c';
  var PLAYERS = [
    ['Aksel H.', K, ['Keeper']], ['Emil B.', K, []], ['Filip S.', K, ['Venstrebein']], ['Henrik L.', K, []],
    ['Isak M.', K, ['Ny']], ['Jakob T.', K, ['Keeper']], ['Johannes R.', K, []], ['Kasper N.', K, ['Forsvar']],
    ['Lars O.', U, []], ['Leon A.', K, []], ['Magnus E.', K, ['Venstrebein']], ['Noah K.', U, ['Ny']],
    ['Oliver V.', K, []], ['Sander F.', K, ['Forsvar']], ['Theo J.', U, []], ['Tobias G.', K, []],
    ['Vetle D.', N, []], ['William Ø.', K, []]
  ].map(function (p, i) { return { id: 'p' + i, name: p[0], status: p[1], tags: p[2] }; });
  var EVENTS = [
    { id: 'e1', wd: 'Tor', day: 15, title: 'Trening G10', time: '17:30–18:45', place: 'Nymark kunstgress', sent: true, kommer: 14, ikkeSvart: 3, kommerIkke: 1, group: 'Denne uken' },
    { id: 'e2', wd: 'Lør', day: 17, title: 'Internkamp', time: '10:00–11:30', place: 'Nymark kunstgress', sent: true, kommer: 11, ikkeSvart: 5, kommerIkke: 2, group: 'Denne uken' },
    { id: 'e3', wd: 'Tir', day: 20, title: 'Trening G10', time: '17:30–18:45', place: 'Nymark kunstgress', sent: false, invited: 18, group: 'Neste uke' },
    { id: 'e4', wd: 'Tor', day: 22, title: 'Trening G10', time: '17:30–18:45', place: 'Nymark kunstgress', sent: false, invited: 18, group: 'Neste uke' }
  ];

  /* Spond: hovedgrupper med undergrupper. Favoritter og sist brukt huskes per bruker. */
  var GROUPS = [
    { id: 'g1', name: 'Nymark IL – Fotball', members: 124, subs: [
      { id: 's1', name: 'Gutter 2016', members: 18 }, { id: 's2', name: 'Jenter 2016', members: 15 }, { id: 's3', name: 'Gutter 2015', members: 21 },
      { id: 's4', name: 'Gutter 2017', members: 19 }, { id: 's5', name: 'Jenter 2015', members: 14 }, { id: 's6', name: 'Keepertrening', members: 9 },
      { id: 's7', name: 'Trenerteam barnefotball', members: 12 }] },
    { id: 'g2', name: 'Nymark IL – Allidrett', members: 46, subs: [
      { id: 's8', name: '6-åringer', members: 16 }, { id: 's9', name: '7-åringer', members: 18 }, { id: 's10', name: 'Hjelpetrenere', members: 6 }] }
  ];
  var GS = { fav: { s1: true, s9: true }, current: { main: 'g1', sub: 's1' }, recent: ['s1', 's3'] };
  function findSub(id) { for (var i = 0; i < GROUPS.length; i++) for (var j = 0; j < GROUPS[i].subs.length; j++) if (GROUPS[i].subs[j].id === id) return { main: GROUPS[i], sub: GROUPS[i].subs[j] }; }
  function findMain(id) { for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].id === id) return GROUPS[i]; }
  function currentLabel() { var m = findMain(GS.current.main), c = GS.current.sub ? findSub(GS.current.sub) : null; return { main: m.name, sub: c ? c.sub.name : 'Alle i hovedgruppa' }; }
  function choose(mainId, subId) { GS.current = { main: mainId, sub: subId }; if (subId) { GS.recent = [subId].concat(GS.recent.filter(function (x) { return x !== subId; })).slice(0, 3); } }
  function star(on, label) { return '<button type="button" class="nm-iconbtn nm-star" aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="' + (on ? 'Fjern ' : 'Legg ') + esc(label) + (on ? ' fra favoritter' : ' til i favoritter') + '">' + icon('star', 24) + '</button>'; }
  function subRow(m, sub, opts) {
    opts = opts || {};
    var cur = GS.current.sub === sub.id;
    return '<li class="nm-grow' + (cur ? ' is-current' : '') + '"><button type="button" class="nm-grow__main" data-pick="' + m.id + ':' + sub.id + '"' + (cur ? ' aria-current="true"' : '') + '>' +
      '<span class="nm-grow__name">' + (cur ? icon('check', 20) : '') + esc(sub.name) + '</span><span class="nm-grow__meta">' + (opts.showMain ? esc(m.name) : sub.members + ' medlemmer') + '</span></button>' +
      star(GS.fav[sub.id], sub.name) + '</li>';
  }
  function bindStars(root, rerender) {
    root.querySelectorAll('.nm-star').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); var id = b.closest('.nm-grow').querySelector('[data-pick]').getAttribute('data-pick').split(':')[1]; if (GS.fav[id]) delete GS.fav[id]; else GS.fav[id] = true; rerender(); var again = root.querySelector('[data-pick$=":' + id + '"]'); if (again) again.parentNode.querySelector('.nm-star').focus(); }); });
  }

  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  /* Keepere spres først (én per lag), resten slangefordeles etter tilfeldig stokking. */
  function distribute(players, n, seed) {
    var r = rng(seed || 1), list = players.slice();
    for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = list[i]; list[i] = list[j]; list[j] = t; }
    list.sort(function (a, b) { return (b.tags.indexOf('Keeper') >= 0) - (a.tags.indexOf('Keeper') >= 0); });
    var teams = []; for (var k = 0; k < n; k++) teams.push([]);
    list.forEach(function (p, idx) { var round = Math.floor(idx / n), pos = idx % n; teams[round % 2 ? n - 1 - pos : pos].push(p.id); });
    return teams;
  }
  function byId(id) { for (var i = 0; i < PLAYERS.length; i++) if (PLAYERS[i].id === id) return PLAYERS[i]; }

  /* ---------- Primitiver (HTML-strenger) ---------- */
  var STATUS = { kommer: ['check', 'Kommer'], 'ikke-svart': ['clock', 'Ikke svart'], 'kommer-ikke': ['x', 'Kommer ikke'] };
  function badge(status) { var d = STATUS[status]; return '<span class="nm-badge nm-badge--' + status + '">' + icon(d[0], 16) + d[1] + '</span>'; }
  /* Svartellere: «Kommer 14 · Ikke svart 3 · Kommer ikke 1» + stablet måler. */
  function counts(k, u, n) {
    var tot = k + u + n || 1;
    return '<div class="nm-counts"><span class="is-kommer">' + icon('check', 18) + 'Kommer: <b>' + k + '</b></span><span class="is-ikke-svart">' + icon('clock', 18) + 'Ikke svart: <b>' + u + '</b></span><span class="is-kommer-ikke">' + icon('x', 18) + 'Kommer ikke: <b>' + n + '</b></span></div>' +
      '<div class="nm-meter" role="img" aria-label="' + k + ' kommer, ' + u + ' ikke svart, ' + n + ' kommer ikke"><span class="is-kommer" style="width:' + (k / tot * 100) + '%"></span><span class="is-ikke-svart" style="width:' + (u / tot * 100) + '%"></span><span class="is-kommer-ikke" style="width:' + (n / tot * 100) + '%"></span></div>';
  }
  function brand(lg) { return '<span class="nm-brand' + (lg ? ' nm-brand--lg' : '') + '"><img src="' + LOGO + '" alt=""><span><span class="nm-brand__name" style="display:block">Nymark</span><span class="nm-brand__sub" style="display:block">Gruppeorganisering</span></span></span>'; }
  function chip(p, opts) {
    opts = opts || {};
    var keeper = p.tags.indexOf('Keeper') >= 0 ? '<span class="nm-chip__mark" title="Keeper">K</span>' : '';
    return '<button type="button" class="nm-chip" draggable="true" data-id="' + p.id + '" aria-pressed="' + (opts.selected ? 'true' : 'false') + '">' +
      '<span class="nm-chip__grip">' + icon('grip', 18) + '</span>' + esc(p.name) + keeper + '</button>';
  }

  /* ---------- App-skall ---------- */
  function shell(o) {
    var nav = [['events', 'Arrangementer', 'calendar'], ['proposals', 'Lagforslag', 'bookmark']];
    var cl = currentLabel();
    var side = '<aside class="nm-side nm-chrome">' + brand() +
      '<div class="nm-side__group"><span class="nm-side__label">Gruppe</span><button class="nm-select" data-switch aria-haspopup="dialog" aria-label="Bytt gruppe – nå: ' + esc(cl.sub) + '"><span><span class="nm-select__main">' + esc(cl.main) + '</span><span class="nm-select__sub">└ ' + esc(cl.sub) + '</span></span>' + icon('chevron-down', 22) + '</button></div><nav>' +
      nav.map(function (n) { return '<a href="#" ' + (o.nav === n[0] ? 'aria-current="page"' : '') + '>' + icon(n[2], 22) + n[1] + '</a>'; }).join('') + '</nav>' +
      '<div class="nm-side__user">Innlogget som <strong>Kjetil</strong> &nbsp; <a href="#" class="nm-link-chrome">Logg ut</a></div></aside>';
    var top = !o.back;
    var bar = '<header class="nm-appbar nm-chrome">' +
      (o.back ? '<button class="nm-iconbtn" aria-label="Tilbake">' + icon('chevron-left', 26) + '</button><h1 class="nm-appbar__title">' + esc(o.title) + '</h1>'
        : '<span class="nm-phone-only" style="flex:1">' + brand() + '</span><h1 class="nm-appbar__title nm-desk-only">' + esc(o.title) + '</h1>') +
      '<button class="nm-iconbtn nm-iconbtn--chrome" aria-label="Innstillinger">' + icon('settings', 22) + '</button></header>';
    var bottom = o.bottomNav ? '<nav class="nm-bottomnav nm-chrome" aria-label="Hovedmeny">' + nav.map(function (n) { return '<a href="#" ' + (o.nav === n[0] ? 'aria-current="page"' : '') + '>' + icon(n[2], 22) + n[1] + '</a>'; }).join('') + '</nav>' : '';
    return '<div class="nm-app">' + side + bar + '<main class="nm-main' + (o.wide ? ' nm-main--wide' : '') + '"><div class="nm-main__inner">' +
      (top ? '<button class="nm-context nm-phone-only" data-switch aria-haspopup="dialog"><span><span class="nm-context__sub">' + esc(cl.sub) + '</span><span class="nm-context__main">' + esc(cl.main) + '</span></span><span class="nm-context__go">Bytt' + icon('chevron-down', 20) + '</span></button><h1 class="nm-page-title nm-phone-only">' + esc(o.title) + '</h1>' : '') + o.main + '</div></main>' +
      (o.actions ? '<div class="nm-actions">' + o.actions + '</div>' : '') + bottom + '<div class="nm-live nm-sr" aria-live="polite"></div></div>';
  }
  function toast(el, text) {
    var old = el.querySelector('.nm-toast'); if (old) old.remove();
    var t = document.createElement('div'); t.className = 'nm-toast'; t.setAttribute('role', 'status'); t.innerHTML = icon('check', 20) + esc(text);
    el.querySelector('.nm-app, .nm-login').appendChild(t); setTimeout(function () { t.remove(); }, 2400);
  }

  /* ---------- Skjermer ---------- */
  var S = {};
  S.LoginForm = function (el, state) {
    state = state || {};
    el.innerHTML = '<div class="nm-login"><div class="nm-login__top nm-chrome">' + brand(true) + '</div><div class="nm-login__body"><form class="nm-login__card" novalidate>' +
      '<h2 style="margin:0;font-size:26px;line-height:32px">Logg inn med Spond</h2>' +
      '<p style="margin:0;font-size:18px;line-height:26px">Bruk samme e-post og passord som i Spond-appen.</p>' +
      (state.error ? '<div class="nm-alert" role="alert">' + icon('alert', 22) + '<span>Feil e-post eller passord. Sjekk og prøv igjen.</span></div>' : '') +
      '<label class="nm-field"><span class="nm-field__label">E-post</span><input class="nm-input" type="email" autocomplete="username" inputmode="email" value="' + (state.error ? 'trener@eksempel.no' : '') + '" placeholder="navn@eksempel.no"></label>' +
      '<label class="nm-field"><span class="nm-field__label">Passord</span><span class="nm-input-wrap"><input class="nm-input" type="password" autocomplete="current-password" value="' + (state.error ? 'hemmelig' : '') + '"><button type="button" class="nm-iconbtn nm-pw" aria-label="Vis passord">' + icon('eye', 22) + '</button></span></label>' +
      '<button class="nm-btn nm-btn--primary nm-btn--lg nm-btn--block" type="submit">Logg inn</button>' +
      '<div class="nm-note">' + icon('lock', 22) + '<span>Passordet ditt lagres ikke. Det sendes direkte til Spond én gang for å logge deg inn.</span></div>' +
      '</form></div></div>';
    var pw = el.querySelector('.nm-pw');
    pw.addEventListener('click', function () { var i = el.querySelector('input[autocomplete="current-password"]'), show = i.type === 'password'; i.type = show ? 'text' : 'password'; pw.setAttribute('aria-label', show ? 'Skjul passord' : 'Vis passord'); pw.innerHTML = icon(show ? 'eye-off' : 'eye', 22); });
    el.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); var b = this.querySelector('[type=submit]'); b.setAttribute('aria-busy', 'true'); b.textContent = 'Logger inn …'; setTimeout(function () { S.GroupPicker(el); }, 900); });
  };

  S.EventList = function (el) {
    var groups = {}, order = [];
    EVENTS.forEach(function (e) { if (!groups[e.group]) { groups[e.group] = []; order.push(e.group); } groups[e.group].push(e); });
    var main = order.map(function (g) {
      return '<h2 class="nm-section-label">' + g + '</h2><div class="nm-stack">' + groups[g].map(function (e) {
        var resp = e.sent ? counts(e.kommer, e.ikkeSvart, e.kommerIkke)
          : '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px"><span class="nm-badge nm-badge--neutral">' + icon('send', 16) + 'Ikke sendt</span><span class="nm-muted" style="font-size:16px">' + e.invited + ' blir invitert</span></div>';
        return '<a href="#" class="nm-card nm-event"><div class="nm-date' + (e.sent ? '' : ' nm-date--unsent') + '"><span class="nm-date__wd">' + e.wd + '</span><span class="nm-date__day">' + e.day + '</span></div>' +
          '<div style="min-width:0;display:flex;flex-direction:column;gap:6px"><div style="font-size:20px;line-height:26px;font-weight:700">' + esc(e.title) + '</div>' +
          '<div class="nm-meta"><span>' + icon('clock', 18) + e.time + '</span><span>' + icon('map-pin', 18) + esc(e.place) + '</span></div></div>' +
          '<span class="nm-muted nm-event__go">' + icon('chevron-right', 24) + '</span><div class="nm-event__resp">' + resp + '</div></a>';
      }).join('') + '</div>';
    }).join('');
    el.innerHTML = shell({ title: 'Kommende arrangementer', nav: 'events', bottomNav: true, main: main });
  };

  S.ParticipantList = function (el) {
    var filter = 'alle';
    function render() {
      var cnt = function (st) { return PLAYERS.filter(function (p) { return p.status === st; }).length; }, going = cnt(K), waiting = cnt(U), declined = cnt(N);
      var rank = { kommer: 0, 'ikke-svart': 1, 'kommer-ikke': 2 }; var list = PLAYERS.filter(function (p) { return filter === 'alle' || p.status === filter; }).sort(function (a, b) { return rank[a.status] - rank[b.status] || a.name.localeCompare(b.name, 'nb'); });
      var main = '<div class="nm-stack" style="gap:16px">' +
        '<div><div style="font-size:20px;line-height:26px;font-weight:700">Trening G10</div><div class="nm-meta"><span>' + icon('calendar', 18) + 'Tor 15. okt</span><span>' + icon('clock', 18) + '17:30–18:45</span><span>' + icon('map-pin', 18) + 'Nymark kunstgress</span></div><div style="margin-top:10px;display:flex;flex-direction:column;gap:6px">' + counts(going, waiting, declined) + '</div></div>' +
        '<div class="nm-seg" role="group" aria-label="Filtrer spillere">' +
        [['alle', 'Alle ' + PLAYERS.length], [K, 'Kommer ' + going], [U, 'Ikke svart ' + waiting], [N, 'Kommer ikke ' + declined]].map(function (f) { return '<button type="button" data-f="' + f[0] + '" aria-pressed="' + (filter === f[0]) + '">' + f[1] + '</button>'; }).join('') + '</div>' +
        '<ul class="nm-list">' + list.map(function (p) {
          return '<li><span class="nm-avatar">' + initials(p.name) + '</span><div class="nm-list__main"><span class="nm-list__name">' + esc(p.name) + '</span>' +
            (p.tags.length ? '<span class="nm-row" style="gap:6px">' + p.tags.map(function (t) { return '<span class="nm-tag">' + esc(t) + '</span>'; }).join('') + '</span>' : '') + '</div>' + badge(p.status) + '</li>';
        }).join('') + '</ul></div>';
      el.innerHTML = shell({ title: 'Påmeldte', back: true, main: main, actions: '<button class="nm-btn nm-btn--primary nm-btn--lg">' + icon('users', 22) + 'Lag lag av ' + going + ' spillere</button>' });
      el.querySelectorAll('.nm-seg button').forEach(function (b) { b.addEventListener('click', function () { filter = b.getAttribute('data-f'); render(); }); });
    }
    render();
  };

  S.TeamBoard = function (el) {
    var going = PLAYERS.filter(function (p) { return p.status === K; });
    var st = { n: 3, seed: 3, teams: null, sel: null, saved: 2 };
    st.teams = distribute(going, st.n, st.seed);
    function teamOf(id) { for (var i = 0; i < st.teams.length; i++) if (st.teams[i].indexOf(id) >= 0) return i; return -1; }
    function move(id, to) {
      var from = teamOf(id); if (from < 0 || from === to) return;
      st.teams[from].splice(st.teams[from].indexOf(id), 1); st.teams[to].push(id); st.sel = null; render();
      el.querySelector('.nm-live').textContent = byId(id).name + ' flyttet til Lag ' + (to + 1) + '.';
    }
    function render() {
      var selP = st.sel && byId(st.sel), src = st.sel ? teamOf(st.sel) : -1;
      var controls = '<div class="nm-row" style="justify-content:space-between;margin-bottom:16px">' +
        '<div class="nm-stack" style="gap:2px"><span style="font-size:16px;font-weight:700">Antall lag</span><span class="nm-muted" style="font-size:14px">' + going.length + ' spillere kommer</span></div>' +
        '<div class="nm-stepper"><button class="nm-iconbtn nm-iconbtn--outline" data-step="-1" aria-label="Færre lag"' + (st.n <= 2 ? ' disabled' : '') + '>' + icon('minus', 22) + '</button>' +
        '<span class="nm-stepper__value" aria-live="polite">' + st.n + ' lag</span>' +
        '<button class="nm-iconbtn nm-iconbtn--outline" data-step="1" aria-label="Flere lag"' + (st.n >= 6 ? ' disabled' : '') + '>' + icon('plus', 22) + '</button></div></div>';
      var hint = selP ? '<div class="nm-movebar" style="margin-bottom:12px">' + esc(selP.name) + ' er valgt. Trykk på laget spilleren skal til.<button class="nm-btn nm-cancel">Avbryt</button></div>'
        : '<p class="nm-muted" style="margin:0 0 12px;font-size:16px;line-height:22px"><span class="nm-phone-only">Trykk på en spiller, deretter på et lag for å flytte.</span><span class="nm-desk-only">Dra spillere mellom lagene, eller trykk på spiller og deretter lag.</span></p>';
      var teams = '<div class="nm-teams' + (selP ? ' is-moving' : '') + '">' + st.teams.map(function (ids, i) {
        var t = TEAMS[i];
        return '<section class="nm-team nm-team--' + t.n + (i === src ? ' is-source' : '') + '" data-team="' + i + '" aria-label="Lag ' + t.n + ' ' + t.name + '">' +
          '<div class="nm-team__head"><span>Lag ' + t.n + ' · ' + t.name + '</span><span class="nm-team__count">' + ids.length + '</span></div>' +
          '<div class="nm-team__body">' + ids.map(function (id) { return chip(byId(id), { selected: id === st.sel }); }).join('') +
          '<button type="button" class="nm-team__drop" data-to="' + i + '">' + icon('arrow-down', 20) + 'Flytt hit</button></div></section>';
      }).join('') + '</div>';
      el.innerHTML = shell({ title: 'Lag · Tor 15. okt', back: true, wide: true, main: controls + hint + teams,
        actions: '<button class="nm-btn nm-btn--secondary nm-btn--lg nm-reshuffle">' + icon('shuffle', 22) + 'Fordel på nytt</button><button class="nm-btn nm-btn--primary nm-btn--lg nm-save">' + icon('bookmark', 22) + 'Lagre forslag</button>' });
      bind();
    }
    function bind() {
      el.querySelectorAll('[data-step]').forEach(function (b) { b.addEventListener('click', function () { st.n = Math.max(2, Math.min(6, st.n + +b.getAttribute('data-step'))); st.sel = null; st.teams = distribute(going, st.n, st.seed); render(); }); });
      el.querySelector('.nm-reshuffle').addEventListener('click', function () { st.seed++; st.sel = null; st.teams = distribute(going, st.n, st.seed); render(); el.querySelector('.nm-live').textContent = 'Spillerne er fordelt på nytt.'; });
      el.querySelector('.nm-save').addEventListener('click', function () { st.saved++; toast(el, 'Forslag ' + st.saved + ' lagret'); });
      var c = el.querySelector('.nm-cancel'); if (c) c.addEventListener('click', function () { st.sel = null; render(); });
      el.querySelectorAll('.nm-chip').forEach(function (ch) {
        var id = ch.getAttribute('data-id');
        ch.addEventListener('click', function (e) { e.stopPropagation(); st.sel = st.sel === id ? null : id; render(); var again = el.querySelector('.nm-chip[data-id="' + id + '"]'); if (again) again.focus(); });
        ch.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; ch.classList.add('is-dragging'); });
        ch.addEventListener('dragend', function () { ch.classList.remove('is-dragging'); });
      });
      el.querySelectorAll('.nm-team__drop').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); move(st.sel, +b.getAttribute('data-to')); }); });
      el.querySelectorAll('.nm-team').forEach(function (t) {
        var i = +t.getAttribute('data-team');
        t.addEventListener('click', function () { if (st.sel) move(st.sel, i); });
        t.addEventListener('dragover', function (e) { e.preventDefault(); t.classList.add('is-over'); });
        t.addEventListener('dragleave', function () { t.classList.remove('is-over'); });
        t.addEventListener('drop', function (e) { e.preventDefault(); t.classList.remove('is-over'); move(e.dataTransfer.getData('text/plain'), i); });
      });
    }
    render();
  };

  S.SavedProposals = function (el) {
    var data = [
      { ev: 'Trening G10 · Tor 15. okt', items: [{ name: 'Forslag 2', at: 'Lagret i dag kl. 21:04', sizes: [5, 5, 4] }, { name: 'Forslag 1', at: 'Lagret i dag kl. 20:51', sizes: [7, 7] }] },
      { ev: 'Internkamp · Lør 17. okt', items: [{ name: 'Forslag 1', at: 'Lagret i går kl. 19:12', sizes: [4, 4, 3] }] }
    ];
    function render() {
      var main = data.filter(function (g) { return g.items.length; }).map(function (g, gi) {
        return '<h2 class="nm-section-label"' + (gi === 0 ? ' style="margin-top:0"' : '') + '>' + esc(g.ev) + '</h2><div class="nm-stack nm-proposals">' + g.items.map(function (p, pi) {
          var total = p.sizes.reduce(function (a, b) { return a + b; }, 0);
          return '<article class="nm-card nm-proposal"><div class="nm-row" style="justify-content:space-between"><div><div style="font-size:20px;line-height:26px;font-weight:700">' + p.name + '</div>' +
            '<div class="nm-muted" style="font-size:16px">' + p.sizes.length + ' lag · ' + total + ' spillere · ' + p.at + '</div></div></div>' +
            '<div class="nm-swatches" aria-hidden="true">' + p.sizes.map(function (s, i) { return '<span class="nm-team--' + (i + 1) + '">' + s + '</span>'; }).join('') + '</div>' +
            '<div class="nm-row" style="gap:8px"><button class="nm-btn nm-btn--secondary" style="flex:1">Åpne</button><button class="nm-btn nm-btn--danger nm-del" data-g="' + data.indexOf(g) + '" data-i="' + pi + '">' + icon('trash', 20) + 'Slett</button></div></article>';
        }).join('') + '</div>';
      }).join('') || '<p style="font-size:18px">Ingen lagrede forslag ennå. Lag lag fra et arrangement og trykk «Lagre forslag».</p>';
      el.innerHTML = shell({ title: 'Lagrede lagforslag', nav: 'proposals', bottomNav: true, main: main });
      el.querySelectorAll('.nm-del').forEach(function (b) { b.addEventListener('click', function () { var g = data[+b.getAttribute('data-g')], it = g.items.splice(+b.getAttribute('data-i'), 1)[0]; render(); toast(el, it.name + ' slettet'); }); });
    }
    render();
  };

  /* GroupPicker: etter innlogging. Én hovedgruppe → rett til undergrupper. Flere → favoritter + hovedgrupper.
     Mobil: to steg (hovedgruppe → undergruppe). Desktop: hovedgrupper til venstre, undergrupper til høyre. */
  S.GroupPicker = function (el, opts) {
    opts = opts || {};
    var single = GROUPS.length === 1;
    var st = { step: single ? 'sub' : 'main', main: opts.main || GS.current.main || GROUPS[0].id, q: '' };
    function render() {
      var m = findMain(st.main);
      var favs = []; GROUPS.forEach(function (g) { g.subs.forEach(function (x) { if (GS.fav[x.id]) favs.push([g, x]); }); });
      var favBlock = favs.length ? '<section class="nm-fav-all"><h2 class="nm-section-label" style="margin-top:0">' + icon('star', 16) + ' Favoritter</h2><ul class="nm-list nm-groups">' + favs.map(function (f) { return subRow(f[0], f[1], { showMain: true }); }).join('') + '</ul></section>'
        : '<div class="nm-note nm-fav-all">' + icon('star', 22) + '<span>Trykk på stjerna ved en gruppe du bruker ofte. Favorittene dine ligger øverst her og i gruppebytteren.</span></div>';
      var mains = '<section class="nm-picker__main"><h2 class="nm-section-label">Hovedgrupper</h2><ul class="nm-list nm-groups">' + GROUPS.map(function (g) {
        var sel = g.id === st.main;
        return '<li class="nm-grow' + (sel ? ' is-selected' : '') + '"><button type="button" class="nm-grow__main" data-main="' + g.id + '"' + (sel ? ' aria-current="true"' : '') + '><span class="nm-grow__name">' + esc(g.name) + '</span><span class="nm-grow__meta">' + g.subs.length + ' undergrupper · ' + g.members + ' medlemmer</span></button><span class="nm-grow__go">' + icon('chevron-right', 24) + '</span></li>';
      }).join('') + '</ul></section>';
      var q = st.q.toLowerCase(), list = m.subs.filter(function (x) { return !q || x.name.toLowerCase().indexOf(q) >= 0; });
      var mf = list.filter(function (x) { return GS.fav[x.id]; }), rest = list.filter(function (x) { return !GS.fav[x.id]; });
      var subs = '<section class="nm-picker__sub">' +
        (single ? '' : '<button class="nm-btn nm-btn--ghost nm-phone-only nm-back" style="padding-left:4px;margin:0 0 4px -4px">' + icon('chevron-left', 22) + 'Hovedgrupper</button>') +
        '<h2 class="nm-picker__title">' + esc(m.name) + '</h2>' +
        (m.subs.length > 6 ? '<label class="nm-search"><span class="nm-sr">Søk i undergrupper</span>' + icon('search', 22) + '<input class="nm-input" type="search" placeholder="Søk i ' + m.subs.length + ' undergrupper" value="' + esc(st.q) + '"></label>' : '') +
        '<ul class="nm-list nm-groups" style="margin-top:12px"><li class="nm-grow' + (GS.current.main === m.id && !GS.current.sub ? ' is-current' : '') + '"><button type="button" class="nm-grow__main" data-pick="' + m.id + ':"><span class="nm-grow__name">' + icon('users', 20) + 'Alle i hovedgruppa</span><span class="nm-grow__meta">' + m.members + ' medlemmer · for å fordele hele gruppa</span></button></li></ul>' +
        (mf.length ? '<h3 class="nm-section-label">' + icon('star', 16) + ' Favoritter</h3><ul class="nm-list nm-groups">' + mf.map(function (x) { return subRow(m, x); }).join('') + '</ul>' : '') +
        '<h3 class="nm-section-label">Undergrupper</h3>' + (rest.length ? '<ul class="nm-list nm-groups">' + rest.map(function (x) { return subRow(m, x); }).join('') + '</ul>' : '<p class="nm-muted" style="font-size:16px">Ingen treff på «' + esc(st.q) + '».</p>') +
        '</section>';
      el.innerHTML = '<div class="nm-login"><div class="nm-login__top nm-chrome">' + brand() + '<span class="nm-desk-only" style="color:var(--on-chrome-muted);font-size:16px">Innlogget som <strong style="color:var(--on-chrome)">Kjetil</strong></span></div>' +
        '<div class="nm-picker-body"><h1 class="nm-page-title">Velg gruppe</h1><p class="nm-picker-lead">' + (single ? 'Velg undergruppa du skal jobbe med.' : 'Du er med i ' + GROUPS.length + ' hovedgrupper. Velg undergruppa du skal jobbe med.') + '</p>' +
        '<div class="nm-picker is-step-' + st.step + (single ? ' is-single' : '') + '">' + favBlock + mains + subs + '</div>' +
        '<p class="nm-muted nm-picker-foot">' + icon('info', 18) + 'Valget huskes. Neste gang åpner appen rett i gruppa du brukte sist.</p></div><div class="nm-live nm-sr" aria-live="polite"></div></div>';
      el.querySelectorAll('[data-main]').forEach(function (b) { b.addEventListener('click', function () { st.main = b.getAttribute('data-main'); st.step = 'sub'; st.q = ''; render(); var t = el.querySelector('.nm-picker__title'); if (t) { t.setAttribute('tabindex', '-1'); t.focus(); } }); });
      var back = el.querySelector('.nm-back'); if (back) back.addEventListener('click', function () { st.step = 'main'; render(); });
      el.querySelectorAll('[data-pick]').forEach(function (b) { b.addEventListener('click', function () { var p = b.getAttribute('data-pick').split(':'); choose(p[0], p[1] || null); S.EventList(el); toast(el, 'Åpnet ' + currentLabel().sub); }); });
      var inp = el.querySelector('.nm-search input'); if (inp) inp.addEventListener('input', function () { st.q = inp.value; var pos = inp.selectionStart; render(); var n = el.querySelector('.nm-search input'); n.focus(); n.setSelectionRange(pos, pos); });
      bindStars(el, render);
    }
    render();
  };

  /* GroupSwitcher: bunnark på mobil, panel ved gruppevelgeren på desktop. Favoritter + sist brukt + «Alle grupper». */
  function openSwitcher(dev, screen) {
    function render() {
      var old = dev.querySelector('.nm-sheet-wrap'); if (old) old.remove();
      var favs = [], rec = [];
      GROUPS.forEach(function (g) { g.subs.forEach(function (x) { if (GS.fav[x.id]) favs.push([g, x]); }); });
      GS.recent.forEach(function (id) { var f = findSub(id); if (f && !GS.fav[id]) rec.push([f.main, f.sub]); });
      var w = document.createElement('div'); w.className = 'nm-sheet-wrap';
      w.innerHTML = '<div class="nm-backdrop"></div><div class="nm-sheet" role="dialog" aria-modal="true" aria-labelledby="nm-sw-t"><div class="nm-sheet__handle"></div>' +
        '<div class="nm-sheet__head"><h2 id="nm-sw-t">Bytt gruppe</h2><button class="nm-iconbtn nm-iconbtn--outline nm-close" aria-label="Lukk">' + icon('x', 22) + '</button></div>' +
        (favs.length ? '<h3 class="nm-section-label" style="margin-top:0">' + icon('star', 16) + ' Favoritter</h3><ul class="nm-list nm-groups">' + favs.map(function (f) { return subRow(f[0], f[1], { showMain: GROUPS.length > 1 }); }).join('') + '</ul>' : '') +
        (rec.length ? '<h3 class="nm-section-label">Sist brukt</h3><ul class="nm-list nm-groups">' + rec.map(function (f) { return subRow(f[0], f[1], { showMain: GROUPS.length > 1 }); }).join('') + '</ul>' : '') +
        '<button class="nm-btn nm-btn--secondary nm-btn--block nm-all" style="margin-top:16px">' + icon('users', 22) + 'Alle grupper</button></div>';
      dev.appendChild(w);
      w.querySelector('.nm-backdrop').addEventListener('click', close);
      w.querySelector('.nm-close').addEventListener('click', close);
      w.querySelector('.nm-all').addEventListener('click', function () { w.remove(); S.GroupPicker(dev); });
      w.querySelectorAll('[data-pick]').forEach(function (b) { b.addEventListener('click', function () { var p = b.getAttribute('data-pick').split(':'); choose(p[0], p[1]); w.remove(); S[screen](dev); toast(dev, 'Byttet til ' + currentLabel().sub); }); });
      bindStars(w, render);
      w.querySelector('.nm-close').focus();
    }
    function close() { var w = dev.querySelector('.nm-sheet-wrap'); if (w) w.remove(); var t = dev.querySelector('[data-switch]'); if (t && t.offsetParent) t.focus(); }
    render();
  }

  /* Forhåndsvisning: samme skjerm i mobil (375 px) og desktop (1024 px). */
  function stage(root, name, opts) {
    root.className = 'nm-root';
    root.innerHTML = '<div class="nm-stage"><div class="nm-stage__col"><span class="nm-stage__label">Mobil · 375 px</span><div class="nm-device nm-device--phone"></div></div>' +
      '<div class="nm-stage__col"><span class="nm-stage__label">Desktop · 1024 px</span><div class="nm-device nm-device--desktop"></div></div></div>';
    root.querySelectorAll('.nm-device').forEach(function (d) {
      S[name](d, opts);
      d.addEventListener('click', function (e) { if (e.target.closest('[data-switch]')) { var scr = d.querySelector('.nm-bottomnav [aria-current], .nm-side nav [aria-current]'); openSwitcher(d, scr && /Lagforslag/.test(scr.textContent) ? 'SavedProposals' : 'EventList'); } });
      d.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var w = d.querySelector('.nm-sheet-wrap'); if (w) w.remove(); } });
      if (opts && opts.openSwitcher) openSwitcher(d, name);
    });
  }

  window.Nymark = { groups: GROUPS, groupState: GS, openSwitcher: openSwitcher, icon: icon, badge: badge, counts: counts, brand: brand, logo: LOGO, chip: chip, distribute: distribute, players: PLAYERS, events: EVENTS, teams: TEAMS, screens: S, stage: stage };
})();
