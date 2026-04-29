type DateTimeOptions = Intl.DateTimeFormatOptions;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(options: DateTimeOptions) {
  const cacheKey = JSON.stringify(options);
  const cached = formatterCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const formatter = new Intl.DateTimeFormat(undefined, options);
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

function toValidDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatJournalReadableDate(dayKey: string) {
  const date = toValidDate(`${dayKey}T00:00:00`);
  if (!date) {
    return dayKey;
  }
  return getFormatter({
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatJournalReadableTime(value: string) {
  const date = toValidDate(value);
  if (!date) {
    return value;
  }
  return getFormatter({
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatJournalDateTimeDisplay(value: string) {
  const date = toValidDate(value);
  if (!date) {
    return value;
  }
  return getFormatter({
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
