// Date du jour au format AAAA-MM-JJ dans le fuseau de l'appareil.
// toISOString() renverrait la date UTC : entre minuit et 2h à Paris, "aujourd'hui" deviendrait la veille.
export const localDateStr = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
