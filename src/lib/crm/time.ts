export const CRM_TIME_ZONE = "America/Sao_Paulo";

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const zonedFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CRM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function partsInSaoPaulo(date: Date): DateParts {
  const values = Object.fromEntries(
    zonedFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function localPartsToUtc(parts: DateParts): Date {
  const targetAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  let candidate = targetAsUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = partsInSaoPaulo(new Date(candidate));
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second
    );
    candidate += targetAsUtc - actualAsUtc;
  }
  return new Date(candidate);
}

export function getSaoPauloDayRange(now = new Date()): {
  start: Date;
  end: Date;
} {
  const local = partsInSaoPaulo(now);
  const nextDay = new Date(Date.UTC(local.year, local.month - 1, local.day + 1));
  return {
    start: localPartsToUtc({ ...local, hour: 0, minute: 0, second: 0 }),
    end: localPartsToUtc({
      year: nextDay.getUTCFullYear(),
      month: nextDay.getUTCMonth() + 1,
      day: nextDay.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0,
    }),
  };
}

export function isInsideRange(
  value: string | Date,
  start: Date,
  end: Date
): boolean {
  const timestamp = new Date(value).getTime();
  return timestamp >= start.getTime() && timestamp < end.getTime();
}
