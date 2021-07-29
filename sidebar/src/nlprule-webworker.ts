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

console.time('Initialize nlprule');
const nlpRuleCheckerEn = wasm.NlpRuleChecker.new();
const nlpRuleCheckerDe = wasm.NlpRuleChecker.new_de();
console.timeEnd('Initialize nlprule');

function onMessage({data: {text, language}}: any) {
  console.time('Check');
  const corrections: CorrectionFromWasm[] = language === 'en'
    ? nlpRuleCheckerEn.check(text)
    : nlpRuleCheckerDe.check(text);
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
