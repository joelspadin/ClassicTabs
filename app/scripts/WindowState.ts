
import { browser } from 'webextension-polyfill-ts';

import { HistoryList } from './HistoryList';

export class WindowState {
    public history = new HistoryList();

    private _currentInOrderTab: number | undefined = undefined;
    private _lastInOrderTab: number | undefined = undefined;
    private _currentActiveTabIndex: number | undefined = undefined;
    private _lastActiveTabIndex: number | undefined = undefined;
    private updatingIndex: boolean = false;

    /**
     * Gets the index of the window's active tab.
     */
    public get activeTabIndex() {
        return this._currentActiveTabIndex;
    }

    /**
     * Sets the index of the window's active tab.
     */
    public set activeTabIndex(value: number | undefined) {
        this._lastActiveTabIndex = this._currentActiveTabIndex;
        this._currentActiveTabIndex = value;
    }

    /**
     * Gets the ID of the latest tab opened from the current tab when placing
     * consecutively-opened tabs in consecutive order.
     */
    public get inOrderTab() {
        return this._currentInOrderTab;
    }

    /**
     * Sets the ID of the latest tab opened from the current tab when placing
     * consecutively-opened tabs in consecutive order.
     */
    public set inOrderTab(value: number | undefined) {
        this._lastInOrderTab = this._currentInOrderTab;
        this._currentInOrderTab = value;
    }

    public async addTab(id: number) {
        this.history.add(id);
        this.inOrderTab = id;
        this.updatingIndex = true;

        try {
            const tab = await browser.tabs.get(id);

            // Make sure the current tab hasn't changed since we started.
            if (this.history.first === id) {
                this.activeTabIndex = tab.index;
            }

            this.updatingIndex = false;
        }
        catch (e) {
            console.warn(e);
        }
    }

    public removeTab(id: number) {
        this.history.remove(id);
        if (this.inOrderTab === id) {
            this.inOrderTab = this.history.first;
        }
    }

    public rewind() {
        this.history.rewind();
        this._currentInOrderTab = this._lastInOrderTab;

        // If we get told to rewind while we're still querying the active tab's
        // index, don't rewind the index. We already have the value we should
        // be rewinding to.
        if (!this.updatingIndex) {
            this._currentActiveTabIndex = this._lastActiveTabIndex;
        }
    }
}
