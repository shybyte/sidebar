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
import {createSignal, For, onMount, Show} from 'solid-js';
import {render} from 'solid-js/web';
import {App, loadApps, saveApps} from './app-storage';
import {AppPage} from './AppPage';
import {AppsManager} from './AppsManager';
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

function Sidebar() {
  const [removedCorrectionIDs, setRemovedCorrectionIDs] = createSignal(new Set<string>());
  const [corrections, setCorrections] = createSignal<Correction[]>([]);
  const [isChecking, setIsChecking] = createSignal(true);
  const [selectedCorrectionId, setSelectedCorrectionId] = createSignal<string | undefined>(undefined);
  const [selectedTab, setSelectedTab] = createSignal<string>(Tabs.CorrectionsList);
  const [apps, setApps] = createSignal<App[]>(loadApps());

  let extractionResult: ExtractionResult;

  const acrolinxSidebar: AcrolinxSidebar = {
    checkGlobal(documentContent: string, options: CheckOptions): Check {
      console.log('checkGlobal', documentContent, options);
      extractionResult = (
        options.inputFormat === 'HTML' ||
        (documentContent.startsWith('<!DOCTYPE browserHtmlAcrolinx') && options.inputFormat === 'AUTO')
      )
        ? extractTextFromHtml(documentContent)
        : {text: documentContent};
      nlpruleWorker.postMessage({text: extractionResult.text});
      console.log('extractionResult', extractionResult);
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
      checkedPart: {checkId: 'dummyCheckId', range: [0, extractionResult.text.length]}
    });
  }

  onMount(() => {
    nlpruleWorker.onmessage = ({data: {eventType, corrections}}) => {
      switch (eventType) {
        case 'loaded':
          setIsChecking(false);
          acrolinxPlugin.onInitFinished({});
          return
        case 'checkFinished':
          setIsChecking(false);
          onCheckResult(corrections);
      }
    };
  });


  function calculateOriginalRange(range: Range): [number, number] {
    if (extractionResult.mappedOffsetRanges) {
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
    const newApps = apps().concat({url});
    saveApps(newApps);
    setApps(newApps);
  }

  function removeApp(url: string) {
    const newApps = apps().filter(app => app.url !== url);
    saveApps(newApps);
    setApps(newApps);
  }

  return (
    <div class="sidebar">
      <header>
        <div class={'tabs'}>
          <button
            onClick={() => {
              setSelectedTab(Tabs.CorrectionsList)
            }}
            aria-selected={selectedTab() === Tabs.CorrectionsList}
            title="Corrections"
          ><CheckIcon/></button>
          <For each={apps()}>
            {app => <button
              onClick={() => {
                setSelectedTab(app.url)
              }}
              aria-selected={selectedTab() === app.url}
              title={app.url}
            ><img src={app.url + 'acrolinx-app-icon.svg'} alt=""/></button>}
          </For>
          <button
            onClick={() => {
              setSelectedTab(Tabs.AppsManager)
            }}
            aria-selected={selectedTab() === Tabs.AppsManager}
            title="Add & Manage Apps"
          ><ExtensionIcon/></button>
        </div>

        <Show when={selectedTab() === Tabs.CorrectionsList}>
          <div class="check-button-section">
            <button
              id="checkButton"
              disabled={isChecking()}
              onClick={(event) => {
                checkTextInput();
              }}
            >Check
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
        <For each={apps()}>
          {app =>
            <div class={'tab-panel app-tab-panel'} style={{display: selectedTab() === app.url ? 'block' : 'none'}}>
              <AppPage url={app.url}/>
            </div>}
        </For>
        <div class={'tab-panel'} style={{display: selectedTab() === Tabs.AppsManager ? 'block' : 'none'}}>
          <AppsManager apps={apps()} addApp={addApp} removeApp={removeApp} />
        </div>
      </main>
    </div>
  );
}

export function renderApp() {
  render(() => <Sidebar/>, document.getElementById('app')!);
}
