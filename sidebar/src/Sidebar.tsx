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
import {AppPage} from './apps/AppPage';
import {AnalysisType, App, AppConfig} from './apps/apps';
import {AppsManager} from './apps/AppsManager';
import {CheckIcon} from './components/CheckIcon'
import {ExtensionIcon} from './components/ExtensionIcon';
import {CorrectionsList} from './CorrectionsList';
import {ExtractionResult, extractTextFromHtml} from './html-extraction';
import './index.css';
import {createMessageAdapter} from './message-adapter';
import {Correction, Range} from './nlprule-webworker';
import {mapExtractedRangeToOriginal} from './range-mapping';
import './Sidebar.css';

function loadWorker() {
  const urlSearchParams = new URLSearchParams(location.search);

  if (urlSearchParams.get('acrolinxUseMessageApi') === 'true' || !(window as any).acrolinxPlugin) {
    console.log('Message Mode');
    return new Worker(new URL('./nlprule-webworker.ts', import.meta.url));
  } else {
    // https://stackoverflow.com/questions/25458104/can-should-html5-web-workers-use-cors-for-cross-origin
    // https://benohead.com/blog/2017/12/06/cross-domain-cross-browser-web-workers/
    const blob = new Blob([
        `importScripts('${process.env.PUBLIC_PATH}src/src_nlprule-webworker_ts.bootstrap.js');`
      ],
      {'type': 'application/javascript'});
    return new Worker(URL.createObjectURL(blob))
  }
}

const nlpruleWorker = loadWorker();

enum Tabs {
  CorrectionsList = 'corrections',
  AppsManager = 'appManager'
}

interface ExtractionEvent {
  tab: string;
  result: ExtractionResult;
}

function Sidebar() {
  const [removedCorrectionIDs, setRemovedCorrectionIDs] = createSignal(new Set<string>());
  const [corrections, setCorrections] = createSignal<Correction[]>([]);
  const [isCheckerInitialized, setCheckerInitialized] = createSignal(false);
  const [isChecking, setIsChecking] = createSignal(false);
  const [selectedCorrectionId, setSelectedCorrectionId] = createSignal<string | undefined>(undefined);
  const [selectedTab, setSelectedTab] = createSignal<string>(localStorage.getItem('wribe.sidebar.apps.selectedTab') || Tabs.CorrectionsList);
  const [appsStore, setAppsStore] = createStore<{ apps: App[] }>({apps: loadApps()});
  const [extractionEvent, setExtractionEvent] = createSignal<ExtractionEvent>();

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
      setExtractionEvent({result: extractionResult, tab: selectedTab()});

      if (selectedTab() === Tabs.CorrectionsList) {
        nlpruleWorker.postMessage({text: extractionResult.text});
      } else {
        setIsChecking(false);
      }
      return {checkId: 'dummyCheckId'};
    },

    configure(configuration: SidebarConfiguration): void {
    },

    init(initParameters: InitParameters): void {
      console.log('initParameters', initParameters);
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
    acrolinxPlugin.onCheckResult({
      checkedPart: {checkId: 'dummyCheckId', range: [0, extractionEvent()!.result.text.length]}
    });
  }

  onMount(() => {
    nlpruleWorker.onmessage = ({data: {eventType, corrections}}) => {
      switch (eventType) {
        case 'loaded':
          setCheckerInitialized(true);
          acrolinxPlugin.onInitFinished({});
          return
        case 'checkFinished':
          setIsChecking(false);
          onCheckResult(corrections);
      }
    };
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
      <header>
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
        </div>

        <Show
          when={needsCheckButton()}>
          <div class="check-button-section">
            <button
              id="checkButton"
              disabled={isChecking() || (selectedTab() === Tabs.CorrectionsList && !isCheckerInitialized())}
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
        <Show when={!isCheckerInitialized() || isChecking()}>
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
            <div class={'tab-panel app-tab-panel'} style={{display: selectedTab() === app.url ? 'block' : 'none'}}>
              <AppPage
                url={app.url}
                extractedText={extractionEvent()?.tab === app.url ? extractionEvent()?.result.text : undefined}
                setAppConfig={setAppConfig}
              />
            </div>}
        </For>
        <div class={'tab-panel'} style={{display: selectedTab() === Tabs.AppsManager ? 'block' : 'none'}}>
          <AppsManager apps={appsStore.apps} addApp={addApp} removeApp={removeApp} setAppEnabled={setAppEnabled}/>
        </div>
      </main>
    </div>
  );
}

export function renderApp() {
  render(() => <Sidebar/>, document.getElementById('app')!);
}
