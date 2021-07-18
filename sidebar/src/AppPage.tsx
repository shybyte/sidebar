import {loadPartialConfig} from '@babel/core';
import {createEffect} from 'solid-js'
import './AppPage.css';


export interface AppPageProps {
  url: string;
  extractedText?: string;
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
      console.log('analysisResult', analysisResult);
      iFrame.contentWindow.postMessage(analysisResult, '*');
    }
  });

  return <>
    <iframe src={props.url} ref={iFrame}/>
  </>;
}

export type LanguageId = string;

export interface AnalysisResult {
  type: 'analysisResult';
  sidebarCheckId: string;
  languageId: LanguageId;
  reports: ReportsForApp;
}

export type ReportsForApp = {
  extractedText: {content: string};
};

