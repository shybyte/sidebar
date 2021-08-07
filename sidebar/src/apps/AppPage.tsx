import {createEffect, onCleanup} from 'solid-js'
import {LanguageCodeIso1} from '../utils/language-detection';
import './AppPage.css';
import {
  AnalysisResult,
  APP_COMMAND_PREFIX,
  AppConfig,
  AppMessage,
  AppMessages,
  AppRange,
  AppRangeWithReplacement,
  ReplaceRangesMessage,
  SelectRangesMessage
} from './apps';

export interface AppPageProps {
  url: string;
  documentAnalysisEvent?: DocumentAnalysisEvent;
  selectRanges(ranges: AppRange[]): void;
  replaceRanges(ranges: AppRangeWithReplacement[]): void;
  setAppConfig(url: string, appConfig: AppConfig): void;
}

export interface DocumentAnalysisEvent {
  language: LanguageCodeIso1;
  extractedText: string;
}


export function AppPage(props: AppPageProps) {
  let iFrame!: HTMLIFrameElement;

  function sendMessageToApp(message: any) {
    iFrame.contentWindow!.postMessage(message, '*');
  }

  createEffect(() => {
    if (props.documentAnalysisEvent) {
      const analysisResult: AnalysisResult = {
        type: 'analysisResult',
        languageId: props.documentAnalysisEvent.language,
        sidebarCheckId: 'dummySidebarCheckId',
        reports: {
          extractedText: {
            content: props.documentAnalysisEvent.extractedText
          }
        }
      };
      sendMessageToApp(analysisResult);
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

    const messageFromApp: AppMessage = {
      ...messageEvent.data,
      command: messageEvent.data.command.replace(APP_COMMAND_PREFIX, '')
    };
    console.log('messageFromApp', messageFromApp);

    AppMessages.match(messageFromApp, {
      openWindow: ({url}) => {
        window.open(url);
      },
      configureAddon: ({config}) => {
        props.setAppConfig(props.url, config);
      },
      selectRanges(message: SelectRangesMessage) {
        props.selectRanges(message.ranges);
      },
      replaceRanges(message: ReplaceRangesMessage) {
        props.replaceRanges(message.ranges);
      },
      requestAppAccessToken() {
        sendMessageToApp({
          type: 'appAccessToken',
          appAccessToken: 'dummyAccessToken',
          validationRequest: {
            url: location.href.slice(0, location.href.lastIndexOf('/')) + '/app-api-current-user.json',
            headers: {}
          }
        })
      }
    });
  }

  window.addEventListener('message', onMessageFromIFrame);
  onCleanup(() => window.removeEventListener('message', onMessageFromIFrame))

  return <>
    <iframe src={props.url} ref={iFrame}/>
  </>;
}

