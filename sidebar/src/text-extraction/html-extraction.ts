import * as htmlparser2 from 'htmlparser2';
import {MappedOffsetRange} from './range-mapping';

export interface ExtractionResult {
  text: string;
  mappedOffsetRanges?: MappedOffsetRange[];
}

export function extractTextFromHtml(html: string): ExtractionResult {
  let extractedText = '';
  const mappedOffsetRanges: MappedOffsetRange[] = [];

  const parser = new htmlparser2.Parser({
    ontext(data: string) {
      const range: MappedOffsetRange = {
        original: {
          begin: parser.startIndex,
          end: parser.endIndex! + 1,
        },
        extracted: {begin: extractedText.length, end: extractedText.length + data.length}
      }
      mappedOffsetRanges.push(range);
      extractedText += data;
    },
  });

  parser.end(html);

  return {
    text: extractedText,
    mappedOffsetRanges
  }
}
