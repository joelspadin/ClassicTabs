/// <reference path="settings.ts" />
/// <reference path="lib/chrome.d.ts" />
var manager;
(function (manager) {
    var SHIFT = 16;
    var CTRL = 17;

    var ACTIVE_CHANGED_TIMEOUT = 100;
    var STARTUP_DELAY = 1000;

    manager.windows;
    manager.ctrlDown;
    manager.shiftDown;
    manager.activeChanged;

    function init() {
        manager.ctrlDown = false;
        manager.shiftDown = false;
        manager.activeChanged = false;

        manager.windows = {};

        chrome.runtime.onMessage.addListener(_onMessage);

        // Set up initial state and event handlers after a short delay
        setTimeout(function () {
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
    manager.init = init;

    function onInstall() {
        settings.init();
    }
    manager.onInstall = onInstall;

    function _createWindowStates(callback) {
        chrome.windows.getAll(function (w) {
            w.forEach(function (window) {
                if (!(window.id in manager.windows)) {
                    manager.windows[window.id] = new WindowState();
                }
            });

            if (callback) {
                callback();
            }
        });
    }

    function _deleteWindowState(windowId) {
        if (windowId in manager.windows) {
            delete manager.windows[windowId];
        }
    }

    function _getNextTabIndex(neighbor, callback) {
        var index = {
            index: -1,
            windowId: -1
        };

        if (neighbor === null) {
            callback(null);
        } else if (typeof (neighbor) === 'number') {
            chrome.tabs.get(neighbor, function (tab) {
                index.index = tab.index + 1;
                index.windowId = tab.windowId;
                callback(index);
            });
        } else {
            var tab = neighbor;
            index.index = tab.index + 1;
            index.windowId = tab.windowId;
            callback(index);
        }
    }

    function _getWindowState(windowId) {
        var state = manager.windows[windowId];
        if (!state) {
            state = new WindowState();
            manager.windows[windowId] = state;
        }
        return state;
    }

    function _isSpeedDial(tab) {
        var a = document.createElement('a');
        a.href = tab.url;
        return a.protocol === 'opera:' && a.hostname === 'startpage';
    }

    function _updateActiveTabs(callback) {
        chrome.tabs.query({ active: true }, function (tabs) {
            tabs.forEach(function (tab) {
                _getWindowState(tab.windowId).add(tab.id);
            });

            if (callback) {
                callback();
            }
        });
    }

    /* Tab movement functions */
    function _handleNewTab(tab) {
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

    function _handleNewWindowTab(tab) {
        if (tab.openerTabId !== undefined) {
            // If preventing all new windows or tab created while holding
            // shift, check if it opened in a new window and move it back.
            if (settings.preventWindowPopups || (settings.preventNewWindow && manager.shiftDown)) {
                chrome.tabs.get(tab.openerTabId, function (opener) {
                    if (tab.windowId != opener.windowId) {
                        _moveToOpenerWindow(tab, opener);
                    }
                });
            }
        }
    }

    function _moveNextToActive(tab, windowId, callback) {
        if (typeof windowId === 'undefined') {
            windowId = tab.windowId;
        }

        var state = _getWindowState(windowId);
        var neighbor = state.history.first;

        if (settings.openInOrder && state.inOrderTab !== null) {
            // If we are opening tabs in order, place the new tab
            // next to the last tab we opened instead of next to
            // its opener.
            chrome.tabs.get(state.inOrderTab, function (prevTab) {
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

    function _moveNextToTab(tab, neighbor, callback) {
        if (neighbor === null) {
            return;
        }

        _getNextTabIndex(neighbor, function (index) {
            if (tab.index !== index.index || tab.windowId !== index.windowId) {
                chrome.tabs.move(tab.id, index, callback);
            }
        });
    }

    function _moveToEnd(tab, windowId, callback) {
        if (typeof (windowId) === 'undefined') {
            windowId = tab.windowId;
        }
        chrome.tabs.move(tab.id, { index: -1, windowId: windowId }, callback);
    }

    function _moveToOpenerWindow(tab, opener) {
        function _focus(tab) {
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
    function _onMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'up':
                if (message.key === CTRL) {
                    manager.ctrlDown = false;
                } else if (message.key === SHIFT) {
                    manager.shiftDown = false;
                }
                break;

            case 'down':
                if (message.key === CTRL) {
                    manager.ctrlDown = true;
                } else if (message.key === SHIFT) {
                    manager.shiftDown = true;
                }
                break;
        }
    }

    function _onTabActivated(activeInfo) {
        var state = _getWindowState(activeInfo.windowId);
        state.add(activeInfo.tabId);
        state.inOrderTab = activeInfo.tabId;

        // Set a variable to make it easier to tell if a tab removed message
        // directly follows a tab activated message.
        manager.activeChanged = true;
        setTimeout(function () {
            manager.activeChanged = false;
        }, ACTIVE_CHANGED_TIMEOUT);

        log('activate tab ' + activeInfo.tabId, state.history.toString());
    }

    function _onTabAttached(tabId, attachInfo) {
        var state = _getWindowState(attachInfo.newWindowId);
        state.add(tabId);
        log('attach tab ' + tabId, state.history.toString());
    }

    function _onTabCreated(tab) {
        log('create tab ' + tab.id);

        _handleNewTab(tab);
        _handleNewWindowTab(tab);

        // If we want to focus all opened tabs...
        if (settings.focusOnOpen === 'always') {
            // and the tab isn't focused and was opened by another tab...
            if (!tab.active && tab.openerTabId !== undefined) {
                // and we aren't holding one of the exception keys
                if ((settings.exceptCtrl && manager.ctrlDown) || (settings.exceptShift && manager.shiftDown)) {
                    return;
                }

                // focus the tab
                chrome.tabs.update(tab.id, { active: true });
            }
        }
    }

    function _onTabDetached(tabId, detachInfo) {
        var state = _getWindowState(detachInfo.oldWindowId);
        state.remove(tabId);

        log('detach tab ' + tabId, state.history.toString());
    }

    function _onTabRemoved(tabId, removeInfo) {
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

                        chrome.tabs.query(query, function (tabs) {
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

    function _onWindowCreated(window) {
        var state = _getWindowState(window.id);

        // Update the history with the active tab, if any are active yet
        if (window.tabs) {
            window.tabs.filter(function (tab) {
                return tab.active;
            }).forEach(function (tab) {
                state.add(tab.id);
                state.inOrderTab = tab.id;
            });
        }

        log('window created ' + window.id, state.history.toString());
    }

    function _onWindowRemoved(windowId) {
        _deleteWindowState(windowId);
        log('window deleted ' + windowId);
    }
})(manager || (manager = {}));

var commands;
(function (commands) {
    var COMMANDS = {
        "tab_left": cycleTabLeft,
        "tab_right": cycleTabRight
    };

    function init() {
        chrome.commands.onCommand.addListener(_onCommand);
    }
    commands.init = init;

    function cycleTabLeft() {
        chrome.tabs.query({ currentWindow: true, active: true }, function (results) {
            if (results.length == 0) {
                return;
            }

            var current = results[0];

            chrome.tabs.query({ windowId: current.windowId }, function (tabs) {
                var focusTab = null;
                var rightTab = null;
                var rightIndex = -1;

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
    commands.cycleTabLeft = cycleTabLeft;

    function cycleTabRight() {
        chrome.tabs.query({ currentWindow: true, active: true }, function (results) {
            if (results.length == 0) {
                return;
            }

            var current = results[0];

            chrome.tabs.query({ windowId: current.windowId }, function (tabs) {
                var focusTab = null;
                var leftTab = null;

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
            });
        });
    }

    function _onCommand(command) {
        var callback = COMMANDS[command];
        if (callback) {
            callback.call(null);
        } else {
            console.error('Unknown keyboard command: ' + command);
        }
    }
})(commands || (commands = {}));

function log() {
    var args = [];
    for (var _i = 0; _i < (arguments.length - 0); _i++) {
        args[_i] = arguments[_i + 0];
    }
    if (log.enabled) {
        console.log.apply(null, args);
    }
}

var log;
(function (log) {
    log.enabled = false;
})(log || (log = {}));

/* Initialization */
chrome.runtime.onInstalled.addListener(manager.onInstall);
manager.init();
commands.init();

;
;

var WindowState = (function () {
    function WindowState() {
        this.history = new HistoryList();
        this._currentInOrderTab = null;
        this._lastInOrderTab = null;
        this._currentTabIndex = null;
        this._lastTabIndex = null;

        this.inOrderTab = null;
    }
    Object.defineProperty(WindowState.prototype, "currentTabIndex", {
        get: function () {
            return this._currentTabIndex;
        },
        set: function (newTab) {
            this._lastTabIndex = this._currentTabIndex;
            this._currentTabIndex = newTab;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(WindowState.prototype, "inOrderTab", {
        get: function () {
            return this._currentInOrderTab;
        },
        set: function (newTab) {
            this._lastInOrderTab = this._currentInOrderTab;
            this._currentInOrderTab = newTab;
        },
        enumerable: true,
        configurable: true
    });

    WindowState.prototype.add = function (id) {
        var _this = this;
        this.history.add(id);
        this.inOrderTab = id;

        chrome.tabs.get(id, function (tab) {
            // make sure the current tab hasn't changed
            // since we started this call.
            if (_this.history.first === id) {
                _this.currentTabIndex = tab.index;
            }
        });
    };

    WindowState.prototype.remove = function (id) {
        this.history.remove(id);
        if (this.inOrderTab === id) {
            this.inOrderTab = this.history.first;
        }
    };

    WindowState.prototype.rewind = function () {
        this.history.rewind();
        this._currentInOrderTab = this._lastInOrderTab;
        this._currentTabIndex = this._lastTabIndex;
    };
    return WindowState;
})();

var HistoryList = (function () {
    function HistoryList() {
        this.items = [];
        this._lastItems = [];
    }
    Object.defineProperty(HistoryList.prototype, "first", {
        get: function () {
            return this.items.length > 0 ? this.items[0] : null;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(HistoryList.prototype, "second", {
        get: function () {
            return this.items.length > 1 ? this.items[1] : null;
        },
        enumerable: true,
        configurable: true
    });

    HistoryList.prototype.add = function (id) {
        this._copyState();
        this.remove(id);
        this.items.unshift(id);
    };

    HistoryList.prototype.remove = function (id) {
        var existing = this.items.indexOf(id);
        if (existing >= 0) {
            this.items.splice(existing, 1);
        }
    };

    HistoryList.prototype.rewind = function () {
        this.items = this._lastItems;
        this._copyState();
    };

    HistoryList.prototype.toString = function () {
        return this.items.join(', ');
    };

    HistoryList.prototype._copyState = function () {
        this._lastItems = this.items.slice();
    };
    return HistoryList;
})();
