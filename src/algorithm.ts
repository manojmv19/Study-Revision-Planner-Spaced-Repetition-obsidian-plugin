/**
 * Spaced Repetition Algorithm (SM-2 Variant)
 * Quality mapping from user input:
 * 3 (Hard) -> maps to standard SM-2 grade 3
 * 4 (Good) -> maps to standard SM-2 grade 4
 * 5 (Easy) -> maps to standard SM-2 grade 5
 * 1 (Forgot) -> maps to standard SM-2 grade 1
 */
export function calculateNextInterval(quality: number, currentInterval: number, currentEaseFactor: number): { interval: number, easeFactor: number } {
  // SM-2 ease factor calculation
  let newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  // Ease factor cannot drop below 1.3
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  let newInterval = 1;
  
  if (quality < 3) {
    // If forgotten or very difficult, reset interval to 1 day
    newInterval = 1;
  } else {
    // If remembered successfully
    if (currentInterval === 0) {
      newInterval = 1;
    } else if (currentInterval === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * currentEaseFactor);
    }
  }

  return { 
    interval: newInterval, 
    easeFactor: newEaseFactor 
  };
}
