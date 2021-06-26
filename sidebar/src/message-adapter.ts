import {AcrolinxPlugin} from '@acrolinx/sidebar-interface';

export function createMessageAdapter(): AcrolinxPlugin {
  addEventListener('message', (messageEvent) => {
    if (messageEvent.source === window.parent) {
      (window as any).acrolinxSidebar[messageEvent.data.command](...messageEvent.data.args);
    }
  }, false);

  return new Proxy({}, {
    get(_target, property) {
      return (...args: unknown[]) => {
        console.log(property, ...args);
        window.parent.postMessage({
          command: property,
          args: args
        }, '*');
      }
    }
  }) as AcrolinxPlugin;
}
