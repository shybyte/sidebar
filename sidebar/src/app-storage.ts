export interface App {
  url: string;
}

const STORE_KEY = 'wribe.sidebar.apps';

export function saveApps(apps: App[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(apps));
}

export function loadApps(): App[] {
  const storedApps = localStorage.getItem(STORE_KEY);
  return storedApps
    ? JSON.parse(storedApps)
    : [{url: 'https://acrolinx.github.io/app-sdk-js/examples/text-extraction/'}];
}
