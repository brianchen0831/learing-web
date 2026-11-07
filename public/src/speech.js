// Pronunciation through the browser's built-in speech engine (no key or server).
// Google voices are preferred; Chrome provides them, other browsers use their own.
export const canSpeak = 'speechSynthesis' in window;

function englishVoice() {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  const google = voices.filter((v) => /google/i.test(v.name));
  return (
    google.find((v) => v.lang === 'en-US') ||
    google[0] ||
    voices.find((v) => v.lang === 'en-US') ||
    voices[0] ||
    null
  );
}

export function speak(text) {
  if (!canSpeak) return;
  window.speechSynthesis.cancel(); // stop any word still being read
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  const voice = englishVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}
