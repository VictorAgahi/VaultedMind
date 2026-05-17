export const parseHourlyValue = (val: string): string => {
  const clean = val.trim().toLowerCase();
  if (!clean) return "";

  // Format: 6h30 or 6h or 6:30 or 06:30
  const timeRegex = /^(\d{1,2})[h:](\d{2})?$/;
  const match = clean.match(timeRegex);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      const decimal = hours + minutes / 60;
      return decimal.toFixed(2).replace(/\.?0+$/, ""); // e.g. 6.5
    }
  }

  // Format: 6h
  if (/^\d{1,2}h$/.test(clean)) {
    const hours = parseInt(clean.replace("h", ""), 10);
    if (hours >= 0 && hours < 24) {
      return hours.toString();
    }
  }

  // Format: 6,5 (French style decimal)
  const normalized = clean.replace(",", ".");
  const num = parseFloat(normalized);
  if (!isNaN(num)) {
    return num.toString();
  }

  return val;
};

export const formatHourlyValue = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || val === "") return "";
  const num = typeof val === "number" ? val : parseFloat(val);
  if (isNaN(num)) return String(val);

  const hours = Math.floor(num);
  const minutes = Math.round((num - hours) * 60);

  if (minutes === 0) return `${hours}h`;
  return `${hours}h${minutes.toString().padStart(2, "0")}`;
};
