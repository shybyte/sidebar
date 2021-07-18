import {For} from 'solid-js'
import {App} from './app-storage';

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

    <ul>
      <For each={props.apps}>
        {app =>
          <li>
            <h3>{app.url}</h3>
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
