import './AppPage.css';

export interface AppPageProps {
  url: string;
}

export function AppPage(props: AppPageProps) {
  return <>
    <iframe src={props.url}/>
  </>;
}
