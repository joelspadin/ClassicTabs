import { browser, Tabs, Windows } from 'webextension-polyfill-ts';
import { storage } from './storage';
import { Message } from './messages';

const MAX_LOG_SIZE = 100;

let startTime: number;
let logItems: string[] = [];

export let enabled = false;

export function init() {
    startTime = Date.now();

    storage.logEnabled.addListener(updateEnabled);
    updateEnabled();

    browser.runtime.onMessage.addListener((message: Message) => {
        switch (message.action) {
            case 'get_log':
                return Promise.resolve(logItems.join('\n'));

            case 'clear_log':
                clearLog();
                break;
        }

        return undefined;
    });
}

export function log(...args: any[]) {
    if (!enabled) {
        return;
    }

    const now = Date.now() - startTime;
    const line = args.map(x => x.toString()).join(' ');

    logItems.push(`[${now}] ${line}`);

    if (logItems.length > MAX_LOG_SIZE) {
        logItems.splice(0, 1);
    }
}

export function clearLog() {
    logItems = [];
}

async function updateEnabled() {
    const newEnabled = await storage.logEnabled.get();

    if (newEnabled != enabled) {
        if (newEnabled) {
            beginLogging();
        } else {
            endLogging();
        }

        enabled = newEnabled;
    }
}

function beginLogging() {
    browser.windows.onCreated.addListener(onWindowCreated);
    browser.windows.onRemoved.addListener(onWindowRemoved);

    browser.tabs.onCreated.addListener(onTabCreated);
    browser.tabs.onRemoved.addListener(onTabRemoved);

    browser.tabs.onActivated.addListener(onTabActivated);
    browser.tabs.onAttached.addListener(onTabAttached);
    browser.tabs.onDetached.addListener(onTabDetached);
    browser.tabs.onMoved.addListener(onTabMoved);
}

function endLogging() {
    browser.windows.onCreated.removeListener(onWindowCreated);
    browser.windows.onRemoved.removeListener(onWindowRemoved);

    browser.tabs.onCreated.removeListener(onTabCreated);
    browser.tabs.onRemoved.removeListener(onTabRemoved);

    browser.tabs.onActivated.removeListener(onTabActivated);
    browser.tabs.onAttached.removeListener(onTabAttached);
    browser.tabs.onDetached.removeListener(onTabDetached);
    browser.tabs.onMoved.removeListener(onTabMoved);

    clearLog();
}

async function onTabActivated(info: Tabs.OnActivatedActiveInfoType) {
    log(`Tab activated: id = ${info.tabId}, window = ${info.windowId}`);
}

async function onTabAttached(id: number, info: Tabs.OnAttachedAttachInfoType) {
    log(`Tab attached: id = ${id}, window = ${info.newWindowId}, pos = ${info.newPosition}`);
}

async function onTabCreated(tab: Tabs.Tab) {
    log(`Tab created: id = ${tab.id}, window = ${tab.windowId}, opener = ${tab.openerTabId}`);
}

async function onTabDetached(id: number, info: Tabs.OnDetachedDetachInfoType) {
    log(`Tab detached: id = ${id}, window = ${info.oldWindowId}, pos = ${info.oldPosition}`);
}

async function onTabMoved(id: number, info: Tabs.OnMovedMoveInfoType) {
    log(`Tab moved: id = ${id}, window = ${info.windowId}, from ${info.fromIndex} to ${info.toIndex}`);
}

async function onTabRemoved(id: number, info: Tabs.OnRemovedRemoveInfoType) {
    log(`Tab removed: id = ${id}, window = ${info.windowId}, is closing? ${info.isWindowClosing}`);
}

function onWindowCreated(window: Windows.Window) {
    log(`Window created: id = ${window.id}`);
}

function onWindowRemoved(id: number) {
    log(`Window removed: id = ${id}`);
}
