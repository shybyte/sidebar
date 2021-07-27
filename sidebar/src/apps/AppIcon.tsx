export interface AppIconProps {
  appUrl: string;
}

export function AppIcon(props: AppIconProps) {
  return <img width={24} height={24} src={props.appUrl + 'acrolinx-app-icon.svg'} alt=""/>;
}
