/**
 * Defense-in-depth redaction for anything derived from user input or tool
 * output before it is embedded in a visible execution trace. This protects
 * against a user pasting a real secret into the chat box, not just against
 * the app's own credentials (which are never placed in trace fields to begin
 * with — this is a second layer, not the only layer).
 */

const SECRET_PATTERNS: RegExp[] = [
  /sk-[a-z0-9_-]{10,}/gi,
  /gh[pousr]_[a-z0-9]{20,}/gi,
  /bearer\s+[a-z0-9._-]{10,}/gi,
  /bearer_[a-z0-9._-]{10,}/gi,
  /"?password"?\s*[:=]\s*"?[^"\s,}]{3,}"?/gi,
  /"?api[_-]?key"?\s*[:=]\s*"?[^"\s,}]{3,}"?/gi,
  /cookie:\s*[^\n;]+/gi,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // email
  /(\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, // phone
  /\btxn_[a-zA-Z0-9]{5,}\b/g, // transaction reference
];

export function redactSecrets(input: string): string {
  return SECRET_PATTERNS.reduce((text, pattern) => text.replace(pattern, "[redacted]"), input);
}

export function summarize(input: string, maxLength = 220): string {
  const redacted = redactSecrets(input);
  return redacted.length > maxLength ? `${redacted.slice(0, maxLength)}…` : redacted;
}
