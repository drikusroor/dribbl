import levenshteinDistance from "./levenshtein";

function isCloseGuess(guess: string, word: string): boolean {
  const g = guess.toLowerCase().trim();
  const w = word.toLowerCase().trim();
  
  // Already correct
  if (g === w) return false;
  
  const distance = levenshteinDistance(g, w);
  const maxLength = Math.max(g.length, w.length);
  
  // Close if edit distance is 1-2 for words of length > 3
  // or the similarity ratio is > 0.7
  if (maxLength > 3 && distance <= 2) return true;
  if (distance / maxLength < 0.3) return true;
  
  return false;
}

export default isCloseGuess;