import {For} from 'solid-js'
import {App} from './apps';
import styles from './AppsManager.module.css';

export interface AppsManagerProps {
  apps: App[];
  addApp(url: string): void;
  removeApp(url: string): void;
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
            <h3>{app.appConfig?.title || app.url}</h3>
            <button onClick={() => {
              props.removeApp(app.url);
            }}>Remove
            </button>
          </li>
        }
      </For>
    </ul>

  </>;
}
