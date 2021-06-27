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
import {ExtractionResult, extractTextFromHtml} from './html-extraction';
import './index.css';
import {createMessageAdapter} from './message-adapter';
import {Correction, Range} from './nlprule-webworker';
import {mapExtractedRangeToOriginal} from './range-mapping';

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

  let extractionResult: ExtractionResult;

  const acrolinxSidebar: AcrolinxSidebar = {
    checkGlobal(documentContent: string, options: CheckOptions): Check {
      console.log('checkGlobal', documentContent, options);
      extractionResult = options.inputFormat === 'HTML'
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
