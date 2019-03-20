import { browser } from 'webextension-polyfill-ts';
import { storage } from './storage';
import { init } from './TabManager';

browser.runtime.onInstalled.addListener(async details => {
    console.info(`Installed: reason = ${details.reason}, previousVersion = ${details.previousVersion}`);

    await storage.initDefaults();
});

// Delay to prevent re-ordering tabs on startup.
(async function() {
    setTimeout(init, await storage.startupDelay.get());
}());
