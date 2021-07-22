export interface AppIconProps {
  appUrl: string;
}

export function AppIcon(props: AppIconProps) {
  return <img src={props.appUrl + 'acrolinx-app-icon.svg'} alt=""/>;
}
