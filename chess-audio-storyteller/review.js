const moveReview = (() => {
  const nags = { 1: '!', 2: '?', 3: '!!', 4: '??', 5: '!?', 6: '?!' };
  const marks = {
    '!!': { symbol: '!!', en: 'Strong move', ta: 'சிறந்த நகர்வு', mood: 'happy' },
    '!':  { symbol: '!!', en: 'Good move', ta: 'நல்ல நகர்வு', mood: 'happy' },
    '!?': { symbol: '!?', en: 'Interesting move', ta: 'சுவாரசியமான நகர்வு', mood: 'calm' },
    '?!': { symbol: '?!', en: 'Inaccuracy', ta: 'சிறு தவறு', mood: 'surprised' },
    '?':  { symbol: '?', en: 'Mistake', ta: 'தவறு', mood: 'surprised' },
    '??': { symbol: '??', en: 'Blunder', ta: 'பெரும் தவறு', mood: 'surprised' }
  };
  function read(pgn) {
    const headers = Object.create(null), moves = [], notes = [];
    const body = pgn.replace(/\[(\w+)\s+"((?:\\.|[^"\\])*)"\s*\]/g, (_, key, val) => {
      headers[key] = val.replace(/\\(["\\])/g, '$1');
      return ' ';
    });
    let depth = 0;
    for (let token of body.match(/\{[^}]*\}|;[^\r\n]*|\(|\)|\$\d+|[^\s(){};$]+/g) || []) {
      if (token === '(') { depth++; continue; }
      if (token === ')') { depth = Math.max(0, depth - 1); continue; }
      if (depth) continue;
      const last = notes[notes.length - 1];
      if (token.startsWith('{') || token.startsWith(';')) {
        const score = token.match(/\[%eval\s+(#[-+]?\d+|[-+]?\d+(?:\.\d+)?)(?:,\d+)?\s*\]/);
        if (last && score) {
          if (score[1][0] === '#') {
            const mate = Number(score[1].slice(1));
            if (mate !== 0) last.cp = Math.sign(mate) * (10000 - Math.min(99, Math.abs(mate)));
          } else last.cp = Math.round(Number(score[1]) * 100);
        }
        continue;
      }
      if (token.startsWith('$') || marks[token]) {
        const glyph = nags[token.slice(1)] || (marks[token] && token);
        if (last && glyph) last.glyph = glyph;
        continue;
      }
      token = token.replace(/^\d+\.{1,3}/, '').replace(/^\.{1,3}/, '');
      if (!token) continue;
      if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) { if (!headers.Result) headers.Result = token; continue; }
      const glyph = token.match(/([!?]{1,2})$/)?.[1];
      moves.push(token.replace(/[!?]+$/, ''));
      notes.push(marks[glyph] ? {glyph} : {});
    }
    return { headers, moves, notes };
  }
  const chances = cp => 100 / (1 + Math.exp(-0.00368208 * cp));
  function lostMark(loss) {
    if (loss >= 22) return '??';
    if (loss >= 12) return '?';
    if (loss >= 6) return '?!';
    return '';
  }
  function grade(glyph, source) { return marks[glyph] ? {...marks[glyph], source} : null; }
  function fromNotes(note, previous, side, mate) {
    if (note.glyph) return grade(note.glyph, note.source || 'PGN annotation');
    if (mate) return {...marks['!!'], en:'Checkmate', ta:'செக்மேட்', source:'Final position'};
    if (Number.isFinite(note.cp) && Number.isFinite(previous)) {
      const loss = (chances(previous) - chances(note.cp)) * (side === 'White' ? 1 : -1);
      const mark = grade(lostMark(loss), 'PGN engine evaluations');
      return mark ? {...mark, loss: Math.round(loss)} : null;
    }
    return null;
  }

  // Only analyze a position the visitor actually views. One worker serves all games.
  let boot, worker, pending, onBest, active = false, failed = false;
  const results = new Map();
  async function engine() {
    if (!boot) boot = (async () => {
      const response = await fetch('./analysis/stockfish-11.js.gz');
      if (!response.ok) throw new Error('Analysis download failed');
      const bytes = new Uint8Array(await response.arrayBuffer());
      let script = new Blob([bytes], {type:'text/javascript'});
      if (bytes[0] === 31 && bytes[1] === 139) {
        const raw = await new Response(script.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
        script = new Blob([raw], {type:'text/javascript'});
      }
      const url = URL.createObjectURL(script);
      try {
        worker = new Worker(url);
        await new Promise((resolve, reject) => {
          const deadline = setTimeout(() => reject(new Error('Analysis did not start')), 14000);
          worker.onerror = () => { clearTimeout(deadline); reject(new Error('Analysis worker failed')); };
          worker.onmessage = e => {
            if (e.data === 'uciok') { clearTimeout(deadline); resolve(); }
          };
          worker.postMessage('uci');
        });
      } finally { URL.revokeObjectURL(url); }
      worker.postMessage('setoption name Hash value 16');
      worker.onmessage = event => { if (onBest) onBest(String(event.data)); };
      return worker;
    })();
    return boot;
  }
  function search(uci, variations) {
    return new Promise((resolve, reject) => {
      const lines = new Map();
      let depth = 0;
      const timeout = setTimeout(() => { onBest = null; reject(new Error('Analysis timed out')); }, 12000);
      onBest = line => {
        if (line.startsWith('bestmove')) {
          clearTimeout(timeout); onBest = null; resolve(lines); return;
        }
        const info = line.match(/\bdepth (\d+).*?\bmultipv (\d+) score (cp|mate) (-?\d+).*?\bpv ([a-h][1-8][a-h][1-8][qrbn]?)(?: ([a-h][1-8][a-h][1-8][qrbn]?))?/);
        if (!info || /lowerbound|upperbound/.test(line)) return;
        if (+info[1] > depth) { lines.clear(); depth = +info[1]; }
        if (+info[1] !== depth) return;
        const score = +info[4];
        lines.set(+info[2], { move:info[5], reply:info[6], score:info[3] === 'cp' ? score : Math.sign(score) * (10000 - Math.abs(score)) });
      };
      worker.postMessage('setoption name MultiPV value ' + variations);
      worker.postMessage('position startpos' + (uci ? ' moves ' + uci : ''));
      worker.postMessage('go depth 11');
    });
  }
  async function pump() {
    if (active || !pending || failed) return;
    active = true;
    try {
      await engine();
      while (pending) {
        const task = pending;
        pending = null;
        const prior = await search(task.before, 2);
        const best = prior.get(1), next = prior.get(2);
        let mark = null;
        if (best && next) {
          if (task.move === best.move) {
            if (chances(best.score) - chances(next.score) >= 8) mark = grade('!!', 'Stockfish 11 · depth 11');
          } else if (!task.hasBroadcastScores) {
            const response = task.move === next.move ? null : (await search(task.key, 1)).get(1);
            const played = response ? -response.score : (task.move === next.move ? next.score : NaN);
            const loss = chances(best.score) - chances(played);
            mark = grade(lostMark(loss), 'Stockfish 11 · depth 11');
            if (mark) Object.assign(mark, {loss:Math.round(loss), reply:response?.move || next.reply});
          }
        }
        results.set(task.key, mark);
        if (results.size > 800) results.delete(results.keys().next().value);
        task.callback(mark);
      }
    } catch {
      failed = true;
      worker?.terminate();
    } finally { active = false; }
  }
  function review(game, ply, callback) {
    const frame = game.frames[ply];
    if (!ply || frame.grade || frame.reviewed || typeof Worker === 'undefined' || typeof DecompressionStream === 'undefined') return;
    const before = game.frames.slice(1, ply).map(item => item.uci).join(' ');
    const key = (before + ' ' + frame.uci).trim();
    const finish = mark => { frame.reviewed = true; if (mark) frame.grade = mark; callback(); };
    if (results.has(key)) { finish(results.get(key)); return; }
    pending = {key, before, move:frame.uci, hasBroadcastScores:frame.hasBroadcastScores, callback:finish};
    pump();
  }
  return {read, fromNotes, grade, review};
})();
