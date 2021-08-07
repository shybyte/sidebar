import {extractTextFromHtml} from '../src/text-extraction/html-extraction';

describe('extractHtml', () => {
  it('simple', () => {
    const extractionResult = extractTextFromHtml('This is a <b>test</b>.');
    expect(extractionResult.text).toEqual('This is a test.');
    expect(extractionResult.mappedOffsetRanges).toEqual([
      {
        'extracted': {
          'begin': 0,
          'end': 10
        },
        'original': {
          'begin': 0,
          'end': 10
        }
      },
      {
        'extracted': {
          'begin': 10,
          'end': 14
        },
        'original': {
          'begin': 13,
          'end': 17
        }
      },
      {
        'extracted': {
          'begin': 14,
          'end': 15
        },
        'original': {
          'begin': 21,
          'end': 22
        }
      }
    ]);
  });
});

