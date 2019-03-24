import { browser } from 'webextension-polyfill-ts';
import { storage } from './storage';
import * as TabManager from './TabManager';
import * as logger from './logger';

browser.runtime.onInstalled.addListener(async details => {
    console.info(`Installed: reason = ${details.reason}, previousVersion = ${details.previousVersion}`);

    await storage.initDefaults();
});

// Delay to prevent re-ordering tabs on startup.
(async function() {
    setTimeout(() => {
        logger.init();
        TabManager.init();
    }, await storage.startupDelay.get());
}());
