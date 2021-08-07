export interface IgnoredElementRule {
  name: string;
  attribute: {
    name: string;
    value: string;
  }
}


export interface ExtractionProfile {
  documentReferenceRegExp: RegExp;
  ignoredElements: IgnoredElementRule[];
}

export function findMatchingExtractionProfile(documentReference: string | undefined, profiles: ExtractionProfile[]) {
  if (documentReference) {
    return profiles.find(it => it.documentReferenceRegExp.test(documentReference));
  } else {
    return undefined;
  }
}

export function shouldElementBeIgnored(profile: ExtractionProfile, elementName: string, attributes: Record<string, string>): boolean {
  return profile.ignoredElements.some(it => it.name === elementName && attributes[it.attribute.name] === it.attribute.value);
}
