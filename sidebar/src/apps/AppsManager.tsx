import {createSignal, For, Show} from 'solid-js'
import {MaterialSwitch} from '../components/MaterialSwitch';
import {APP_STORE_APPS} from './app-store-apps';
import {AppIcon} from './AppIcon';
import {App} from './apps';
import styles from './AppsManager.module.css';

export interface AppsManagerProps {
  apps: App[];
  addApp(url: string): void;
  removeApp(url: string): void;
  setAppEnabled(url: string, enabled: boolean): void;
}

enum Tabs {
  MyApps, AppStore
}

export function AppsManager(props: AppsManagerProps) {
  const [selectedTab, setSelectedTab] = createSignal(Tabs.MyApps);

  return <div className={styles.appsManager}>
    <div class={styles.tabs}>
      <button
        aria-selected={selectedTab() === Tabs.MyApps}
        onClick={() => setSelectedTab(Tabs.MyApps)}
      > My Apps
      </button>
      <button
        aria-selected={selectedTab() === Tabs.AppStore}
        onClick={() => setSelectedTab(Tabs.AppStore)}
      >Store
      </button>
    </div>

    <div
      className={styles.tabPanel + ' ' + styles.tabPanelWithoutScrolling}
      style={{display: selectedTab() === Tabs.MyApps ? 'block' : 'none'}}
    >
      <MyAppManager {...props}/>
    </div>

    <div
      className={styles.tabPanel}
      style={{display: selectedTab() === Tabs.AppStore ? 'block' : 'none'}}
    >
      <AppStore {...props}/>
    </div>
  </div>;
}


function MyAppManager(props: AppsManagerProps) {
  let inputElement!: HTMLInputElement;

  return <div className={styles.myAppManager}>
    <header>
      <form onSubmit={(ev) => {
        ev.preventDefault();
        props.addApp(inputElement.value)
        inputElement.value = '';
      }}
      >
        <input type="text" ref={inputElement} placeholder="App URL"/>
        <button>Add App</button>
      </form>
    </header>

    <ul className={styles.appList}>
      <For each={props.apps}>
        {app => {
          const appStoreApp = APP_STORE_APPS.find(it => it.url === app.url);
          return <li className={styles.appCard}>
            <h3><AppIcon appUrl={app.url}/>{app.appConfig?.title || appStoreApp?.title || app.url}</h3>
            <Show when={appStoreApp}>
              <div className={styles.appStoreAppDescription}>{appStoreApp!.description}</div>
            </Show>
            <div className={styles.appCardBottom}>
              <button onClick={() => {
                props.removeApp(app.url);
              }}>Remove
              </button>
              <MaterialSwitch label="Enabled" checked={app.enabled} onChange={(checked) => {
                props.setAppEnabled(app.url, checked);
              }}/>
            </div>
          </li>
        }
        }
      </For>
    </ul>

  </div>;
}

function AppStore(props: AppsManagerProps) {
  return <>
    <ul className={styles.appList}>
      <For each={APP_STORE_APPS}>
        {app =>
          <li className={styles.appCard}>
            <h3><AppIcon appUrl={app.url}/>{app.title || app.url}</h3>
            <div className={styles.appStoreAppDescription}>{app.description}</div>
            <div className={styles.appStoreCardBottom}>
              <MaterialSwitch
                label="Enabled"
                checked={!!props.apps.find(it => it.url === app.url)?.enabled}
                onChange={(checked) => {
                  const myApp = props.apps.find(it => it.url === app.url);
                  if (myApp) {
                    props.setAppEnabled(app.url, checked);
                  } else {
                    props.addApp(app.url);
                  }
                }}/>
            </div>
          </li>
        }
      </For>
    </ul>
  </>;
}

