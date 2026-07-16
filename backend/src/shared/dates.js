// A bare YYYY-MM-DD "to" filter should include the whole day, not stop at midnight.
export function endOfDay(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999` : value;
}
