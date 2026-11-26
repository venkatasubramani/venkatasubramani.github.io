// Prefer a matching device voice. Both fallback voices synthesize locally from the same script.
const narratorVoice = (() => {
  let generation = 0;
  let currentUtterance = null;
  let currentSource = null;
  let startTimer = 0;
  let endTimer = 0;
  let fallbackEngine;
  const cancel = () => {
    generation++;
    clearTimeout(startTimer);
    clearTimeout(endTimer);
    if (currentUtterance) {
      currentUtterance.onend = currentUtterance.onerror = currentUtterance.onstart = null;
      window.speechSynthesis?.cancel();
      currentUtterance = null;
    }
    if (currentSource) {
      currentSource.onended = null;
      try { currentSource.stop(); } catch { /* Already finished. */ }
      currentSource.disconnect();
      currentSource = null;
    }
  };

  function deviceVoice(locale) {
    const voices = window.speechSynthesis?.getVoices() || [];
    const language = locale.toLowerCase();
    const matches = voices.filter(voice => {
      const tag = voice.lang.replaceAll('_', '-').toLowerCase();
      return language === 'en-us' ? /^en-us(?:-|$)/.test(tag) : /^ta(?:-|$)/.test(tag);
    });
    function preference(v) {
      return (v.lang.replaceAll('_','-').toLowerCase() === language ? 4 : 0) +
        (/natural|neural|premium|enhanced/i.test(v.name) ? 2 : 0) + (v.default ? 1 : 0);
    }
    return matches.sort((a, b) => preference(b) - preference(a))[0];
  }

  async function builtIn(locale, text, rate, pitch, context, token, callbacks) {
    if (!context) throw new Error('Audio output unavailable');
    if (!fallbackEngine) {
      fallbackEngine = import('./speech/dist/browser.js').then(({ createEspeak }) =>
        createEspeak({dataUrl: new URL('./speech/espeak-ng-data/', document.baseURI).href, languages: ['en', 'ta']})
      ).catch(error => { fallbackEngine = null; throw error; });
    }
    const synth = await fallbackEngine;
    if (token !== generation) return;
    const { samples, sampleRate } = synth.synthesize(text, {
      voice: locale === 'en-US' ? 'en-us' : 'ta', rate: Math.round((locale === 'en-US' ? 166 : 148) * rate),
      pitch: Math.round(50 * pitch), range: 53, endPause: true
    });
    if (!samples.length) throw new Error('Empty speech output');
    if (context.state === 'suspended') await context.resume();
    if (token !== generation) return;
    const audio = context.createBuffer(1, samples.length, sampleRate);
    const channel = audio.getChannelData(0);
    for (let i = 0; i < samples.length; i++) channel[i] = samples[i] / 32768;
    const source = context.createBufferSource();
    source.buffer = audio;
    source.connect(context.destination);
    currentSource = source;
    source.onended = () => {
      source.disconnect();
      if (token !== generation) return;
      currentSource = null;
      callbacks.done();
    };
    source.start();
    callbacks.start();
  }

  function speak({ text, locale, rate, pitch, context, start, done, error }) {
    cancel();
    const token = generation;
    let usingFallback = false;
    const fallback = () => {
      if (token !== generation || usingFallback) return;
      usingFallback = true;
      clearTimeout(startTimer);
      clearTimeout(endTimer);
      if (currentUtterance) {
        currentUtterance.onstart = currentUtterance.onend = currentUtterance.onerror = null;
        window.speechSynthesis?.cancel();
        currentUtterance = null;
      }
      builtIn(locale, text, rate, pitch, context, token, {start, done}).catch(() => {
        if (token === generation) error();
      });
    };
    const voice = deviceVoice(locale);
    if (!voice || !window.SpeechSynthesisUtterance) return fallback();
    const utter = new SpeechSynthesisUtterance(text);
    currentUtterance = utter;
    utter.voice = voice;
    utter.lang = locale;
    utter.rate = rate;
    utter.pitch = pitch;
    utter.onstart = () => {
      if (token !== generation || usingFallback) return;
      clearTimeout(startTimer);
      start();
      // Some engines never fire an end event. Leave enough time for Tamil and slower voices.
      endTimer = setTimeout(fallback, Math.max(25000, text.length * 180 / rate));
    };
    utter.onend = () => {
      if (token !== generation || usingFallback) return;
      clearTimeout(startTimer);
      clearTimeout(endTimer);
      currentUtterance = null;
      done();
    };
    utter.onerror = fallback;
    startTimer = setTimeout(fallback, 2500);
    try { window.speechSynthesis.resume(); window.speechSynthesis.speak(utter); }
    catch { fallback(); }
  }
  // Some browsers only enumerate system voices after the first request.
  window.speechSynthesis?.getVoices();
  return { speak, cancel };
})();
