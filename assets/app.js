(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

  /* ---------- Clipboard ---------- */
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch {}
      ta.remove(); return ok;
    }
  }
  function flash(btn, label = 'Copied') {
    const prev = btn.dataset.label || btn.textContent;
    btn.dataset.label = prev;
    btn.textContent = label; btn.classList.add('ok');
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { btn.textContent = prev; btn.classList.remove('ok'); }, 1400);
  }
  document.addEventListener('click', async e => {
    const btn = e.target.closest('.copy');
    if (!btn || btn.id === 'copySkill') return;
    const code = btn.parentElement.querySelector('code');
    if (code && await copyText(code.textContent.trim())) flash(btn);
  });

  /* ---------- Path (terminal / desktop) ---------- */
  const root = document.documentElement;
  const pathListeners = [];
  const getPath = () => root.dataset.path === 'desktop' ? 'desktop' : 'terminal';
  function setPath(p, { scroll } = {}) {
    p = p === 'desktop' ? 'desktop' : 'terminal';
    root.dataset.path = p;
    store.set('fg-path', p);
    $$('[data-set-path]').forEach(b => b.hasAttribute('aria-pressed') && b.setAttribute('aria-pressed', b.dataset.setPath === p));
    $$('[data-surface]').forEach(s => s.classList.toggle('feature', s.dataset.surface === p));
    try {
      const u = new URL(location.href);
      u.searchParams.set('path', p);
      history.replaceState(null, '', u);
    } catch {}
    pathListeners.forEach(fn => fn(p));
    if (scroll) $('#setup').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-set-path]'); if (!b) return;
    setPath(b.dataset.setPath, { scroll: b.classList.contains('use-btn') });
  });

  /* ---------- Nav ---------- */
  const nav = $('#nav');
  addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 8), { passive: true });

  /* ---------- Hero video ---------- */
  const heroVideo = $('#heroVideo');
  if (heroVideo && reduced) { heroVideo.removeAttribute('autoplay'); heroVideo.pause(); }

  /* ---------- Ticker ---------- */
  const items = ['Claude Code', 'Desktop app', 'Homebrew', 'Ghostty', 'GitHub', 'Conductor', 'Wispr Flow', 'Skills', '/clear', 'Connectors'];
  const one = items.map((t, i) => `<span>${i % 2 ? `<em>${t}</em>` : t},</span>`).join('');
  $('#ticker').innerHTML = one + one;

  /* ---------- Hero terminal ---------- */
  const script = [
    ['c', '# make a home for the project'],
    ['p', 'mkdir ai-workflows-demo && cd ai-workflows-demo'],
    ['p', 'claude'],
    ['k', '> Build me a one-page guide to our AI tools. Ask me any questions you have.'],
    ['o', '  Reading the meeting transcript…'],
    ['o', '  Who is this for: beginners or teammates?'],
    ['k', '> Total beginners.'],
    ['o', '  ✓ Created index.html, assets/styles.css'],
    ['o', '  ✓ Pushed to GitHub. Pages is live.'],
  ];
  const term = $('#termBody');
  function renderLine(type, text) {
    const pre = type === 'p' ? '<span class="p">$ </span>' : '';
    const cls = type === 'c' ? 'c' : type === 'k' ? 'k' : '';
    return `<div>${pre}<span class="${cls}">${text.replace(/</g, '&lt;')}</span></div>`;
  }
  if (reduced) {
    term.innerHTML = script.map(([t, s]) => renderLine(t, s)).join('');
  } else {
    let li = 0;
    const run = () => {
      if (li >= script.length) {
        term.insertAdjacentHTML('beforeend', '<span class="p">$ </span><span class="caret"></span>');
        setTimeout(() => { term.innerHTML = ''; li = 0; run(); }, 5200);
        return;
      }
      const [type, text] = script[li];
      const typed = type === 'p' || type === 'k';
      const holder = document.createElement('div');
      term.appendChild(holder);
      if (!typed) {
        holder.outerHTML = renderLine(type, text);
        li++; setTimeout(run, type === 'o' ? 420 : 300);
        return;
      }
      let ci = 0;
      const tick = () => {
        ci++;
        holder.innerHTML = renderLine(type, text.slice(0, ci)).slice(5, -6) + '<span class="caret"></span>';
        if (ci < text.length) setTimeout(tick, 22 + Math.random() * 30);
        else { holder.innerHTML = renderLine(type, text).slice(5, -6); li++; setTimeout(run, 520); }
      };
      tick();
    };
    setTimeout(run, 500);
  }

  /* ---------- Hero desktop-app mock ---------- */
  const APP_MSGS = [
    ['me', 'Build me a one-page guide to our AI tools. Ask me any questions you have.'],
    ['ai', 'Happy to. Who is it for: total beginners or teammates?'],
    ['me', 'Total beginners.'],
    ['ai', 'Done. Created index.html and styles.css, and opened a preview in the Browser pane.<br><span class="diff">+412 −0</span>'],
  ];
  const appMsgs = $('#appMsgs');
  if (reduced) {
    appMsgs.innerHTML = APP_MSGS.map(([w, t]) => `<div class="msg ${w}">${t}</div>`).join('');
  } else {
    let ai = 0;
    const next = () => {
      if (ai >= APP_MSGS.length) { setTimeout(() => { appMsgs.innerHTML = ''; ai = 0; next(); }, 5200); return; }
      const [w, t] = APP_MSGS[ai++];
      appMsgs.insertAdjacentHTML('beforeend', `<div class="msg ${w}">${t}</div>`);
      setTimeout(next, w === 'me' ? 1300 : 1700);
    };
    setTimeout(next, 600);
  }

  /* ---------- Setup steps (one list per path) ---------- */
  // Carry over progress saved before the desktop path existed.
  const legacy = store.get('fg-steps', null);
  if (legacy && !store.get('fg-steps-terminal', null)) store.set('fg-steps-terminal', legacy);

  function toggleOpen(s, force) {
    const open = force ?? !s.classList.contains('open');
    s.classList.toggle('open', open);
    $('.step-head', s).setAttribute('aria-expanded', open);
  }
  const lists = {};
  $$('.steps[data-steps]').forEach(list => {
    const key = list.dataset.steps;
    const steps = $$('.step', list);
    const state = { steps, done: new Set(store.get('fg-steps-' + key, [])) };
    lists[key] = state;
    steps.forEach((s, i) => {
      $('.step-head', s).addEventListener('click', () => toggleOpen(s));
      $('.done-btn', s).addEventListener('click', () => {
        const id = s.dataset.step;
        if (state.done.has(id)) { state.done.delete(id); syncSteps(); return; }
        state.done.add(id); syncSteps();
        toggleOpen(s, false);
        const next = steps.slice(i + 1).find(n => !state.done.has(n.dataset.step));
        if (next) { toggleOpen(next, true); setTimeout(() => next.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }), 250); }
      });
    });
    steps.forEach(s => {
      const isDone = state.done.has(s.dataset.step);
      s.classList.toggle('done', isDone);
    });
    toggleOpen(steps.find(s => !state.done.has(s.dataset.step)) || steps[0], true);
  });
  function syncSteps() {
    Object.entries(lists).forEach(([key, { steps, done }]) => {
      steps.forEach(s => {
        const isDone = done.has(s.dataset.step);
        s.classList.toggle('done', isDone);
        $('.done-btn', s).textContent = isDone ? 'Mark as not done' : 'Mark step done';
      });
      store.set('fg-steps-' + key, [...done]);
    });
    const { steps, done } = lists[getPath()];
    $('#barFill').style.width = (done.size / steps.length * 100) + '%';
    $('#progressCount').textContent = `${done.size} of ${steps.length} done`;
  }
  $('#resetSteps').addEventListener('click', () => {
    const cur = lists[getPath()];
    cur.done = new Set(); syncSteps();
    cur.steps.forEach((s, i) => toggleOpen(s, i === 0));
  });
  pathListeners.push(syncSteps);
  syncSteps();

  /* ---------- Commands ---------- */
  const CMDS = [
    // terminal
    ['terminal', 'mkdir my-project', 'Make a new folder. Use dashes, not spaces.', 'folder create new directory'],
    ['terminal', 'cd my-project', 'Move into a folder. Tab autocompletes the name.', 'change directory folder switch go'],
    ['terminal', 'cd ..', 'Go up one folder.', 'back parent up directory'],
    ['terminal', 'cd ~', 'Go to your home folder (the ~).', 'home root tilde'],
    ['terminal', 'ls', 'List what\'s in the current folder.', 'list files folder show'],
    ['terminal', 'pwd', 'Print where you are right now.', 'where path location folder'],
    ['terminal', 'open .', 'Open the current folder in Finder.', 'finder show folder'],
    ['terminal', 'claude', 'Start Claude Code in this folder.', 'start launch run'],
    ['terminal', 'claude --continue', 'Pick up your most recent conversation in this folder.', 'resume continue last session'],
    ['terminal', 'brew install <name>', 'Install a tool with Homebrew (Claude usually does this for you).', 'install app homebrew'],
    ['terminal', 'brew upgrade claude-code', 'Update Claude Code if you installed it with Homebrew.', 'update upgrade'],
    ['terminal', 'clear', 'Wipe the terminal screen (not the same as /clear).', 'clean screen'],
    // claude
    ['claude', '/', 'Type a slash to see every command Claude has.', 'help menu list commands'],
    ['claude', '/model', 'Switch models: Opus 5.5, Fable 5.1, Sonnet, Haiku.', 'model opus fable sonnet haiku switch'],
    ['claude', '/clear', 'Fresh session. Use it between tasks to save tokens.', 'reset new session tokens clear'],
    ['claude', '/compact', 'Summarize a long conversation so it costs less to continue.', 'tokens shrink summarize context'],
    ['claude', '/context', 'See how full this session is and what\'s using the space.', 'tokens usage context window'],
    ['claude', '/resume', 'Reopen an earlier conversation.', 'history past session resume'],
    ['claude', '/init', 'Write a CLAUDE.md with notes about this project.', 'setup memory project notes'],
    ['claude', '/code-review', 'Review your latest changes for bugs.', 'review bugs check skill'],
    ['claude', '/security-review', 'Check pending changes for security issues.', 'security audit vulnerabilities'],
    ['claude', '/plugin', 'Browse and install plugins and skill collections.', 'skills install marketplace plugin'],
    ['claude', '/help', 'Show help and usage.', 'help'],
    // keys
    ['keys', 'Tab', 'Accept Claude\'s suggested next prompt (shown in gray).', 'accept suggestion autocomplete'],
    ['keys', 'Esc', 'Stop Claude mid-task so you can redirect it.', 'stop interrupt cancel'],
    ['keys', 'Esc Esc', 'Rewind to an earlier message, like undo.', 'undo rewind back'],
    ['keys', 'Shift+Tab', 'Cycle permission modes, e.g. auto-accept edits or plan mode.', 'permissions plan mode accept edits'],
    ['keys', '@filename', 'Point Claude at a specific file.', 'file reference mention attach'],
    ['keys', '!command', 'Run a terminal command without leaving Claude.', 'bash shell run'],
    ['keys', '↑', 'Bring back your previous message or command.', 'history previous up arrow'],
    ['keys', 'Ctrl+C', 'Cancel what\'s running. Press it twice to exit Claude.', 'quit exit cancel stop'],
  ];
  const DESKTOP_CMDS = [
    // prompt box
    ['prompt', '/', 'Type a slash in the prompt box to browse every command and skill.', 'help menu list commands skills'],
    ['prompt', '@filename', 'Point Claude at a specific file. Autocompletes as you type.', 'file reference mention attach'],
    ['prompt', '/context', 'See how full this session is and what\'s using the space.', 'tokens usage context window'],
    ['prompt', '/compact', 'Summarize a long session so it costs less to continue.', 'tokens shrink summarize context'],
    ['prompt', '/init', 'Write a CLAUDE.md with notes about this project.', 'setup memory project notes'],
    ['prompt', '/code-review', 'Review your changes. Findings come back as a card with Apply fixes.', 'review bugs check skill'],
    ['prompt', '/security-review', 'Check pending changes for security issues.', 'security audit vulnerabilities'],
    ['prompt', '/setup-claude', 'Guided setup in a new conversation: your role, plugins and tools to connect.', 'setup onboarding connectors plugins role'],
    // shortcuts
    ['keys', '⌘N', 'New session. Start one per task to save tokens.', 'new session clear reset tokens parallel'],
    ['keys', '⌘W', 'Close the current session.', 'close session'],
    ['keys', 'Ctrl+Tab', 'Switch between open sessions.', 'switch session next'],
    ['keys', 'Esc', 'Stop Claude mid-task so you can redirect it.', 'stop interrupt cancel'],
    ['keys', 'Tab', 'Accept Claude\'s suggested next prompt (shown in gray).', 'accept suggestion autocomplete'],
    ['keys', '⌘⇧I', 'Open the model menu: Opus 5.5, Fable 5.1, Sonnet, Haiku.', 'model opus fable sonnet haiku switch'],
    ['keys', '⌘⇧M', 'Open the permission mode menu: Manual, Accept edits, Plan, Auto.', 'permissions plan mode accept edits auto'],
    ['keys', '⌘⇧D', 'Show or hide the diff: every change Claude made, line by line.', 'diff changes review undo'],
    ['keys', '⌘⇧B', 'Show or hide the Browser pane to preview your site or app.', 'preview browser site app'],
    ['keys', '⌘⇧S', 'Select an element in the Browser pane, then describe the change.', 'select element point click design'],
    ['keys', 'Ctrl+`', 'Open the built-in terminal, for the rare time you need one.', 'terminal shell command'],
    ['keys', '⌘;', 'Side chat: ask a quick question without derailing the session.', 'side question aside'],
    ['keys', '⌥+click', 'Option-click a session in the sidebar to open it side by side.', 'split view parallel side by side'],
    ['keys', '⌘/', 'Show every keyboard shortcut.', 'help shortcuts keys'],
    // app
    ['app', 'Code tab', 'Claude Code with a visual interface. Use it for building.', 'code build develop tab'],
    ['app', 'Work in a folder', 'In Chat\'s message bar. Lets Claude read and save files in a folder you pick.', 'folder files local cowork chat'],
    ['app', 'Customize → Connectors', 'Link Gmail, Drive, Calendar, Wispr Flow and more.', 'connectors integrations apps gmail drive mcp'],
    ['app', 'Customize → Skills', 'Turn skills on or off, or add your own.', 'skills plugins customize'],
    ['app', 'Open folder…', 'Under the prompt box in the Code tab: choose the project Claude works in.', 'project folder open choose'],
    ['app', 'Worktree', 'Toggle under the prompt box. Gives a session its own copy of the project.', 'parallel isolate copy branch'],
    ['app', '+12 −1', 'The change counter. Click it to open the diff and leave line comments.', 'diff changes review'],
    ['app', 'Usage ring', 'Next to the model picker. Click it to see your plan usage.', 'tokens usage limits plan'],
  ];
  const CHIPS = {
    terminal: [['all', 'All'], ['terminal', 'Terminal'], ['claude', 'Claude'], ['keys', 'Shortcuts']],
    desktop: [['all', 'All'], ['prompt', 'Prompt box'], ['keys', 'Shortcuts'], ['app', 'In the app']],
  };
  const kindLabel = { terminal: 'Terminal', claude: 'Claude', keys: 'Shortcut', prompt: 'Prompt box', app: 'In the app' };
  let filter = 'all', query = '';
  const cmdsEl = $('#cmds'), chipsEl = $('#chips');
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function hintFor(k) {
    if (k === 'keys') return getPath() === 'desktop' ? 'Press in the Code tab' : 'Press in Claude Code';
    if (k === 'app') return 'Where to find it';
    return 'Click to copy';
  }
  function renderChips() {
    chipsEl.innerHTML = CHIPS[getPath()].map(([f, l]) =>
      `<button class="chip" type="button" data-filter="${f}" aria-pressed="${f === filter}">${l}</button>`).join('');
  }
  function renderCmds() {
    const q = query.trim().toLowerCase();
    const src = getPath() === 'desktop' ? DESKTOP_CMDS : CMDS;
    const list = src.filter(([k, c, d, tags]) =>
      (filter === 'all' || k === filter) &&
      (!q || (c + ' ' + d + ' ' + tags).toLowerCase().includes(q)));
    cmdsEl.innerHTML = list.length ? list.map(([k, c, d]) => `
      <button class="cmd" type="button" data-copy="${esc(c)}">
        <span class="cmd-top"><code>${esc(c)}</code><span class="kind">${kindLabel[k]}</span></span>
        <p>${esc(d)}</p>
        <span class="hint">${hintFor(k)}</span>
      </button>`).join('') : `<p class="empty">Nothing matches "${esc(query)}". Try asking Claude: "how do I…"</p>`;
  }
  cmdsEl.addEventListener('click', async e => {
    const card = e.target.closest('.cmd'); if (!card) return;
    if (await copyText(card.dataset.copy)) {
      const hint = $('.hint', card); const prev = hint.textContent;
      card.classList.add('copied'); hint.textContent = 'Copied ✓';
      setTimeout(() => { card.classList.remove('copied'); hint.textContent = prev; }, 1300);
    }
  });
  $('#cmdSearch').addEventListener('input', e => { query = e.target.value; renderCmds(); });
  chipsEl.addEventListener('click', e => {
    const ch = e.target.closest('.chip'); if (!ch) return;
    filter = ch.dataset.filter;
    $$('.chip', chipsEl).forEach(c => c.setAttribute('aria-pressed', c === ch));
    renderCmds();
  });
  pathListeners.push(() => { filter = 'all'; renderChips(); renderCmds(); });
  renderChips();
  renderCmds();

  /* ---------- Workflow tabs ---------- */
  const tabs = $$('.tab');
  function selectTab(t, focus) {
    tabs.forEach(x => {
      const on = x === t;
      x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1;
      $('#' + x.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) t.focus();
    store.set('fg-tab', t.id);
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') selectTab(tabs[(i + 1) % tabs.length], true);
      if (e.key === 'ArrowLeft') selectTab(tabs[(i - 1 + tabs.length) % tabs.length], true);
    });
  });
  const savedTab = $('#' + store.get('fg-tab', 't-pages'));
  if (savedTab) selectTab(savedTab);

  /* ---------- Skill builder ---------- */
  const sName = $('#sName'), sDesc = $('#sDesc'), sSteps = $('#sSteps');
  let skillText = '';
  function slug(v) { return (v || 'my-skill').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'my-skill'; }
  function renderSkill() {
    const name = slug(sName.value);
    const desc = sDesc.value.trim().replace(/\s+/g, ' ') || 'Describe when Claude should use this skill.';
    const lines = sSteps.value.split('\n').map(l => l.trim()).filter(Boolean);
    const title = name.split('-').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ');
    skillText = `---\nname: ${name}\ndescription: ${desc}\n---\n\n# ${title}\n\n${lines.map((l, i) => `${i + 1}. ${l}`).join('\n') || '1. Your first step'}\n`;
    $('#sOut').innerHTML = esc(skillText)
      .replace(/^(---)$/gm, '<span class="y">$1</span>')
      .replace(/^(name:|description:)/gm, '<span class="g">$1</span>')
      .replace(/^(# .*)$/gm, '<span class="y">$1</span>');
    $('#sPath').textContent = `~/.claude/skills/${name}/SKILL.md`;
    $('#sMkdir').textContent = `mkdir -p ~/.claude/skills/${name}`;
  }
  [sName, sDesc, sSteps].forEach(el => el.addEventListener('input', renderSkill));
  $('#skillForm').addEventListener('submit', e => e.preventDefault());
  $('#copySkill').addEventListener('click', async e => { if (await copyText(skillText)) flash(e.currentTarget); });
  $('#copySkillPrompt').addEventListener('click', async e => {
    const name = slug(sName.value);
    const prompt = `Save the following as a personal skill at ~/.claude/skills/${name}/SKILL.md (create the folder if needed), then confirm it shows up when I type /${name}.\n\n${skillText}`;
    if (await copyText(prompt)) flash(e.currentTarget);
  });
  renderSkill();

  /* ---------- Token explainer ---------- */
  const rT = $('#rTasks'), rM = $('#rMsgs');
  const PER = 2000;
  const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : Math.round(n / 1e3) + 'k';
  const tri = n => n * (n + 1) / 2;
  function renderTokens() {
    const T = +rT.value, M = +rM.value;
    $('#oTasks').textContent = T; $('#oMsgs').textContent = M;
    // long session: task k covers messages (k-1)M+1 .. kM
    const longParts = Array.from({ length: T }, (_, k) => PER * (tri((k + 1) * M) - tri(k * M)));
    const shortParts = Array.from({ length: T }, () => PER * tri(M));
    const L = longParts.reduce((a, b) => a + b, 0), S = shortParts.reduce((a, b) => a + b, 0);
    const bar = (el, parts) => {
      el.innerHTML = parts.map(p => `<i style="flex:0 0 calc(${(p / L * 100).toFixed(3)}% - 2px)"></i>`).join('');
    };
    bar($('#stLong'), longParts); bar($('#stShort'), shortParts);
    $('#vLong').textContent = fmt(L) + ' tokens';
    $('#vShort').textContent = fmt(S) + ' tokens';
    const x = L / S;
    $('#verdict').innerHTML = T === 1
      ? 'One task, one session. <em>Already optimal.</em>'
      : `Clearing between tasks uses about <em>${x.toFixed(1)}× less</em>.`;
  }
  [rT, rM].forEach(el => el.addEventListener('input', renderTokens));
  renderTokens();

  /* ---------- Videos ---------- */
  const VIDEOS = [
    { id: '6eBSHbLKuN0', title: 'Mastering Claude Code in 30 minutes', who: 'Boris Cherny, creator of Claude Code · Anthropic', note: 'The workshop Anthropic uses to onboard new hires. Start here.' },
    { id: 'gv0WHhKelSE', title: 'Claude Code best practices', who: 'Code w/ Claude · Anthropic', note: 'Prompting habits, CLAUDE.md and getting reliable results.' },
    { id: 'fOxC44g8vig', title: 'Claude Agent Skills explained', who: 'Anthropic', note: 'What skills are and when to write your own.' },
    { id: 'UAmKyyZ-b9E', title: 'Introducing Cowork', who: 'Anthropic', note: 'Claude working on your files and apps from the desktop app. Good for the desktop path.' },
    { id: 'wo_CbgoyFLY', title: 'From Boris\'s notebook to the whole company', who: 'Cat Wu, Claude Code product lead · O\'Reilly', note: 'How Claude Code spread from one engineer to all of Anthropic.' },
    { url: 'https://every.to/podcast/how-to-use-claude-code-like-the-people-who-built-it', title: 'How to use Claude Code like the people who built it', who: 'Boris Cherny & Cat Wu · Every, AI & I podcast', note: 'Subagents, favorite slash commands and daily workflows.' },
  ];
  const playIcon = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5z"/></svg>';
  $('#videoGrid').innerHTML = VIDEOS.map((v, i) => `
    <article class="video reveal">
      ${v.id
        ? `<button class="thumb" type="button" data-yt="${v.id}" aria-label="Play: ${esc(v.title)}">
             <img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="" loading="lazy" width="480" height="360">
             <span class="play">${playIcon}Play</span>
           </button>`
        : `<a class="thumb text" href="${v.url}" target="_blank" rel="noopener"><span>Listen on Every →</span></a>`}
      <h3>${esc(v.title)}</h3>
      <p class="who">${esc(v.who)}</p>
      <p>${esc(v.note)}</p>
    </article>`).join('');
  $('#videoGrid').addEventListener('click', e => {
    const t = e.target.closest('[data-yt]'); if (!t) return;
    t.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${t.dataset.yt}?autoplay=1&rel=0" title="${esc(t.getAttribute('aria-label'))}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    t.removeAttribute('data-yt'); t.style.cursor = 'default';
  });

  /* ---------- Reveal + counters ---------- */
  const count = el => {
    const end = +el.dataset.count; if (reduced || !end) { el.textContent = String(end).padStart(2, '0'); return; }
    const t0 = performance.now(), dur = 1100;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = String(Math.round(end * e)).padStart(2, '0');
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      const n = en.target.querySelector('[data-count]'); if (n) count(n);
      io.unobserve(en.target);
    });
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' }) : null;
  $$('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('in'));

  /* ---------- Apply the initial path (set in <head>) ---------- */
  // Only rewrite the URL if a path was asked for in it; otherwise leave the address bar clean.
  const hadParam = new URLSearchParams(location.search).has('path');
  const init = getPath();
  if (hadParam) setPath(init);
  else {
    $$('[data-set-path]').forEach(b => b.hasAttribute('aria-pressed') && b.setAttribute('aria-pressed', b.dataset.setPath === init));
    $$('[data-surface]').forEach(s => s.classList.toggle('feature', s.dataset.surface === init));
    pathListeners.forEach(fn => fn(init));
  }
})();
