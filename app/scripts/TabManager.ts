import { browser, Windows, Tabs } from 'webextension-polyfill-ts';
import { storage, StorageItems } from './storage';
import { WindowState } from './WindowState';
import * as keys from './keys';

let settings: StorageItems;
let windowStates: Record<number, WindowState> = {};
let activeChanged = false;

export async function init() {
    // Keep a local cache of settings so we don't need to await them.
    settings = await storage.get();
    storage.addListener(async () => {
        settings = await storage.get();
    });

    await initActiveTabs();

    browser.windows.onCreated.addListener(onWindowCreated);
    browser.windows.onRemoved.addListener(onWindowRemoved);

    browser.tabs.onCreated.addListener(onTabCreated);
    browser.tabs.onRemoved.addListener(onTabRemoved);

    browser.tabs.onActivated.addListener(onTabActivated);
    browser.tabs.onAttached.addListener(onTabAttached);
    browser.tabs.onDetached.addListener(onTabDetached);
    browser.tabs.onMoved.addListener(onTabMoved);
}

async function focusTab(tab: Tabs.Tab | number) {
    let id: number;

    if (typeof tab === 'number') {
        id = tab;
    } else {
        if (tab.id === undefined) {
            console.warn('Cannot focus tab with no ID:', tab);
            return;
        }

        id = tab.id;
    }

    await browser.tabs.update(id, { active: true });
}

async function getNextTabPosition(neighbor: Tabs.Tab | number) {
    if (typeof neighbor === 'number') {
        neighbor = await browser.tabs.get(neighbor);
    }

    return {
        index: neighbor.index + 1,
        windowId: neighbor.windowId,
    };
}

function getWindowState(id: number) {
    let state = windowStates[id];
    if (!state) {
        state = new WindowState();
        windowStates[id] = state;
    }

    return state;
}

async function initActiveTabs() {
    const activeTabs = await browser.tabs.query({ active: true});

    for (const tab of activeTabs) {
        if (tab.windowId === undefined || tab.id == undefined) {
            continue;
        }

        const state = getWindowState(tab.windowId);
        state.addTab(tab.id);
    }
}

/**
 * Gets whether a key is held which the user has set as an exception to
 * focusing all new tabs.
 */
function isFocusExceptionKeyHeld() {
    return (settings.exceptCtrl && keys.ctrl) || (settings.exceptShift && keys.shift);
}

function isStartPage(tab: Tabs.Tab) {
    // TODO: add support for browsers other than Opera.
    return tab.url && tab.url == 'opera://startpage';
}

async function moveNextToActive(tab: Tabs.Tab, windowId?: number) {
    if (tab.id === undefined) {
        console.warn('Cannot move tab with no ID:', tab);
        return;
    }

    if (windowId === undefined) {
        windowId = tab.windowId;

        if (windowId === undefined) {
            console.warn('Cannot move next to active tab with no window:', tab);
            return;
        }
    }

    const state = getWindowState(windowId);
    let active = state.history.first;

    // If we are opening tabs in order, place the tab next to the last tab
    // we opened instead of next to its opener.
    if (settings.openInOrder && state.inOrderTab !== undefined) {
        if (tab.openerTabId === active) {
            try {
                const prevTab = await browser.tabs.get(state.inOrderTab);
                active = prevTab.id;
            }
            catch (e) {
                console.warn(e);
            }
        }
    }

    if (active !== undefined) {
        await moveNextToTab(tab, active);
        state.inOrderTab = tab.id;
    }
}

async function moveNextToTab(tab: Tabs.Tab, neighbor: Tabs.Tab | number) {
    if (tab.id === undefined) {
        console.warn('Cannot move tab with no ID:', tab);
        return;
    }

    const pos = await getNextTabPosition(neighbor);

    if (pos.windowId === undefined) {
        console.warn('Cannot move next to tab with no window:', neighbor);
        return;
    }

    if (tab.index !== pos.index || tab.windowId !== pos.windowId) {
        await browser.tabs.move(tab.id, pos);
    }
}

async function moveToEnd(tab: Tabs.Tab, windowId?: number) {
    if (tab.id === undefined) {
        console.warn('Cannot move tab with no ID:', tab);
        return;
    }

    if (windowId === undefined) {
        windowId = tab.windowId;

        if (windowId === undefined) {
            console.warn('Cannot move to end with no window:', tab);
            return;
        }
    }

    await browser.tabs.move(tab.id, { index: -1, windowId });
}

async function moveToWindow(tab: Tabs.Tab, windowId: number) {
    if (tab.id === undefined) {
        console.warn('Cannot move tab with no ID:', tab);
        return;
    }

    switch (settings.onOpen) {
        case 'nextToActive':
            await moveNextToActive(tab, windowId);
            break;

        case 'atEnd':
            await moveToEnd(tab, windowId);
            break;

        case 'otherAtEnd':
            if (isStartPage(tab)) {
                await moveNextToActive(tab, windowId);
            } else {
                await moveToEnd(tab, windowId);
            }
            break;

        default:
        case 'default':
            if (isStartPage(tab)) {
                await moveToEnd(tab, windowId);
            } else {
                await moveNextToActive(tab, windowId);
            }
            break;
    }
}

async function onTabActivated(info: Tabs.OnActivatedActiveInfoType) {
    const state = getWindowState(info.windowId);
    state.addTab(info.tabId);
    state.inOrderTab = info.tabId;

    // Set a variable to make it easier to tell if a tab removed message
    // directly follows a tab activated message.
    activeChanged = true;
    await wait(settings.activeChangedTimeout);
    activeChanged = false;
}

async function onTabAttached(id: number, info: Tabs.OnAttachedAttachInfoType) {
    const state = getWindowState(info.newWindowId);
    state.addTab(id);
}

async function onTabCreated(tab: Tabs.Tab) {
    await positionNewTab(tab);
    await positionNewWindowTab(tab);

    if (shouldFocusNewTab(tab)) {
        await focusTab(tab);
    }
}

async function onTabDetached(id: number, info: Tabs.OnDetachedDetachInfoType) {
    const state = getWindowState(info.oldWindowId);
    state.removeTab(id);
}

async function onTabMoved(_id: number, info: Tabs.OnMovedMoveInfoType) {
    const state = getWindowState(info.windowId);

    if (state.activeTabIndex === info.fromIndex) {
        state.activeTabIndex = info.toIndex;
    }
}

async function onTabRemoved(id: number, info: Tabs.OnRemovedRemoveInfoType) {
    const state = getWindowState(info.windowId);

    // Since we don't have a good way of determining whether the removed tab was
    // previously the active tab, make an educated guess based on the fact that
    // the browser will focus some other tab before we get this message, so the
    // removed tab will be the second most-recent tab in the window's history.
    const wasActive = activeChanged && state.history.second === id;

    // If we are overriding which tab gets focused after removing a tab, and the
    // removed tab was active, rewind the state by one because the browser will
    // focus some other tab before telling us a tab was removed.
    if (wasActive && settings.onClose !== 'default') {
        state.rewind();
    }

    state.removeTab(id);

    // If the removed tab was active, override which tab gets focus next.
    if (wasActive) {
        switch (settings.onClose) {
            case 'lastfocused':
                const newTab = state.history.first;
                if (newTab !== undefined) {
                    await focusTab(newTab);
                }
                break;

            case 'next':
            case 'previous':
                // If 'next', the next tab will be in the closing tab's old position.
                // If 'previous', focus the tab right before that, or the leftmost tab.
                let index = state.activeTabIndex;
                if (index !== undefined) {
                    if (settings.onClose === 'previous') {
                        index = Math.max(0, index - 1);
                    }

                    const tabs = await browser.tabs.query({ windowId: info.windowId, index });
                    if (tabs.length > 0) {
                        await focusTab(tabs[0]);
                    }
                }
                break;
        }
    }
}

function onWindowCreated(window: Windows.Window) {
    if (window.id === undefined) {
        return;
    }

    if (window.tabs) {
        const state = getWindowState(window.id);

        for (const tab of window.tabs.filter(tab => tab.active)) {
            if (tab.id === undefined) {
                continue;
            }

            state.addTab(tab.id);
            state.inOrderTab = tab.id;
        }
    }
}

function onWindowRemoved(id: number) {
    if (id in windowStates) {
        delete windowStates[id];
    }
}

async function positionNewTab(tab: Tabs.Tab) {
    switch (settings.onOpen) {
        case 'nextToActive':
            await moveNextToActive(tab);
            break;

        case 'atEnd':
            await moveToEnd(tab);
            break;

        case 'otherAtEnd':
            if (isStartPage(tab)) {
                await moveNextToActive(tab);
            } else {
                await moveToEnd(tab);
            }
            break;
    }
}

async function positionNewWindowTab(tab: Tabs.Tab) {
    if (tab.openerTabId === undefined || tab.windowId === undefined) {
        return;
    }

    if (shouldPreventNewWindow()) {
        try {
            const opener = await browser.tabs.get(tab.openerTabId);
            if (opener.windowId === undefined) {
                return;
            }

            if (tab.windowId != opener.windowId) {
                await moveToWindow(tab, opener.windowId);
                // TODO: focus tab here?
            }
        }
        catch (e) {
            console.warn(e);
        }
    }
}

function shouldFocusNewTab(tab: Tabs.Tab) {
    return !tab.active
        && tab.openerTabId !== undefined
        && settings.focusOnOpen === 'always'
        && !isFocusExceptionKeyHeld();

}

function shouldPreventNewWindow() {
    return settings.preventWindowPopups
        || (settings.preventNewWindow && keys.shift);
}

function wait(milliseconds: number) {
    return new Promise(resolve => {
        setTimeout(() =>{
            resolve();
        }, milliseconds);
    });
}
