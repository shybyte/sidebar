import unionize, {ofType, UnionOf} from 'unionize';

export type LanguageId = string;

export interface AnalysisResult {
  type: 'analysisResult';
  sidebarCheckId: string;
  languageId: LanguageId;
  reports: ReportsForApp;
}

export type ReportsForApp = {
  extractedText: { content: string };
};

export const AppMessages = unionize({
  openWindow: ofType<{ url: string }>(),
  configureAddon: ofType<{ config: AppConfig }>(),
  selectRanges: ofType<SelectRangesMessage>(),
  replaceRanges: ofType<ReplaceRangesMessage>(),
}, {
  tag: 'command'
});

export type AppMessage = UnionOf<typeof AppMessages>;

export interface AppConfig {
  title: string;
  button?: AppButtonConfig;
  requires: AppApiCapability[];
  requiredReportLinks: readonly AnalysisType[];
  requiredReportContent: readonly AnalysisType[];
  appSignature: string;
}

export interface AppButtonConfig {
  text: string;
  tooltip?: string;
}

export enum AppApiCapability {
  selectRanges = 'selectRanges',
  replaceRanges = 'replaceRanges',
}

export enum AnalysisType {
  extractedText = 'extractedText',
}

export interface SelectRangesMessage {
  ranges: AppRange[];
}

export interface AppRange {
  begin: number;
  end: number;
}

export interface AppRangeWithReplacement extends AppRange {
  replacement: string;
}

export interface ReplaceRangesMessage {
  ranges: AppRangeWithReplacement[];
}

export const APP_COMMAND_PREFIX = 'acrolinx.sidebar.';

export interface App {
  url: string;
  appConfig?: AppConfig;
}
