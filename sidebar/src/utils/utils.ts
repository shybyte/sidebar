export function waitMs(ms = 0) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}
