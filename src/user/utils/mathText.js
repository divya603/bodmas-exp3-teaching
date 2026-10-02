// Display-only formatting for math in participant-facing text: a true minus
// sign instead of the hyphen the pool and advice files use, and non-breaking
// spaces around operators so an expression like "4 + 1" never wraps mid-way.
// Logged data keeps the raw strings.
export function mathText(s) {
  return s
    .replace(/(\S) - (\S)/g, '$1 − $2')
    .replace(/(\S) - (\S)/g, '$1 − $2') // second pass for overlapping matches
    .replace(/ ([+−×÷]) /g, ' $1 ')
}
