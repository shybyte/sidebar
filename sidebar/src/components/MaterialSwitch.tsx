import styles from './MaterialSwitch.module.css'

export interface MaterialSwitchProps {
  label: string;
  checked: boolean;
  onChange(checked: boolean): void;
}

export function MaterialSwitch(props: MaterialSwitchProps) {
  return <label class={styles['pure-material-switch']}>
    <input
      type="checkbox" checked={props.checked}
      onChange={(event) => {
        props.onChange(event.currentTarget.checked);
      }}/>
    <span>{props.label}</span>
  </label>;
}
