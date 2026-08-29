/**
 * Formats a Date as a 'YYYY-MM-DD' string using its *local* calendar fields
 * (getFullYear/getMonth/getDate), not UTC.
 *
 * This matters because `date.toISOString().slice(0, 10)` converts to UTC first,
 * which silently shifts the calendar day for anyone not in UTC — e.g. someone
 * journaling shortly after their own local midnight would have that entry
 * attributed to the previous day. Callers that need "today" for streak
 * tracking or daily-prompt rotation should compute it on the client (where the
 * user's actual local timezone is known) using this helper, not on the server.
 */
export function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
