// Prize calculation function (same as process-prize)
export function drawPrize(hasFriends: boolean = true): number {
  const r = Math.random() * 100; // 0.000 … 99.999

  if (r < 20) return 0; // 30% lose
  if (r < 35 && hasFriends) return -1; // 15% friend win (only if friends available)
  if (r < 60) return 0.5; // 25% → 60%
  if (r < 75) return 0.75; // 15% → 75%
  if (r < 85) return 1; // 10% → 85%
  if (r < 92) return 1.5; // 7% → 92%
  if (r < 97) return 2; // 5% → 97%
  if (r < 98) return 5; // 1% → 98%
  return 0; // last 2% blank
}
