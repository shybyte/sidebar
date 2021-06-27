import {renderApp} from "./App";

console.log(`Starting Sidebar build number ${process.env.GITHUB_RUN_NUMBER} ...`);
renderApp();
