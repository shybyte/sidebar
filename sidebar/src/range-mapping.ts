import {binarySearchBy} from 'binary-search-by';

export interface MappedOffsetRange {
  original: OffsetRange;
  extracted: OffsetRange;
}

export interface OffsetRange {
  begin: number;
  end: number;
}

/**
 * @param ranges must be sorted by getExtractedBegin
 */
export function mapExtractedRangeToOriginal(
  ranges: readonly MappedOffsetRange[],
  extractedRange: OffsetRange
): MappedOffsetRange[] {
  function findRangeBegin(extractedOffset: number): number {
    const {found, index} = binarySearchBy(ranges, extractedOffset, it => it.extracted.begin);
    return (found) ? index : index - 1;
  }

  const touchedRanges = ranges.slice(
    findRangeBegin(extractedRange.begin),
    findRangeBegin(extractedRange.end - 1) + 1
  );

  const result = cloneDeep(touchedRanges);

  // Truncate first range.
  result[0].extracted.begin = extractedRange.begin;
  result[0].original.begin = extractedRange.begin - touchedRanges[0].extracted.begin
    + touchedRanges[0].original.begin;

  // Truncate last range.
  const last = result.length - 1;
  result[last].extracted.end = extractedRange.end;
  result[last].original.end = extractedRange.end - touchedRanges[last].extracted.begin
    + touchedRanges[last].original.begin;

  return result;
}

export const cloneDeep = <T>(x: T): T => JSON.parse(JSON.stringify(x));
