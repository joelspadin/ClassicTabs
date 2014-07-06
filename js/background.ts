/// <reference path="settings.ts" />
/// <reference path="lib/chrome.d.ts" />

module manager {
	var SHIFT = 16;
	var CTRL = 17;

	var ACTIVE_CHANGED_TIMEOUT = 100;
	var STARTUP_DELAY = 1000;

	export var windows: { [key: number]: WindowState; };
	export var ctrlDown: boolean;
	export var shiftDown: boolean;
	export var activeChanged: boolean;

	export function init() {
		ctrlDown = false;
		shiftDown = false;
		activeChanged = false;

		windows = {};

		chrome.runtime.onMessage.addListener(_onMessage);

		// Set up initial state and event handlers after a short delay
		setTimeout(() => {
			_createWindowStates(_updateActiveTabs);

			chrome.windows.onCreated.addListener(_onWindowCreated);
			chrome.windows.onRemoved.addListener(_onWindowRemoved);

			chrome.tabs.onCreated.addListener(_onTabCreated);
			chrome.tabs.onCreated.addListener(_onTabCreated);
			chrome.tabs.onRemoved.addListener(_onTabRemoved);
			chrome.tabs.onActivated.addListener(_onTabActivated);
			chrome.tabs.onDetached.addListener(_onTabDetached);
			chrome.tabs.onAttached.addListener(_onTabAttached);
		}, STARTUP_DELAY);
	}

	export function onInstall() {
		settings.init();
	}

	function _createWindowStates(callback?: Function) {
		chrome.windows.getAll(w => {
			w.forEach(window => {
				if (!(window.id in manager.windows)) {
					manager.windows[window.id] = new WindowState();
				}
			});

			if (callback) {
				callback();
			}
		});
	}

	function _deleteWindowState(windowId: number) {
		if (windowId in manager.windows) {
			delete manager.windows[windowId];
		}
	}

	function _getNextTabIndex(neighbor: Tab, callback: (index: chrome.tabs.MoveProperties) => void);
	function _getNextTabIndex(neighborId: number, callback: (index: chrome.tabs.MoveProperties) => void);
	function _getNextTabIndex(neighbor: any, callback: (index: chrome.tabs.MoveProperties) => void) {
		var index: chrome.tabs.MoveProperties = {
			index: -1,
			windowId: -1
		};

		if (neighbor === null) {
			callback(null);
		} else if (typeof (neighbor) === 'number') {
			chrome.tabs.get(<number>neighbor, (tab) => {
				index.index = tab.index + 1;
				index.windowId = tab.windowId;
				callback(index);
			});
		} else {
			var tab = <Tab>neighbor;
			index.index = tab.index + 1;
			index.windowId = tab.windowId;
			callback(index);
		}
	}

	function _getWindowState(windowId: number) {
		var state = manager.windows[windowId];
		if (!state) {
			state = new WindowState();
			manager.windows[windowId] = state;
		}
		return state;
	}

	function _isSpeedDial(tab: Tab) {
		var a = document.createElement('a');
		a.href = tab.url;
		return a.protocol === 'opera:' && a.hostname === 'startpage';
	}

	function _updateActiveTabs(callback?: Function) {
		chrome.tabs.query({ active: true }, tabs => {
			tabs.forEach(tab => {
				_getWindowState(tab.windowId).add(tab.id);
			});

			if (callback) {
				callback();
			}
		});
	}

	/* Tab movement functions */

	function _handleNewTab(tab: Tab) {
		switch (settings.onOpen) {
			case 'nextToActive':
				// Open all tabs next to the active tab
				_moveNextToActive(tab);
				break;

			case 'atEnd':
				// Move all tabs to the end
				_moveToEnd(tab);
				break;

			case 'otherAtEnd':
				// Open everything but Speed Dial to the end
				if (_isSpeedDial(tab)) {
					_moveNextToActive(tab);
				} else {
					_moveToEnd(tab);
				}
				break;
		}
	}

	function _handleNewWindowTab(tab: Tab) {
		if (tab.openerTabId !== undefined) {
			// If preventing all new windows or tab created while holding
			// shift, check if it opened in a new window and move it back.
			if (settings.preventWindowPopups || (settings.preventNewWindow && shiftDown)) {
				chrome.tabs.get(tab.openerTabId, opener => {
					if (tab.windowId != opener.windowId) {
						_moveToOpenerWindow(tab, opener);
					}
				});
			}
		}
	}

	function _moveNextToActive(tab: Tab, windowId?: number, callback?: (tab: Tab) => any) {
		if (typeof windowId === 'undefined') {
			windowId = tab.windowId;
		}

		var state = _getWindowState(windowId);
		var neighbor = state.history.first;

		if (settings.openInOrder && state.inOrderTab !== null) {
			// If we are opening tabs in order, place the new tab
			// next to the last tab we opened instead of next to
			// its opener.
			chrome.tabs.get(state.inOrderTab, prevTab => {
				if (tab && prevTab && tab.openerTabId === state.history.first) {
					neighbor = prevTab.id;
				}
				_moveNextToTab(tab, neighbor, callback);
				state.inOrderTab = tab.id;
			});
		} else {
			_moveNextToTab(tab, neighbor, callback);
		}
	}

	function _moveNextToTab(tab: Tab, neighbor: Tab, callback?: (tab: Tab) => any);
	function _moveNextToTab(tab: Tab, neighborId: number, callback?: (tab: Tab) => any);
	function _moveNextToTab(tab: Tab, neighbor: any, callback?: (tab: Tab) => any) {
		if (neighbor === null) {
			return;
		}

		_getNextTabIndex(neighbor, index => {
			if (tab.index !== index.index || tab.windowId !== index.windowId) {
				chrome.tabs.move(tab.id, index, callback);
			}
		});
	}

	function _moveToEnd(tab: Tab, windowId?: number, callback?: (tab: Tab) => any) {
		if (typeof (windowId) === 'undefined') {
			windowId = tab.windowId;
		}
		chrome.tabs.move(tab.id, { index: -1, windowId: windowId }, callback);
	}

	function _moveToOpenerWindow(tab: Tab, opener: Tab) {
		function _focus(tab: Tab) {
			chrome.tabs.update(tab.id, { active: true });
		}

		switch (settings.onOpen) {
			case 'nextToActive':
				_moveNextToActive(tab, opener.windowId, _focus);
				break;

			case 'atEnd':
				_moveToEnd(tab, opener.windowId, _focus);
				break;

			case 'otherAtEnd':
				if (_isSpeedDial(tab)) {
					_moveNextToActive(tab, opener.windowId, _focus);
				} else {
					_moveToEnd(tab, opener.windowId, _focus);
				}
				break;

			case 'default':
				if (_isSpeedDial(tab)) {
					_moveToEnd(tab, opener.windowId, _focus);
				} else {
					_moveNextToActive(tab, opener.windowId, _focus);
				}
				break;
		}
	}

	/* Event handlers */

	function _onMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: Function) {
		switch (message.action) {
			case 'up':
				if (message.key === CTRL) {
					ctrlDown = false;
				} else if (message.key === SHIFT) {
					shiftDown = false;
				}
				break;

			case 'down':
				if (message.key === CTRL) {
					ctrlDown = true;
				} else if (message.key === SHIFT) {
					shiftDown = true;
				}
				break;
		}
	}

	function _onTabActivated(activeInfo: chrome.tabs.TabActiveInfo) {
		var state = _getWindowState(activeInfo.windowId);
		state.add(activeInfo.tabId);
		state.inOrderTab = activeInfo.tabId;

		// Set a variable to make it easier to tell if a tab removed message
		// directly follows a tab activated message.
		manager.activeChanged = true;
		setTimeout(() => {
			manager.activeChanged = false;
		}, ACTIVE_CHANGED_TIMEOUT);

		log('activate tab ' + activeInfo.tabId, state.history.toString());
	}

	function _onTabAttached(tabId: number, attachInfo: chrome.tabs.TabAttachInfo) {
		var state = _getWindowState(attachInfo.newWindowId);
		state.add(tabId);
		log('attach tab ' + tabId, state.history.toString());
	}

	function _onTabCreated(tab: Tab) {
		log('create tab ' + tab.id);

		_handleNewTab(tab);
		_handleNewWindowTab(tab);

		// If we want to focus all opened tabs...
		if (settings.focusOnOpen === 'always') {
			// and the tab isn't focused and was opened by another tab...
			if (!tab.active && tab.openerTabId !== undefined) {
				// and we aren't holding one of the exception keys
				if ((settings.exceptCtrl && ctrlDown) || (settings.exceptShift && shiftDown)) {
					return;
				}
				// focus the tab
				chrome.tabs.update(tab.id, { active: true });
			}
		}
	}

	function _onTabDetached(tabId: number, detachInfo: chrome.tabs.TabDetachInfo) {
		var state = _getWindowState(detachInfo.oldWindowId);
		state.remove(tabId);

		log('detach tab ' + tabId, state.history.toString());
	}

	function _onTabRemoved(tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) {
		var state = _getWindowState(removeInfo.windowId);
		var mode = settings.onClose;

		// Since we don't have a good way of determining whether the removed tab
		// was previously the active tab, make an educated guess based on the fact
		// that Opera will focus some other tab before we get this message, so the
		// removed tab will be the second most-recent tab in the window's history.
		var wasActive = manager.activeChanged && state.history.second === tabId;

		// If we are overriding which tab gets focused after removing a tab, and
		// the removed tab was active, rewind the state by one because Opera will
		// focus some other tab before telling us a tab was removed.
		if (mode !== 'default' && wasActive) {
			state.rewind();
			log('rewind', state.history.toString());
		}

		state.remove(tabId);
		log('remove tab ' + tabId, state.history.toString());

		// If the removed tab was active, change the tab that gets focus.
		if (wasActive) {
			switch (mode) {
				case 'lastfocused':
					var newTab = state.history.first;
					if (newTab !== null) {
						log('focus ' + newTab);
						chrome.tabs.update(newTab, { active: true });
					}
					break;

				case 'next':
				case 'previous':
					var index = state.currentTabIndex;

					if (index !== null) {
						// If mode is 'previous', focus the tab in the closing tab's old position.
						// If mode is 'next', focus the tab right after that.
						if (mode === 'next') {
							index += 1;
						}

						var query = {
							windowId: removeInfo.windowId,
							index: index
						};

						chrome.tabs.query(query, tabs => {
							if (tabs.length > 0) {
								chrome.tabs.update(tabs[0].id, { active: true });
							}
						});
					}
					break;
			}
		}

		// TODO: apply tab removal logic here and add newly focused tab to history.
	}

	function _onWindowCreated(window: BrowserWindow) {
		var state = _getWindowState(window.id);

		// Update the history with the active tab, if any are active yet
		if (window.tabs) {
			window.tabs.filter(tab => tab.active)
				.forEach(tab => {
					state.add(tab.id);
					state.inOrderTab = tab.id;
				});
		}

		log('window created ' + window.id, state.history.toString());
	}

	function _onWindowRemoved(windowId: number) {
		_deleteWindowState(windowId);
		log('window deleted ' + windowId);
	}
}

module commands {
	var COMMANDS = {
		"tab_left": cycleTabLeft,
		"tab_right": cycleTabRight
	};

	export function init() {
		chrome.commands.onCommand.addListener(_onCommand);
	}

	export function cycleTabLeft() {
		chrome.tabs.query({ currentWindow: true, active: true }, results => {
			if (results.length == 0) {
				return;
			}

			var current = results[0];

			chrome.tabs.query({ windowId: current.windowId }, tabs => {
				var focusTab: Tab = null;
				var rightTab: Tab = null;
				var rightIndex = -1;

				// Find the next tab to the left
				for (var i = 0; i < tabs.length; ++i) {
					if (tabs[i].index === current.index - 1) {
						focusTab = tabs[i];
						break;
					}

					if (tabs[i].index > rightIndex) {
						rightTab = tabs[i];
						rightIndex = rightTab.index;
					}
				}

				// If no tab found, wrap to the last tab on the right
				if (focusTab === null) {
					focusTab = rightTab;
				}

				chrome.tabs.update(focusTab.id, { active: true });
			});
		});
	}

	function cycleTabRight() {
		chrome.tabs.query({ currentWindow: true, active: true }, (results?) => {
			if (results.length == 0) {
				return;
			}

			var current = results[0];

			chrome.tabs.query({ windowId: current.windowId }, (tabs) => {
				var focusTab: Tab = null;
				var leftTab: Tab = null;

				// Find the next tab to the right
				for (var i = 0; i < tabs.length; ++i) {
					if (tabs[i].index === current.index + 1) {
						focusTab = tabs[i];
						break;
					}

					if (tabs[i].index === 0) {
						leftTab = tabs[i];
					}
				}

				// If no tab found, wrap to the first tab on the left
				if (focusTab === null) {
					focusTab = leftTab;
				}

				chrome.tabs.update(focusTab.id, { active: true });
			})
		});
	}

	function _onCommand(command: string) {
		var callback = COMMANDS[command];
		if (callback) {
			callback.call(null);
		} else {
			console.error('Unknown keyboard command: ' + command);
		}
	}
}

function log(...args: any[]) {
	if (log.enabled) {
		console.log.apply(null, args);
	}
}

module log {
	export var enabled = false;
}

/* Initialization */

chrome.runtime.onInstalled.addListener(manager.onInstall);
manager.init();
commands.init();

/* Classes and Interfaces */

interface Tab extends chrome.tabs.Tab { };
interface BrowserWindow extends chrome.windows.Window { };

class WindowState {
	private _currentInOrderTab: number;
	private _lastInOrderTab: number;
	private _currentTabIndex: number;
	private _lastTabIndex: number;

	public history: HistoryList;

	public get currentTabIndex() {
		return this._currentTabIndex;
	}
	public set currentTabIndex(newTab: number) {
		this._lastTabIndex = this._currentTabIndex;
		this._currentTabIndex = newTab;
	}

	public get inOrderTab() {
		return this._currentInOrderTab;
	}
	public set inOrderTab(newTab: number) {
		this._lastInOrderTab = this._currentInOrderTab;
		this._currentInOrderTab = newTab;
	}

	constructor() {
		this.history = new HistoryList();
		this._currentInOrderTab = null;
		this._lastInOrderTab = null;
		this._currentTabIndex = null;
		this._lastTabIndex = null;

		this.inOrderTab = null;
	}

	public add(id: number) {
		this.history.add(id);
		this.inOrderTab = id;

		chrome.tabs.get(id, tab => {
			// make sure the current tab hasn't changed
			// since we started this call.
			if (this.history.first === id) {
				this.currentTabIndex = tab.index;
			}
		});
	}

	public remove(id: number) {
		this.history.remove(id);
		if (this.inOrderTab === id) {
			this.inOrderTab = this.history.first;
		}
	}

	public rewind() {
		this.history.rewind();
		this._currentInOrderTab = this._lastInOrderTab;
		this._currentTabIndex = this._lastTabIndex;
	}
}

class HistoryList {
	private items: number[] = [];
	private _lastItems: number[] = [];

	get first(): number {
		return this.items.length > 0 ? this.items[0] : null;
	}

	get second(): number {
		return this.items.length > 1 ? this.items[1] : null;
	}

	public add(id: number) {
		this._copyState();
		this.remove(id);
		this.items.unshift(id);
	}

	public remove(id: number) {
		var existing = this.items.indexOf(id);
		if (existing >= 0) {
			this.items.splice(existing, 1);
		}
	}

	public rewind() {
		this.items = this._lastItems;
		this._copyState();
	}

	public toString() {
		return this.items.join(', ');
	}

	private _copyState() {
		this._lastItems = this.items.slice();
	}
}