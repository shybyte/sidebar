import {
  AcrolinxPlugin,
  AcrolinxSidebar,
  Check,
  CheckedDocumentRange,
  CheckOptions,
  InitParameters,
  InvalidDocumentPart,
  Message,
  SidebarConfiguration
} from '@acrolinx/sidebar-interface';
import {createEffect, createSignal, For, onMount, Show} from 'solid-js';
import {createStore, produce} from 'solid-js/store';
import {render} from 'solid-js/web';
import {loadApps, saveApps} from './apps/app-storage';
import {AppIcon} from './apps/AppIcon';
import {AppPage, DocumentAnalysisEvent} from './apps/AppPage';
import {AnalysisType, App, AppConfig, AppRange, AppRangeWithReplacement} from './apps/apps';
import {AppsManager} from './apps/AppsManager';
import {CheckIcon} from './components/CheckIcon'
import {ExtensionIcon} from './components/ExtensionIcon';
import {LogoutIcon} from './components/LogoutIcon';
import {CorrectionsList} from './corrections-page/CorrectionsList';
import {ExtractionResult, extractTextFromHtml} from './text-extraction/html-extraction';
import './index.css';
import {detectLanguage, LanguageCodeIso1} from './utils/language-detection';
import {createMessageAdapter} from './message-adapter';
import {Correction, Range} from './nlprule-webworker';
import {mapExtractedRangeToOriginal} from './text-extraction/range-mapping';
import './Sidebar.css';


function loadWorker(language: string) {
  const urlSearchParams = new URLSearchParams(location.search);
  if (urlSearchParams.get('acrolinxUseMessageApi') === 'true' || !(window as any).acrolinxPlugin) {
    console.log('Message Mode');
    return new Worker(new URL('./nlprule-webworker.ts', import.meta.url), {name: language});
  } else {
    // https://stackoverflow.com/questions/25458104/can-should-html5-web-workers-use-cors-for-cross-origin
    // https://benohead.com/blog/2017/12/06/cross-domain-cross-browser-web-workers/
    const blob = new Blob([
        `importScripts('${process.env.PUBLIC_PATH}src/src_nlprule-webworker_ts.bootstrap.js');`
      ],
      {'type': 'application/javascript'});
    return new Worker(URL.createObjectURL(blob), {name: language});
  }
}

const languages = ['en', 'de'];
const nlpruleWorkerByLanguage: Record<string, Worker> = {};

enum Tabs {
  CorrectionsList = 'corrections',
  AppsManager = 'appManager'
}

interface ExtractionEvent {
  tab: string;
  language: LanguageCodeIso1;
  result: ExtractionResult;
}

interface CheckRequest {
  text: string;
  language: string;
}

function Sidebar() {
  const [removedCorrectionIDs, setRemovedCorrectionIDs] = createSignal(new Set<string>());
  const [corrections, setCorrections] = createSignal<Correction[]>([]);
  const [isChecking, setIsChecking] = createSignal(false);
  const [selectedCorrectionId, setSelectedCorrectionId] = createSignal<string | undefined>(undefined);
  const [selectedTab, setSelectedTab] = createSignal<string>(localStorage.getItem('wribe.sidebar.apps.selectedTab') || Tabs.CorrectionsList);
  const [appsStore, setAppsStore] = createStore<{ apps: App[] }>({apps: loadApps()});
  const [extractionEvent, setExtractionEvent] = createSignal<ExtractionEvent>();
  const [initParameters, setInitParameters] = createSignal<InitParameters>({});

  let queuedCheckRequest: CheckRequest | undefined;

  createEffect(() => {
    localStorage.setItem('wribe.sidebar.apps.selectedTab', selectedTab());
  })

  const acrolinxSidebar: AcrolinxSidebar = {
    checkGlobal(documentContent: string, options: CheckOptions): Check {
      console.log('checkGlobal', documentContent, options);
      const extractionResult = (
        options.inputFormat === 'HTML' ||
        (documentContent.startsWith('<!DOCTYPE browserHtmlAcrolinx') && options.inputFormat === 'AUTO')
      )
        ? extractTextFromHtml(documentContent)
        : {text: documentContent};
      console.log('extractionResult', extractionResult);

      const language = detectLanguage(extractionResult.text);
      setExtractionEvent({
        result: extractionResult,
        tab: selectedTab(),
        language
      });

      if (selectedTab() === Tabs.CorrectionsList) {
        const worker = nlpruleWorkerByLanguage[language];
        if (worker) {
          worker.postMessage({text: extractionResult.text});
        } else {
          queuedCheckRequest = {text: extractionResult.text, language};
        }
      } else {
        setIsChecking(false);
        sendDummyCheckResultToPlugin();
      }
      return {checkId: 'dummyCheckId'};
    },

    configure(configuration: SidebarConfiguration): void {
    },

    init(initParametersArg: InitParameters): void {
      console.log('initParameters', initParametersArg);
      setInitParameters(initParametersArg);
    },

    invalidateRanges(invalidCheckedDocumentRanges: InvalidDocumentPart[]): void {
    },

    onGlobalCheckRejected(): void {
    },

    onVisibleRangesChanged(checkedDocumentRanges: CheckedDocumentRange[]): void {
    },

    showMessage(message: Message): void {
    }
  }

  const acrolinxPlugin: AcrolinxPlugin = (window as any).acrolinxPlugin || createMessageAdapter();
  (window as any).acrolinxSidebar = acrolinxSidebar;
  acrolinxPlugin.requestInit();

  function checkTextInput() {
    console.log('Start Check');
    setIsChecking(true);
    acrolinxPlugin.requestGlobalCheck();
  }

  function onCheckResult(corrections: Correction[]) {
    setRemovedCorrectionIDs(new Set());
    setCorrections(corrections);
    sendDummyCheckResultToPlugin();
  }

  function sendDummyCheckResultToPlugin() {
    acrolinxPlugin.onCheckResult({
      checkedPart: {checkId: 'dummyCheckId', range: [0, extractionEvent()!.result.text.length]}
    });
  }

  function loadNlpRuleWorkers(languageIndex = 0) {
    const loadingLanguage = languages[languageIndex];
    if (!loadingLanguage) {
      return;
    }
    const loadingWorker = loadWorker(loadingLanguage);
    loadingWorker.onmessage = ({data: {eventType, corrections}}) => {
      switch (eventType) {
        case 'loaded':
          nlpruleWorkerByLanguage[loadingLanguage] = loadingWorker;
          if (queuedCheckRequest && nlpruleWorkerByLanguage[queuedCheckRequest.language]) {
            nlpruleWorkerByLanguage[queuedCheckRequest.language].postMessage({text: queuedCheckRequest.text});
            queuedCheckRequest = undefined;
          }
          loadNlpRuleWorkers(languageIndex + 1);
          break
        case 'checkFinished':
          setIsChecking(false);
          onCheckResult(corrections);
      }
    };
  }

  onMount(() => {
    loadNlpRuleWorkers();
    acrolinxPlugin.onInitFinished({});
  });


  function calculateOriginalRange(range: Range): [number, number] {
    const extractionResult = extractionEvent()?.result;
    if (extractionResult?.mappedOffsetRanges) {
      const mappedOffsetRange = mapExtractedRangeToOriginal(extractionResult.mappedOffsetRanges, {
        begin: range.start,
        end: range.end
      });
      return [mappedOffsetRange[0].original.begin, mappedOffsetRange[mappedOffsetRange.length - 1].original.end];
    } else {
      return [range.start, range.end];
    }
  }

  function selectCorrection(correction: Correction) {
    setSelectedCorrectionId(correction.id);
    acrolinxPlugin.selectRanges('dummyCheckId', [{
      content: correction.issueText,
      extractedRange: [correction.span.char.start, correction.span.char.end],
      range: calculateOriginalRange(correction.span.char)
    }]);
  }

  function selectRanges(ranges: AppRange[]) {
    acrolinxPlugin.selectRanges('dummyCheckId', ranges.map(range => ({
      content: extractionEvent()!.result.text.slice(range.begin, range.end),
      extractedRange: [range.begin, range.end],
      range: calculateOriginalRange({start: range.begin, end: range.end})
    })));
  }

  function replaceRanges(ranges: AppRangeWithReplacement[]) {
    acrolinxPlugin.replaceRanges('dummyCheckId', ranges.map(range => ({
      content: extractionEvent()!.result.text.slice(range.begin, range.end),
      extractedRange: [range.begin, range.end],
      range: calculateOriginalRange({start: range.begin, end: range.end}),
      replacement: range.replacement
    })));
  }

  function replaceCorrection(correction: Correction, replacement: string) {
    acrolinxPlugin.replaceRanges('dummyCheckId', [{
      content: correction.issueText,
      extractedRange: [correction.span.char.start, correction.span.char.end],
      range: calculateOriginalRange(correction.span.char),
      replacement: replacement,
    }]);
    setRemovedCorrectionIDs(new Set(removedCorrectionIDs()).add(correction.id));
  }

  function addApp(url: string) {
    setAppsStore('apps', apps => apps.concat({url, enabled: true}))
    saveApps(appsStore.apps);
  }

  function removeApp(url: string) {
    setAppsStore('apps', apps => apps.filter(app => app.url !== url))
    saveApps(appsStore.apps);
  }

  function setAppConfig(url: string, appConfig: AppConfig) {
    setAppsStore('apps', it => it.url === url, produce((app: App) => {
      app.appConfig = appConfig;
    }));
    saveApps(appsStore.apps);
  }

  function setAppEnabled(url: string, enabled: boolean) {
    setAppsStore('apps', it => it.url === url, produce((app: App) => {
      app.enabled = enabled;
    }));
    saveApps(appsStore.apps);
  }

  function selectedApp() {
    return appsStore.apps.find(it => it.url === selectedTab());
  }

  function enabledApps() {
    return appsStore.apps.filter(app => app.enabled);
  }

  function needsCheckButton() {
    return selectedTab() === Tabs.CorrectionsList || selectedApp()?.appConfig?.requiredReportContent.includes(AnalysisType.extractedText);
  }

  return (
    <div class="sidebar">
      <header className="sidebar-header">
        <div class={'mainTabs'}>
          <button
            onClick={() => {
              setSelectedTab(Tabs.CorrectionsList)
            }}
            aria-selected={selectedTab() === Tabs.CorrectionsList}
            title="Corrections"
          ><CheckIcon/></button>
          <For each={enabledApps()}>
            {app => <button
              onClick={() => {
                setSelectedTab(app.url)
              }}
              aria-selected={selectedTab() === app.url}
              title={app.appConfig?.title || app.url}
            ><AppIcon appUrl={app.url}/></button>}
          </For>
          <button
            onClick={() => {
              setSelectedTab(Tabs.AppsManager)
            }}
            aria-selected={selectedTab() === Tabs.AppsManager}
            title="Add & Manage Apps"
          ><ExtensionIcon/></button>

          <Show when={initParameters().supported?.showServerSelector}>
            <button
              onClick={() => {
                acrolinxPlugin.showServerSelector!();
              }}
              title="Logout"
            >
              <LogoutIcon/>
            </button>
          </Show>
        </div>

        <Show
          when={needsCheckButton()}>
          <div class="check-button-section">
            <button
              id="checkButton"
              disabled={isChecking()}
              onClick={(event) => {
                checkTextInput();
              }}
              title={selectedApp()?.appConfig?.button?.tooltip || 'Check your text for problems.'}
            >{selectedApp()?.appConfig?.button?.text || 'Check'}
            </button>
          </div>

        </Show>
      </header>


      <main>
        <Show when={isChecking()}>
          <div id="loadingSpinner" class="lds-dual-ring"/>
        </Show>


        <div class={'tab-panel'} style={{display: selectedTab() === Tabs.CorrectionsList ? 'block' : 'none'}}>
          <Show when={corrections().length > 0}>
            <CorrectionsList
              corrections={corrections()}
              selectCorrection={selectCorrection}
              replaceCorrection={replaceCorrection}
              selectedCorrectionId={selectedCorrectionId()}
              removedCorrectionIDs={removedCorrectionIDs()}
            />
          </Show>
        </div>
        <For each={enabledApps()}>
          {app =>
            <div class={'tab-panel tab-panel-without-scrolling'}
                 style={{display: selectedTab() === app.url ? 'block' : 'none'}}>
              <AppPage
                url={app.url}
                documentAnalysisEvent={getDocumentAnalysisResultFromExtractionEvent(app.url, extractionEvent())}
                selectRanges={selectRanges}
                replaceRanges={replaceRanges}
                setAppConfig={setAppConfig}
              />
            </div>}
        </For>
        <div class={'tab-panel tab-panel-without-scrolling'}
             style={{display: selectedTab() === Tabs.AppsManager ? 'block' : 'none'}}>
          <AppsManager apps={appsStore.apps} addApp={addApp} removeApp={removeApp} setAppEnabled={setAppEnabled}/>
        </div>
      </main>
    </div>
  );
}

export function renderApp() {
  render(() => <Sidebar/>, document.getElementById('app')!);
}

function getDocumentAnalysisResultFromExtractionEvent(appUrl: string, extractionEvent: ExtractionEvent | undefined): DocumentAnalysisEvent | undefined {
  if (extractionEvent?.tab === appUrl) {
    return {
      language: extractionEvent.language,
      extractedText: extractionEvent.result.text
    };
  } else {
    return undefined;
  }
}
