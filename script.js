// =====================
//  Readability Checker
//  Supports single-score pages via window.ACTIVE_SCORE
// =====================

// --- Plain descriptive labels — no judgment, just facts ---

function freLabel(score) {
  if (score >= 90) return 'Very easy to read';
  if (score >= 80) return 'Easy to read';
  if (score >= 70) return 'Fairly easy to read';
  if (score >= 60) return 'Standard';
  if (score >= 50) return 'Fairly difficult to read';
  if (score >= 30) return 'Difficult to read';
  return 'Very difficult to read';
}

function gradeLabel(grade) {
  grade = Math.round(grade);
  if (grade <= 2)  return '1st–2nd grade level';
  if (grade <= 4)  return '3rd–4th grade level';
  if (grade <= 6)  return '5th–6th grade level';
  if (grade <= 8)  return '7th–8th grade level';
  if (grade <= 10) return '9th–10th grade level';
  if (grade <= 12) return '11th–12th grade level';
  if (grade <= 14) return 'College level';
  return 'Graduate level';
}

// --- Syllable counting ---
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function countComplexWords(words) {
  return words.filter(w => countSyllables(w) >= 3).length;
}

function getSentences(text) {
  return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
}

function getWords(text) {
  return text.match(/\b[a-zA-Z']+\b/g) || [];
}

// --- Readability formulas ---
function fleschReadingEase(words, sentences, syllables) {
  if (!sentences.length || !words.length) return null;
  return 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length);
}

function fleschKincaidGrade(words, sentences, syllables) {
  if (!sentences.length || !words.length) return null;
  return 0.39 * (words.length / sentences.length) + 11.8 * (syllables / words.length) - 15.59;
}

function gunningFog(words, sentences, complexWords) {
  if (!sentences.length || !words.length) return null;
  return 0.4 * ((words.length / sentences.length) + 100 * (complexWords / words.length));
}

function smogIndex(sentences, complexWords) {
  if (sentences.length < 30) return null;
  return 1.0430 * Math.sqrt(complexWords * (30 / sentences.length)) + 3.1291;
}

function colemanLiau(words, sentences, chars) {
  if (!words.length) return null;
  const L = (chars / words.length) * 100;
  const S = (sentences.length / words.length) * 100;
  return 0.0588 * L - 0.296 * S - 15.8;
}

function automatedReadability(words, sentences, chars) {
  if (!sentences.length || !words.length) return null;
  return 4.71 * (chars / words.length) + 0.5 * (words.length / sentences.length) - 21.43;
}

// --- Update a single score card ---
function setCard(id, value, label) {
  const valEl = document.getElementById('val-' + id);
  const labelEl = document.getElementById('label-' + id);
  if (valEl)   valEl.textContent   = value !== null ? value : '—';
  if (labelEl) labelEl.textContent = label || '';
}

// --- Main analyze ---
function analyze() {
  const text = document.getElementById('text-input').value.trim();
  if (!text) { alert('Please enter some text first.'); return; }

  const sentences    = getSentences(text);
  const words        = getWords(text);
  const chars        = text.replace(/\s/g, '').length;
  let totalSyllables = 0;
  words.forEach(w => { totalSyllables += countSyllables(w); });
  const complexWords  = countComplexWords(words);
  const readingTime   = Math.ceil(words.length / 200);
  const avgSentLen    = words.length / Math.max(sentences.length, 1);
  const longSentences = sentences.filter(s => getWords(s).length > 25).length;
  const complexPct    = (complexWords / Math.max(words.length, 1)) * 100;

  // Scores
  const fre  = fleschReadingEase(words, sentences, totalSyllables);
  const fkg  = fleschKincaidGrade(words, sentences, totalSyllables);
  const gfi  = gunningFog(words, sentences, complexWords);
  const smog = smogIndex(sentences, complexWords);
  const cli  = colemanLiau(words, sentences, chars);
  const ari  = automatedReadability(words, sentences, chars);

  // Stat cards
  document.getElementById('stat-words').textContent     = words.length.toLocaleString();
  document.getElementById('stat-sentences').textContent = sentences.length;
  document.getElementById('stat-avg').textContent       = avgSentLen.toFixed(1);
  document.getElementById('stat-time').textContent      = readingTime + ' min';

  // Score cards — neutral labels only
  setCard('fre',  fre  !== null ? Math.max(0, fre).toFixed(1)  : null, fre  !== null ? freLabel(fre)        : '');
  setCard('fkg',  fkg  !== null ? Math.max(0, fkg).toFixed(1)  : null, fkg  !== null ? gradeLabel(fkg)      : '');
  setCard('gfi',  gfi  !== null ? Math.max(0, gfi).toFixed(1)  : null, gfi  !== null ? gradeLabel(gfi)      : '');
  setCard('smog', smog !== null ? smog.toFixed(1)               : null, smog !== null ? gradeLabel(smog)     : 'Need 30+ sentences');
  setCard('cli',  cli  !== null ? Math.max(0, cli).toFixed(1)  : null, cli  !== null ? gradeLabel(cli)      : '');
  setCard('ari',  ari  !== null ? Math.max(0, ari).toFixed(1)  : null, ari  !== null ? gradeLabel(ari)      : '');

  // --- Breakdown panel ---
  const active = window.ACTIVE_SCORE || null;
  const items = [];

  if (!active) {
    // Full page — show all breakdown items
    const gradeScores = [fkg, gfi, cli, ari].filter(s => s !== null);
    if (gradeScores.length > 0) {
      const avg = gradeScores.reduce((a, b) => a + b, 0) / gradeScores.length;
      items.push(`<strong>Overall reading level:</strong> ${gradeLabel(avg)} (average across grade-based scores).`);
    }
    if (fre !== null) {
      items.push(`<strong>Flesch Reading Ease score of ${Math.max(0, fre).toFixed(1)}:</strong> ${freLabel(fre)}. Scores range from 0 (most difficult) to 100 (easiest).`);
    }
  }

  // Sentence length — always shown
  if (avgSentLen <= 14) {
    items.push(`<strong>Average sentence length is ${avgSentLen.toFixed(1)} words</strong> — short and punchy. Good for quick-reading content.`);
  } else if (avgSentLen <= 20) {
    items.push(`<strong>Average sentence length is ${avgSentLen.toFixed(1)} words</strong> — a comfortable length for most readers.`);
  } else if (avgSentLen <= 28) {
    items.push(`<strong>Average sentence length is ${avgSentLen.toFixed(1)} words</strong> — on the longer side. Shorter sentences generally improve clarity.`);
  } else {
    items.push(`<strong>Average sentence length is ${avgSentLen.toFixed(1)} words</strong> — quite long. Consider breaking some sentences up for easier reading.`);
  }

  if (longSentences > 0) {
    items.push(`<strong>${longSentences} sentence${longSentences > 1 ? 's are' : ' is'} over 25 words long.</strong> These are worth reviewing — long sentences are the biggest driver of high grade-level scores.`);
  }

  if (complexPct <= 10) {
    items.push(`<strong>${complexPct.toFixed(0)}% of words have 3+ syllables</strong> — low. Your vocabulary is accessible to a wide range of readers.`);
  } else if (complexPct <= 20) {
    items.push(`<strong>${complexPct.toFixed(0)}% of words have 3+ syllables</strong> — moderate. Typical for general non-fiction and professional writing.`);
  } else {
    items.push(`<strong>${complexPct.toFixed(0)}% of words have 3+ syllables</strong> — high. Replacing some with simpler alternatives will lower the grade level.`);
  }

  if (active === 'smog' && smog === null) {
    items.push(`<strong>SMOG could not be calculated</strong> — it requires at least 30 sentences. Add more content for an accurate SMOG score.`);
  } else if (!active && smog === null) {
    items.push(`<strong>SMOG index could not be calculated</strong> — it requires at least 30 sentences. Add more content for a complete analysis.`);
  }

  document.getElementById('suggestions-list').innerHTML = items.map(text => `
    <div class="suggestion-item"><span>${text}</span></div>
  `).join('');

  document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- Load sample ---
function loadSample() {
  document.getElementById('text-input').value = `The process of photosynthesis is a fascinating biochemical mechanism through which plants, algae, and certain bacteria convert light energy into chemical energy stored in glucose. This extraordinarily complex process occurs primarily in the chloroplasts of plant cells, where chlorophyll molecules absorb sunlight. The light-dependent reactions take place in the thylakoid membranes, producing ATP and NADPH, which then power the Calvin cycle in the stroma. Carbon dioxide from the atmosphere is fixed into organic molecules through a series of enzymatic reactions. Without photosynthesis, the oxygen in Earth's atmosphere would not exist, and nearly all life on the planet would be impossible. Scientists continue to study this process in hopes of developing more efficient solar energy technologies.`;
  analyze();
}

// --- Clear ---
function clearAll() {
  document.getElementById('text-input').value = '';

  ['words', 'sentences', 'avg', 'time'].forEach(id => {
    const el = document.getElementById('stat-' + id);
    if (el) el.textContent = '—';
  });

  ['fre', 'fkg', 'gfi', 'smog', 'cli', 'ari'].forEach(id => {
    const val   = document.getElementById('val-' + id);
    const label = document.getElementById('label-' + id);
    if (val)   val.textContent   = '—';
    if (label) label.textContent = '';
  });

  const active = window.ACTIVE_SCORE || 'your text';
  document.getElementById('suggestions-list').innerHTML = `
    <div class="suggestion-item">
      <span>Paste your text above and click <strong>Analyze Text</strong> to see a full breakdown.</span>
    </div>
  `;
}
