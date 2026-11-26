// Chess notation stays on the board. The narrator describes the position in the chosen language.
const commentary = (() => {
  const englishPieces = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
  const tamilPieces = { p: 'சிப்பாய்', n: 'குதிரை', b: 'யானை', r: 'கோட்டை', q: 'ராணி', k: 'ராஜா' };
  const tamilObjects = { p: 'சிப்பாயை', n: 'குதிரையை', b: 'யானையை', r: 'கோட்டையை', q: 'ராணியை', k: 'ராஜாவை' };
  const taNumbers = ['ஒன்று','இரண்டு','மூன்று','நான்கு','ஐந்து','ஆறு','ஏழு','எட்டு'];
  const taFiles = ['ஏ','பி','சி','டி','இ','எஃப்','ஜி','எச்'];
  const enFiles = ['ay','bee','see','dee','ee','eff','gee','aitch'];
  const enNumbers = ['one','two','three','four','five','six','seven','eight'];

  function player(name, tamil, side) {
    if (/gukesh/i.test(name)) return tamil ? 'குகேஷ்' : 'Gukesh';
    if (/sindarov/i.test(name)) return tamil ? 'சிந்தாரோவ்' : 'Sindarov';
    if (/morphy/i.test(name)) return tamil ? 'மார்ஃபி' : 'Morphy';
    if (/isouard/i.test(name)) return tamil ? 'கருப்பு அணியின் வீரர்' : 'Black';
    if (name && !/^(White|Black|\?)$/i.test(name)) return name;
    return tamil ? (side === 'White' ? 'வெள்ளைக் காய்களுடன் ஆடுபவர்' : 'கருப்புக் காய்களுடன் ஆடுபவர்') : side;
  }

  function saySquares(line, locale) {
    const tamil = locale === 'ta-IN';
    return line.replace(/\b([a-h])([1-8])\b/gi, (_, file, rank) =>
      (tamil ? taFiles : enFiles)[file.toLowerCase().charCodeAt(0) - 97] + ' ' +
      (tamil ? taNumbers : enNumbers)[Number(rank) - 1]);
  }

  function line(f, headers, style, locale) {
    const ta = locale === 'ta-IN';
    if (f.curated && style === 'storyteller') return f.curated[ta ? 1 : 0];
    const white = player(headers.White, ta, 'White');
    const black = player(headers.Black, ta, 'Black');
    const actor = f.side === 'White' ? white : black;
    if (!f.ply) {
      if (style === 'coach') return ta ? `வெள்ளைக் காய்களுடன் ${white}, கருப்புக் காய்களுடன் ${black}. மையத்தைக் கட்டுப்படுத்த முதலில் எந்தக் காய்களை வெளியே கொண்டுவருகிறார்கள் என்று பாருங்கள்.` : `${white} has White and ${black} has Black. Watch which pieces they bring out first to control the center.`;
      if (style === 'shorts') return ta ? `${white}, ${black} இருவரும் களத்தில். முதல் நகர்வு வெள்ளைக்கு!` : `${white} and ${black} are ready. White moves first.`;
      return ta ? `${white}, ${black} இருவரும் ஆடும் ஆட்டம் இது. வெள்ளையின் முதல் நகர்விலிருந்து தொடங்குவோம்.` : `${white} meets ${black}. Let’s follow the game from White’s first move.`;
    }
    const to = f.square, from = f.origin;
    const enPiece = englishPieces[f.piece], taPiece = tamilPieces[f.piece];
    const obj = tamilObjects[f.piece], cap = englishPieces[f.captured], taCap = tamilObjects[f.captured];
    const enMove = `${actor} moves the ${enPiece} to ${to}.`;
    const taMove = `${actor} ${obj} ${to} கட்டத்துக்கு நகர்த்துகிறார்.`;
    let english, tamil;
    if (f.isCastle) {
      const queenSide = f.san.startsWith('O-O-O') || f.san.startsWith('0-0-0');
      english = `${actor} castles ${queenSide ? 'queenside' : 'kingside'}.`;
      tamil = `${actor} ${queenSide ? 'ராணியின்' : 'ராஜாவின்'} பக்கம் காஸ்லிங் செய்கிறார்.`;
      if (style !== 'shorts') {
        english += ` The rook comes to ${queenSide ? 'd' : 'f'}${f.side === 'White' ? '1' : '8'} in the same move.`;
        tamil += ' அதே நகர்வில் கோட்டையும் ராஜாவுக்கு அடுத்த கட்டத்துக்கு வருகிறது.';
      }
    } else if (f.promotion) {
      english = `${actor} ${cap ? 'captures the ' + cap + ' on' : 'reaches'} ${to} and promotes the pawn to a ${englishPieces[f.promotion]}.`;
      tamil = cap ? `${actor} ${to} கட்டத்தில் ${taCap} வெட்டி, சிப்பாயை ${tamilPieces[f.promotion]} ஆக மாற்றுகிறார்.` : `${actor} சிப்பாயை ${to} கட்டத்துக்குக் கொண்டு சென்று ${tamilPieces[f.promotion]} ஆக மாற்றுகிறார்.`;
    } else if (cap) {
      english = f.recapture ? `${actor} takes back on ${to} with the ${enPiece}.` : `${actor} takes the ${cap} on ${to} with the ${enPiece}.`;
      tamil = f.recapture ? `${actor} ${to} கட்டத்தில் ${taPiece} மூலம் பதிலுக்கு வெட்டுகிறார்.` : `${actor} ${to} கட்டத்தில் எதிரியின் ${taCap} ${taPiece} மூலம் வெட்டுகிறார்.`;
      if (f.enPassant) {
        english = `${actor} captures en passant on ${to}. The pawn that just advanced two squares comes off the board.`;
        tamil = `${actor} ${to} கட்டத்தில் வழிமறித்து வெட்டுகிறார். இப்போதுதான் இரண்டு கட்டங்கள் முன்னேறிய எதிரியின் சிப்பாய் பலகையிலிருந்து அகல்கிறது.`;
      }
    } else if (f.develops) {
      english = `${actor} brings the ${enPiece} out to ${to}.`;
      tamil = `${actor} ${obj} அதன் தொடக்கக் கட்டத்திலிருந்து ${to} கட்டத்துக்குக் கொண்டு வருகிறார்.`;
    } else if (f.piece === 'p') {
      english = `${actor} pushes the pawn to ${to}.`;
      tamil = `${actor} சிப்பாயை ${to} கட்டத்துக்கு முன்னேற்றுகிறார்.`;
    } else {
      english = [enMove, `The ${enPiece} leaves ${from} for ${to}.`, `${actor} plays the ${enPiece} to ${to}.`][f.ply % 3];
      tamil = [taMove, `${taPiece} ${from} கட்டத்திலிருந்து ${to} கட்டத்துக்கு வருகிறது.`, `${actor} ${obj} ${to} கட்டத்தில் நிறுத்துகிறார்.`][f.ply % 3];
    }
    let detailEn = '', detailTa = '';
    if (f.isMate) {
      detailEn = 'Checkmate. The king has no legal escape.';
      detailTa = 'செக்மேட்! ராஜாவைக் காப்பாற்ற இனி வழியில்லை.';
    } else if (f.isCheck) {
      detailEn = f.replyCount === 1 && style !== 'shorts' ? 'Check. There’s only one legal reply.' : 'Check. The reply must get the king out of danger.';
      detailTa = f.replyCount === 1 && style !== 'shorts' ? 'செக்! இதற்கு ஒரே ஒரு பதில் நகர்வுதான் இருக்கிறது.' : 'செக்! முதலில் ராஜாவைக் காப்பாற்ற வேண்டும்.';
    } else if (f.result === '1/2-1/2') {
      detailEn = f.repeated ? 'The position has appeared three times. The game ends in a draw.' : 'The game ends in a draw. Each player gets half a point.';
      detailTa = f.repeated ? 'ஒரே நிலை மூன்று முறை வந்துவிட்டது. ஆட்டம் சமனில் முடிகிறது.' : 'ஆட்டம் சமனில் முடிகிறது. இருவருக்கும் தலா அரைப் புள்ளி.';
    } else if (f.result === '1-0' || f.result === '0-1') {
      const winner = f.result === '1-0' ? white : black;
      detailEn = `The final score gives ${winner} the win.`;
      detailTa = `இந்த ஆட்டத்தில் வெற்றி பெறுபவர் ${winner}.`;
    } else if (f.wasInCheck && style !== 'shorts') {
      detailEn = f.piece === 'k' ? 'The king is out of check.' : 'That takes care of the check.';
      detailTa = 'இப்போது ராஜாவுக்கு செக் இல்லை.';
    } else if (f.threat && style !== 'shorts') {
      detailEn = `From there, the ${enPiece} attacks the ${englishPieces[f.threat.piece]} on ${f.threat.square}.`;
      detailTa = `அங்கிருந்து ${f.threat.square} கட்டத்தில் இருக்கும் எதிரியின் ${tamilObjects[f.threat.piece]} அந்தக் காய் தாக்குகிறது.`;
    } else if (f.repeated && style !== 'shorts') {
      detailEn = 'We’ve reached this position for at least the third time.';
      detailTa = 'இதே நிலை குறைந்தது மூன்றாவது முறையாக வந்திருக்கிறது.';
    } else if (style === 'coach' && f.controlledCenter?.length) {
      const center = f.controlledCenter.join(ta ? ', ' : ' and ');
      detailEn = `From ${to}, it controls ${center}.`;
      detailTa = `அங்கிருந்து ${center} ${f.controlledCenter.length === 1 ? 'கட்டத்தை' : 'கட்டங்களைக்'} கட்டுப்படுத்துகிறது.`;
    }
    if (style === 'shorts' && !f.isMate && !f.promotion && !f.isCastle && !f.enPassant) {
      english = cap ? `${actor} ${f.recapture ? 'takes back' : 'captures the ' + cap} on ${to}.` : `${actor} plays the ${enPiece} to ${to}.`;
      tamil = cap ? `${actor} ${to} கட்டத்தில் ${f.recapture ? 'பதிலுக்கு வெட்டுகிறார்' : taCap + ' வெட்டுகிறார்'}.` : `${actor} ${obj} ${to} கட்டத்துக்கு நகர்த்துகிறார்.`;
    }
    if (f.grade?.symbol === '??' && !f.isMate) {
      const reply = f.grade.reply;
      if (reply) {
        const source = reply.slice(0,2), target = reply.slice(2,4);
        const index = (8 - Number(source[1])) * 8 + source.charCodeAt(0) - 97;
        const piece = f.board[index]?.[1];
        if (piece) {
          detailEn = `That’s a blunder. The reply to look for is the ${englishPieces[piece]} from ${source} to ${target}.`;
          detailTa = `இது ஒரு பெரிய தவறு. எதிராளி ${source} கட்டத்திலுள்ள ${tamilObjects[piece]} ${target} கட்டத்துக்கு நகர்த்த முடியும்.`;
        }
      } else if (Number.isFinite(f.grade.loss)) {
        detailEn = 'That’s a blunder. The position swings sharply in the opponent’s favor.';
        detailTa = 'இது ஒரு பெரிய தவறு. இந்த நகர்வால் எதிராளியின் வெற்றி வாய்ப்பு கணிசமாக உயர்கிறது.';
      } else {
        detailEn = 'The game notes flag this move as a blunder.';
        detailTa = 'ஆட்டக் குறிப்பில் இது ஒரு பெரிய தவறாகக் குறிக்கப்பட்டுள்ளது.';
      }
    }
    return [ta ? tamil : english, ta ? detailTa : detailEn].filter(Boolean).join(' ');
  }
  return { line, saySquares };
})();
