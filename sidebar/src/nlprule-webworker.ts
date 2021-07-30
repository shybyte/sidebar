import * as wasm from '../../nlprule-wasm/pkg';

export interface Correction extends CorrectionFromWasm {
  id: string;
  issueText: string;
}

export interface CorrectionFromWasm {
  source: string;
  message: string;
  span: Span;
  replacements: string[];
}


export interface Span {
  byte: Range;
  char: Range;
}

export interface Range {
  start: number;
  end: number;
}

self.onmessage = onMessage;
self.postMessage({eventType: 'loaded'});

console.time('Initialize nlprule');
const nlpRuleChecker = self.name === 'en' ? wasm.NlpRuleChecker.new() : wasm.NlpRuleChecker.new_de();
console.timeEnd('Initialize nlprule');

function onMessage({data: {text}}: any) {
  console.time('Check');
  const corrections: CorrectionFromWasm[] = nlpRuleChecker.check(text);
  console.timeEnd('Check');

  const correctionsResult: Correction[] = corrections.map((it, i) => ({
    ...it,
    id: 'id_' + i,
    issueText: text.slice(it.span.char.start, it.span.char.end)
  }));

  self.postMessage({
    eventType: 'checkFinished',
    corrections: correctionsResult,
  });
}
