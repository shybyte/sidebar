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
import {createSignal, onMount, Show} from 'solid-js';
import {render} from 'solid-js/web';
import './App.css';
import {CorrectionsList} from './CorrectionsList';
import './index.css';
import {createMessageAdapter} from './message-adapter';
import {Correction} from './nlprule-webworker';

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

function App() {
  const [removedCorrectionIDs, setRemovedCorrectionIDs] = createSignal(new Set<string>());
  const [corrections, setCorrections] = createSignal<Correction[]>([]);
  const [isChecking, setIsChecking] = createSignal(true);
  const [selectedCorrectionId, setSelectedCorrectionId] = createSignal<string | undefined>(undefined);

  let currentDocumentContent = '';

  const acrolinxSidebar: AcrolinxSidebar = {
    checkGlobal(documentContent: string, _options: CheckOptions): Check {
      currentDocumentContent = documentContent;
      nlpruleWorker.postMessage({text: documentContent});
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
      checkedPart: {checkId: 'dummyCheckId', range: [0, currentDocumentContent.length]}
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

  function selectCorrection(correction: Correction) {
    setSelectedCorrectionId(correction.id);
    acrolinxPlugin.selectRanges('dummyCheckId', [{
      content: correction.issueText,
      extractedRange: [correction.span.char.start, correction.span.char.end],
      range: [correction.span.char.start, correction.span.char.end]
    }]);
  }

  function replaceCorrection(correction: Correction, replacement: string) {
    acrolinxPlugin.replaceRanges('dummyCheckId', [{
      content: correction.issueText,
      extractedRange: [correction.span.char.start, correction.span.char.end],
      range: [correction.span.char.start, correction.span.char.end],
      replacement: replacement,
    }]);
    setRemovedCorrectionIDs(new Set(removedCorrectionIDs()).add(correction.id));
  }

  return (
    <>
      <header>
        <button
          id="checkButton"
          disabled={isChecking()}
          onClick={(event) => {
            checkTextInput();
          }}
        >Check
        </button>
      </header>

      <main>
        <Show when={isChecking()}>
          <div id="loadingSpinner" class="lds-dual-ring"/>
        </Show>

        <Show when={corrections().length > 0}>
          <CorrectionsList
            corrections={corrections()}
            selectCorrection={selectCorrection}
            replaceCorrection={replaceCorrection}
            selectedCorrectionId={selectedCorrectionId()}
            removedCorrectionIDs={removedCorrectionIDs()}
          />
        </Show>
      </main>
    </>
  );
}


export function renderApp() {
  render(() => <App/>, document.getElementById('app')!);
}
