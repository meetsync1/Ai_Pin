import { DiarizedEntry } from "@/src/types";

const FILLER_PATTERNS: RegExp[] = [
  /\b(um|uh|like|you know|i mean|basically|literally|right\?|okay so)\b/gi,
  /\b(matlab|haan haan|theek hai theek hai|toh toh|aur aur)\b/gi,
  /(\.\.\.|…)/g,
  /\s{2,}/g,
];

export function removeFiller(text: string) {
  return FILLER_PATTERNS.reduce(
    (value, pattern) => value.replace(pattern, " "),
    text,
  ).trim();
}

export function formatTimestamp(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function parseDiarizedTranscript(
  diarizedEntries: DiarizedEntry[],
  speakerLabels: Record<string, string> = {},
) {
  return diarizedEntries
    .map((entry) => {
      const label =
        speakerLabels[entry.speaker_id] ??
        `Speaker ${Number(entry.speaker_id) + 1}`;
      const timestamp = formatTimestamp(entry.start_time_seconds);
      const cleaned = removeFiller(entry.transcript);
      return `[${timestamp}] ${label}: ${cleaned}`;
    })
    .join("\n");
}

function tokenize(text: string) {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function buildTfIdfScores(lines: string[]) {
  const docCount = lines.length || 1;
  const docFreq: Record<string, number> = {};
  const lineTokens = lines.map((line) => {
    const tokens = tokenize(line);
    const unique = new Set(tokens);
    for (const token of unique) {
      docFreq[token] = (docFreq[token] ?? 0) + 1;
    }
    return tokens;
  });

  return lineTokens.map((tokens) => {
    const termFreq: Record<string, number> = {};
    for (const token of tokens) {
      termFreq[token] = (termFreq[token] ?? 0) + 1;
    }

    let score = 0;
    for (const [token, tf] of Object.entries(termFreq)) {
      const df = docFreq[token] ?? 1;
      const idf = Math.log(docCount / df);
      score += tf * idf;
    }
    return score;
  });
}

export function smartTruncate(formattedTranscript: string, targetRatio = 0.7) {
  const lines = formattedTranscript.split("\n").filter(Boolean);
  if (lines.length === 0) {
    return formattedTranscript;
  }

  const firstTen = Math.floor(lines.length * 0.1);
  const lastTen = Math.floor(lines.length * 0.1);
  const middle = lines.slice(firstTen, lines.length - lastTen);

  if (middle.length === 0) {
    return formattedTranscript;
  }

  const scores = buildTfIdfScores(middle);
  const scored = middle.map((line, index) => ({
    line,
    index,
    score: scores[index] ?? 0,
  }));

  const keepCount = Math.max(1, Math.floor(middle.length * targetRatio));
  const topMiddle = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, keepCount)
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.line);

  return [
    ...lines.slice(0, firstTen),
    ...topMiddle,
    ...lines.slice(lines.length - lastTen),
  ].join("\n");
}

export function countWords(text: string) {
  return tokenize(text).length;
}
