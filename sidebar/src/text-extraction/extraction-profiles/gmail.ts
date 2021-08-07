import {ExtractionProfile} from '../extraction-profile';

export const GMAIL: ExtractionProfile = {
  documentReferenceRegExp: /https:\/\/mail.google.com\/.*/,
  ignoredElements: [
    {
      name: 'div',
      attribute: {
        name: 'original-display',
        value: 'hidden'
      }
    },
    {
      name: 'div',
      attribute: {
        name: 'class',
        value: 'gmail_extra'
      }
    },
    {
      name: 'div',
      attribute: {
        name: 'data-smartmail',
        value: 'gmail_signature'
      }
    }
  ]
};
