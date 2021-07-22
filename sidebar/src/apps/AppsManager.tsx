import {For} from 'solid-js'
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

export function AppsManager(props: AppsManagerProps) {
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
              }} />
            </div>
          </li>
        }
      </For>
    </ul>

  </>;
}
