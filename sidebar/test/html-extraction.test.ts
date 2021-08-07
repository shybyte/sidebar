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

  it('with extraction profile', () => {
    const extractionResult = extractTextFromHtml(`
      <div original-name="at" original-source="input" original-display="hidden">
        AF6bupO8UJWG4zobdqvTE9f9Dxo4TxQjvA
      </div>
      <div>
        This is a test.
      </div>
    `, 'https://mail.google.com/mail/u/0/#inbox?compose=Cllg');
    expect(extractionResult.text.trim()).toEqual('This is a test.');
  });
});

