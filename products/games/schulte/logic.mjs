export const GRID_SIZE = 36;
export const MAX_HISTORY = 100;

export function shuffleNumbers(random = Math.random) {
  const numbers = Array.from({ length: GRID_SIZE }, (_, index) => index + 1);
  for (let index = numbers.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [numbers[index], numbers[swapIndex]] = [numbers[swapIndex], numbers[index]];
  }
  return numbers;
}

export function normalizeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((record) => (
      record
      && typeof record.completedAt === "string"
      && Number.isFinite(record.durationMs)
      && record.durationMs > 0
    ))
    .map((record) => ({
      completedAt: record.completedAt,
      durationMs: Math.round(record.durationMs),
    }))
    .slice(-MAX_HISTORY);
}

export function addHistoryRecord(history, record) {
  return normalizeHistory([...normalizeHistory(history), record]).slice(-MAX_HISTORY);
}

export function historySummary(history) {
  const records = normalizeHistory(history);
  if (!records.length) return null;
  return {
    firstMs: records[0].durationMs,
    latestMs: records.at(-1).durationMs,
    bestMs: Math.min(...records.map((record) => record.durationMs)),
    count: records.length,
  };
}

export function secondsLabel(durationMs) {
  return `${(durationMs / 1000).toFixed(1)} 秒`;
}

export function improvementLabel(currentMs, previousMs) {
  if (!Number.isFinite(previousMs)) return "第一次完成";
  const difference = previousMs - currentMs;
  if (Math.abs(difference) < 50) return "和上次一样";
  if (difference > 0) return `快了 ${(difference / 1000).toFixed(1)} 秒`;
  return `比上次多 ${(Math.abs(difference) / 1000).toFixed(1)} 秒`;
}
