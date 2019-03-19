import { browser } from 'webextension-polyfill-ts';
import { storage } from './storage';
import { init } from './TabManager';

const STARTUP_DELAY = 2000;

browser.runtime.onInstalled.addListener(async details => {
    console.info(`Installed: reason = ${details.reason}, previousVersion = ${details.previousVersion}`);

    await storage.initDefaults();
});

// Delay to prevent re-ordering tabs on startup.
setTimeout(init, STARTUP_DELAY);
