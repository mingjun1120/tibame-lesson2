/**
 * Echo skill — returns the input message as-is.
 * Serves as a minimal example skill for the practice project.
 */
export function echo(message) {
  if (typeof message !== "string") {
    throw new TypeError("message must be a string");
  }
  return message;
}