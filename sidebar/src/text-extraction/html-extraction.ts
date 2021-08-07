import * as htmlparser2 from 'htmlparser2';
import {findMatchingExtractionProfile, shouldElementBeIgnored} from './extraction-profile';
import {EXTRACTION_PROFILES} from './extraction-profiles';
import {MappedOffsetRange} from './range-mapping';

export interface ExtractionResult {
  text: string;
  mappedOffsetRanges?: MappedOffsetRange[];
}

interface CurrentlyIgnoredElement {
  name: string;
  depth: number;
}

export function extractTextFromHtml(html: string, documentRef?: string): ExtractionResult {
  let extractedText = '';
  const mappedOffsetRanges: MappedOffsetRange[] = [];

  const extractionProfile = findMatchingExtractionProfile(documentRef, EXTRACTION_PROFILES);
  let currentDepth = 0;
  let currentlyIgnoredElement: CurrentlyIgnoredElement | undefined;

  const parser = new htmlparser2.Parser({
    onopentag(name: string, attribs: { [p: string]: string }) {
      currentDepth += 1;
      if (currentlyIgnoredElement) {
        return;
      } else if (extractionProfile && shouldElementBeIgnored(extractionProfile, name, attribs)) {
        currentlyIgnoredElement = {name, depth: currentDepth};
      }
    },
    onclosetag(name: string) {
      if (currentlyIgnoredElement && currentDepth === currentlyIgnoredElement.depth && name === currentlyIgnoredElement.name) {
        currentlyIgnoredElement = undefined;
      }
      currentDepth -= 1;
    },
    ontext(data: string) {
      if (currentlyIgnoredElement) {
        return;
      }
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
