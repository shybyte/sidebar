import {createEffect, onCleanup} from 'solid-js'
import './AppPage.css';
import {AnalysisResult, APP_COMMAND_PREFIX, AppConfig, AppMessage, AppMessages} from './apps';

export interface AppPageProps {
  url: string;
  extractedText?: string;
  setAppConfig(url: string, appConfig: AppConfig): void;
}

export function AppPage(props: AppPageProps) {
  let iFrame!: HTMLIFrameElement;

  createEffect(() => {
    if (props.extractedText && iFrame.contentWindow) {
      const analysisResult: AnalysisResult = {
        type: 'analysisResult',
        languageId: 'en',
        sidebarCheckId: 'dummySidebarCheckId',
        reports: {
          extractedText: {
            content: props.extractedText
          }
        }
      };
      console.warn('analysisResult', analysisResult);
      iFrame.contentWindow.postMessage(analysisResult, '*');
    }
  });

  function onMessageFromIFrame(messageEvent: MessageEvent) {
    if ((messageEvent.source !== iFrame.contentWindow)) {
      return;
    }
    if (!messageEvent.data.command || !messageEvent.data.command.startsWith(APP_COMMAND_PREFIX)) {
      console.warn('Invalid message from app', messageEvent);
      return;
    }

    const messageFromApp: AppMessage = {...messageEvent.data, command: messageEvent.data.command.replace(APP_COMMAND_PREFIX, '')};
    console.log('messageFromApp', messageFromApp);

    AppMessages.match(messageFromApp, {
      openWindow: ({url}) => {
        window.open(url);
      },
      configureAddon: ({config}) => {
        props.setAppConfig(props.url, config);
      },
      selectRanges() {},
      replaceRanges() {},
    });
  }

  window.addEventListener('message', onMessageFromIFrame);
  onCleanup(() => window.removeEventListener('message', onMessageFromIFrame))

  return <>
    <iframe src={props.url} ref={iFrame}/>
  </>;
}

