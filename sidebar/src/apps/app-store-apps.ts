export interface AppStoreApp {
  url: string;
  title: string;
  description: string;
}

export const APP_STORE_APPS: readonly AppStoreApp[] = [
  {
    url: 'https://acrolinx.github.io/app-sdk-js/examples/text-extraction/',
    title: 'Text Extraction Demo',
    description: 'App demo that displays the extracted text and the document language.'
  },
  {
    url: 'https://updates.acrolinx.com/dev/sidebar-apps/demo/wordcloud/',
    title: 'WordCloud',
    description: 'App demo that displays an WordCloud for words in the document.'
  },
  {
    url: 'https://updates.acrolinx.com/dev/sidebar-apps/demo/select-ranges/',
    title: 'Select Ranges',
    description: 'App demo for selecting/replacing ranges in the document.'
  }
];
