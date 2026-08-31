/**
 * Transcript Analysis Engine for SpeakUp
 * Analyzes Indonesian speech transcripts to identify:
 * 1. Filler Words (Kata Pengisi) - Yellow/Amber Highlighter
 * 2. Words/Phrases Needing Refinement (Perlu Koreksi/Repetisi) - Orange/Peach Highlighter
 * 3. Strong Structure Markers (Poin Kuat) - Mint Green Highlighter
 */

// Common Indonesian filler words and hesitation sounds
export const FILLER_WORDS = new Set([
  "umm",
  "um",
  "uhh",
  "uh",
  "ehh",
  "eh",
  "emmm",
  "emm",
  "em",
  "anu",
  "hmm",
  "hm",
  "haa",
  "hah",
  "aaa",
  "eee",
  "apa ya",
  "apa tuh",
  "apa namanya",
  "gimana ya",
  "kayak",
  "kayaknya",
  "kayak gitu",
  "gitu",
  "terus",
  "jadi",
  "gak tau",
  "nggak tau",
  "mungkin",
  "pokoknya",
  "yah",
  "dong",
]);

// Multi-word phrases that represent hesitation or filler habit
export const FILLER_PHRASES = [
  { phrase: "apa namanya", reason: "Kata pengisi saat mencari ide", suggestion: "Ambil jeda hening sejenak (pause) alih-alih menyebutkan frase ini." },
  { phrase: "apa ya", reason: "Frase keraguan / jeda cemas", suggestion: "Tarik napas dan susun poin berikutnya dalam jeda hening." },
  { phrase: "gimana ya", reason: "Frase keraguan", suggestion: "Langsung sampaikan inti gagasanmu." },
  { phrase: "kayak gitu", reason: "Penutup ambigu / filler", suggestion: "Gunakan kalimat konklusi yang tegas seperti 'Oleh karena itu...'." },
  { phrase: "gak tau", reason: "Ungkapan kurang percaya diri", suggestion: "Ganti dengan 'Berdasarkan pemahaman saya saat ini...'." },
  { phrase: "nggak tau", reason: "Ungkapan kurang percaya diri", suggestion: "Ganti dengan 'Berdasarkan pemahaman saya saat ini...'." },
  { phrase: "ya gitu deh", reason: "Penutup informal & melemahkan argumen", suggestion: "Tutup dengan poin kesimpulan yang jelas." },
  { phrase: "bingung mau ngomong apa", reason: "Menunjukkan rasa panik secara verbal", suggestion: "Berhenti sejenak, tatap audiens, lalu lanjutkan poin berikutnya." },
];

// Structural signposts that elevate public speaking delivery
export const STRONG_MARKERS = [
  { phrase: "pertama", reason: "Penanda struktur yang jelas", type: "strong" },
  { phrase: "kedua", reason: "Penanda struktur yang jelas", type: "strong" },
  { phrase: "ketiga", reason: "Penanda struktur yang jelas", type: "strong" },
  { phrase: "selain itu", reason: "Transisi ide yang kohesif", type: "strong" },
  { phrase: "kesimpulannya", reason: "Penegasan poin akhir yang kuat", type: "strong" },
  { phrase: "oleh karena itu", reason: "Alur penalaran sebab-akibat yang solid", type: "strong" },
  { phrase: "sebagai contoh", reason: "Memberikan bukti konkret", type: "strong" },
  { phrase: "menurut saya", reason: "Pernyataan argumen yang tegas", type: "strong" },
  { phrase: "faktanya", reason: "Menegaskan data & objektivitas", type: "strong" },
  { phrase: "langkah konkret", reason: "Penyampaian solusi yang terarah", type: "strong" },
];

/**
 * Analyzes a raw transcript and splits it into annotated token segments.
 */
export function analyzeTranscript(rawInput) {
  let rawText = "";
  if (typeof rawInput === "string") {
    rawText = rawInput;
  } else if (rawInput && typeof rawInput === "object") {
    if (typeof rawInput.text === "string") rawText = rawInput.text;
    else if (typeof rawInput.transcript === "string") rawText = rawInput.transcript;
    else if (typeof rawInput.transkrip === "string") rawText = rawInput.transkrip;
    else {
      try {
        rawText = JSON.stringify(rawInput);
      } catch {
        rawText = "";
      }
    }
  }

  if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
    return {
      tokens: [],
      stats: {
        totalWords: 0,
        fillerCount: 0,
        correctionCount: 0,
        strongCount: 0,
        clarityScore: 100,
      },
    };
  }

  const cleanText = String(rawText).trim();
  const lowerText = cleanText.toLowerCase();

  // Find multi-word matches first
  const phraseMatches = [];

  for (const item of FILLER_PHRASES) {
    let pos = 0;
    while ((pos = lowerText.indexOf(item.phrase, pos)) !== -1) {
      phraseMatches.push({
        start: pos,
        end: pos + item.phrase.length,
        text: cleanText.substring(pos, pos + item.phrase.length),
        type: "filler",
        reason: item.reason,
        suggestion: item.suggestion,
      });
      pos += item.phrase.length;
    }
  }

  for (const item of STRONG_MARKERS) {
    let pos = 0;
    while ((pos = lowerText.indexOf(item.phrase, pos)) !== -1) {
      // Ensure word boundaries
      const isWordStart = pos === 0 || /\s|[.,!?]/.test(lowerText[pos - 1]);
      const isWordEnd = pos + item.phrase.length >= lowerText.length || /\s|[.,!?]/.test(lowerText[pos + item.phrase.length]);
      if (isWordStart && isWordEnd) {
        phraseMatches.push({
          start: pos,
          end: pos + item.phrase.length,
          text: cleanText.substring(pos, pos + item.phrase.length),
          type: "strong",
          reason: item.reason,
          suggestion: "Pilihan kata terstruktur yang bagus!",
        });
      }
      pos += item.phrase.length;
    }
  }

  // Tokenize words with spaces and punctuation preserved
  const wordRegex = /([a-zA-Z0-9À-ž'-]+|[\s]+|[.,!?;:()"]+)/g;
  const rawTokens = cleanText.match(wordRegex) || [cleanText];

  let fillerCount = 0;
  let correctionCount = 0;
  let strongCount = 0;
  let totalWords = 0;

  let currentPos = 0;
  const processedTokens = [];
  let prevWord = "";

  for (let i = 0; i < rawTokens.length; i++) {
    const piece = rawTokens[i];
    const isWord = /^[a-zA-Z0-9À-ž'-]+$/.test(piece);
    const startPos = currentPos;
    const endPos = currentPos + piece.length;
    currentPos = endPos;

    if (!isWord) {
      processedTokens.push({ text: piece, type: "text" });
      continue;
    }

    totalWords++;
    const wordLower = piece.toLowerCase();

    // Check if covered by a multi-word phrase
    const coveringPhrase = phraseMatches.find((m) => startPos >= m.start && endPos <= m.end);
    if (coveringPhrase) {
      if (coveringPhrase.type === "filler") fillerCount++;
      if (coveringPhrase.type === "strong") strongCount++;
      processedTokens.push({
        text: piece,
        type: coveringPhrase.type,
        reason: coveringPhrase.reason,
        suggestion: coveringPhrase.suggestion,
      });
      prevWord = wordLower;
      continue;
    }

    // Check for word repetition (e.g. "saya saya")
    if (wordLower === prevWord && wordLower.length > 2) {
      correctionCount++;
      processedTokens.push({
        text: piece,
        type: "correction",
        reason: "Pengulangan kata tanpa sengaja (stutter/hesitancy)",
        suggestion: "Ambil napas sejenak sebelum memulai kata berikutnya.",
      });
      prevWord = wordLower;
      continue;
    }

    // Check for single filler words
    if (FILLER_WORDS.has(wordLower)) {
      fillerCount++;
      processedTokens.push({
        text: piece,
        type: "filler",
        reason: `Kata pengisi ("${piece}")`,
        suggestion: "Coba ganti dengan jeda hening 1 detik.",
      });
      prevWord = wordLower;
      continue;
    }

    processedTokens.push({ text: piece, type: "text" });
    prevWord = wordLower;
  }

  const clarityScore = Math.max(40, Math.round(100 - (fillerCount * 3 + correctionCount * 4)));

  return {
    tokens: processedTokens,
    stats: {
      totalWords,
      fillerCount,
      correctionCount,
      strongCount,
      clarityScore,
    },
  };
}
