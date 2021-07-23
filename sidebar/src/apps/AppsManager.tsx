import {createSignal, For} from 'solid-js'
import {MaterialSwitch} from '../components/MaterialSwitch';
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
  let inputElement!: HTMLInputElement;

  return <>
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

    <div style={{display: selectedTab() === Tabs.MyApps ? 'block' : 'none'}}>
      <MyAppManager {...props}/>
    </div>

    <div style={{display: selectedTab() === Tabs.AppStore ? 'block' : 'none'}}>
      <AppStore {...props}/>
    </div>
  </>;
}


function MyAppManager(props: AppsManagerProps) {
  let inputElement!: HTMLInputElement;

  return <>
    <form onSubmit={(ev) => {
      ev.preventDefault();
      props.addApp(inputElement.value)
    }}
    >
      <input type="text" ref={inputElement}/>
      <button>Add App</button>
    </form>

    <ul className={styles.appList}>
      <For each={props.apps}>
        {app =>
          <li className={styles.appCard}>
            <h3><AppIcon appUrl={app.url}/>{app.appConfig?.title || app.url}</h3>
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
      </For>
    </ul>

  </>;
}

function AppStore(props: AppsManagerProps) {
  return <>
    <ul className={styles.appList}>
      <For each={props.apps}>
        {app =>
          <li className={styles.appCard}>
            <h3><AppIcon appUrl={app.url}/>{app.appConfig?.title || app.url}</h3>
            <div className={styles.appStoreCardBottom}>
              <MaterialSwitch label="Enabled" checked={app.enabled} onChange={(checked) => {
                props.setAppEnabled(app.url, checked);
              }}/>
            </div>
          </li>
        }
      </For>
    </ul>

  </>;
}

