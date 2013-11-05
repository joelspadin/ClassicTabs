/// <reference path="settings.ts" />
/// <reference path="chrome.d.ts" />
var manager;
(function (manager) {
    /* Public Fields */
    manager.history;
    manager.currentTabId;
    manager.currentTabIndex;
    manager.inOrderTabId;

    manager.ctrlDown;
    manager.shiftDown;
    manager.ignoreTabActivation;

    /* Private Fields */
    var SHIFT = 16;
    var CTRL = 17;

    var COMMANDS = {
        "tab_left": {
            enableSetting: 'enableTabCycle',
            callback: _cycleTabLeft
        },
        "tab_right": {
            enableSetting: 'enableTabCycle',
            callback: _cycleTabRight
        }
    };

    /* Public Functions */
    function init() {
        manager.ctrlDown = false;
        manager.shiftDown = false;
        manager.ignoreTabActivation = false;

        manager.history = {};
        manager.currentTabId = {};
        manager.currentTabIndex = {};
        manager.inOrderTabId = {};

        chrome.windows.getAll(_createHistories);
        chrome.tabs.query({ active: true }, _createCurrentTabs);

        chrome.windows.onCreated.addListener(_onWindowCreated);
        chrome.windows.onRemoved.addListener(_onWindowRemoved);

        chrome.tabs.onMoved.addListener(_onTabMoved);
        chrome.tabs.onCreated.addListener(_onTabCreated);
        chrome.tabs.onRemoved.addListener(_onTabRemoved);
        chrome.tabs.onActivated.addListener(_onTabActivated);
        chrome.tabs.onDetached.addListener(_onTabDetached);
        chrome.tabs.onAttached.addListener(_onTabAttached);

        chrome.commands.onCommand.addListener(_onCommand);
        chrome.runtime.onMessage.addListener(_onMessage);
    }
    manager.init = init;

    function onInstall() {
        settings.init();
    }
    manager.onInstall = onInstall;

    /* Private Functions */
    function _addToHistory(tab) {
        var history = manager.history[tab.windowId];
        history.insert(tab.id);

        manager.currentTabId[tab.windowId] = tab.id;
        manager.currentTabIndex[tab.windowId] = tab.index;
        manager.inOrderTabId[tab.windowId] = tab.id;
    }

    function _createCurrentTabs(tabs) {
        tabs.forEach(function (tab) {
            manager.currentTabId[tab.windowId] = tab.id;
            manager.currentTabIndex[tab.windowId] = tab.index;
        });
    }

    function _createHistories(windows) {
        windows.forEach(function (window) {
            manager.history[window.id] = new HistoryList();
        });
    }

    function _cycleTabLeft() {
    }

    function _cycleTabRight() {
    }

    function _getNextTabIndex(neighborId, callback) {
        if (neighborId === null) {
            callback(null, null);
        }

        chrome.tabs.get(neighborId, function (neighbor) {
            callback(neighbor.index + 1, neighbor.windowId);
        });
    }

    function _handleCreatedTabMovement(tab) {
        var history = manager.history[tab.windowId];
        switch (settings.onOpen) {
            case 'nextToActive':
                if (settings.openInOrder && manager.inOrderTabId[tab.windowId] != null) {
                    chrome.tabs.get(manager.inOrderTabId[tab.windowId], function (prevTab) {
                        if (tab && tab.openerTabId === history.first) {
                            _moveNextToTab(tab, prevTab.id);
                        } else {
                            _moveNextToTab(tab, history.first);
                        }
                        manager.inOrderTabId[tab.windowId] = tab.id;
                    });
                } else {
                    _moveNextToTab(tab, history.first);
                }
                break;

            case 'atEnd':
                _moveToEnd(tab);
                break;

            case 'otherAtEnd':
                _moveOtherToEnd(tab);
                break;
        }

        if (tab.active) {
            history.insert(tab.id);
        } else {
            history.append(tab.id);
        }
    }

    function _isSpeeddial(tab) {
        return tab.url === 'opera://startpage/';
    }

    function _moveNextToTab(tab, neighborId, callback) {
        if (neighborId === null) {
            return;
        }

        if (typeof (neighborId) === 'number') {
            _getNextTabIndex(neighborId, function (index, windowId) {
                if (tab.index !== index || tab.windowId !== windowId) {
                    chrome.tabs.move(tab.id, { index: index, windowId: windowId }, callback);
                }
            });
        } else {
            var neighbor = neighborId;
            if (tab.index !== neighbor.index + 1 || tab.windowId !== neighbor.windowId) {
                chrome.tabs.move(tab.id, { index: neighbor.index + 1, windowId: neighbor.windowId }, callback);
            }
        }
    }

    function _moveOtherToEnd(tab, windowId, callback) {
        if (typeof (windowId) === 'undefined') {
            windowId = tab.windowId;
        }

        var history = manager.history[windowId];
        if (_isSpeeddial(tab)) {
            _moveNextToTab(tab, history.first, callback);
        } else {
            _moveToEnd(tab, windowId, callback);
        }
    }

    function _moveToEnd(tab, windowId, callback) {
        if (typeof (windowId) === 'undefined') {
            windowId = tab.windowId;
        }
        chrome.tabs.move(tab.id, { index: -1, windowId: windowId }, callback);
    }

    function _moveToOpenerWindow(tab, opener) {
        var history = manager.history[opener.windowId];
        var index = -1;

        function _focus(tab) {
            chrome.tabs.update(tab.id, { active: true });
        }

        switch (settings.onOpen) {
            case 'nextToActive':
                _moveNextToTab(tab, history.first, _focus);
                break;

            case 'atEnd':
                _moveToEnd(tab, opener.windowId, _focus);
                break;

            case 'otherAtEnd':
                _moveOtherToEnd(tab, opener.windowId, _focus);
                break;

            case 'default':
                if (_isSpeeddial(tab)) {
                    _moveToEnd(tab, opener.windowId, _focus);
                } else {
                    _moveNextToTab(tab, opener, _focus);
                }
                break;
        }
    }

    function _onCommand(command) {
        var def = COMMANDS[command];
        if (def) {
            console.log(command, def);
            if (!('enableSetting' in def) || settings.get(def.enableSetting)) {
                def.callback.call(null);
            }
        } else {
            console.error('Unknown keyboard command: ' + command);
        }
    }

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
        // Delay changing history since a new tab gets activated first
        // when a tab is being removed, then the tabRemoved event fires.
        chrome.tabs.get(activeInfo.tabId, function (tab) {
            if (manager.ignoreTabActivation) {
                manager.ignoreTabActivation = false;
            } else {
                _addToHistory(tab);
            }
        });
    }

    function _onTabAttached(tabId, attachInfo) {
        var history = manager.history[attachInfo.newWindowId];
        history.insert(tabId);
    }

    function _onTabCreated(tab) {
        _handleCreatedTabMovement(tab);

        if (settings.preventNewWindow && manager.shiftDown && tab.openerTabId !== undefined) {
            // If tab opened in a new window while holding Shift, move it back.
            chrome.tabs.get(tab.openerTabId, function (opener) {
                if (tab.windowId !== opener.windowId) {
                    _moveToOpenerWindow(tab, opener);
                }
            });
        }

        if (settings.focusOnOpen === 'always' && !tab.active && tab.openerTabId !== undefined) {
            if (settings.exceptCtrl && manager.ctrlDown) {
                return;
            }

            chrome.tabs.update(tab.id, { active: true });
        }
    }

    function _onTabDetached(tabId, detachInfo) {
        var history = manager.history[detachInfo.oldWindowId];
        history.remove(tabId);
    }

    function _onTabMoved(tabId, moveInfo) {
        if (manager.currentTabId[moveInfo.windowId] === tabId) {
            manager.currentTabIndex[moveInfo.windowId] = moveInfo.toIndex;
        }
    }

    function _onTabRemoved(id, removeInfo) {
        var history = manager.history[removeInfo.windowId];
        var mode = settings.onClose;
        var wasActive = manager.currentTabId[removeInfo.windowId] === id || manager.currentTabId[removeInfo.windowId] === undefined;

        switch (mode) {
            case 'lastfocused':
                var newTab = history.second;
                if (wasActive && newTab) {
                    chrome.tabs.update(newTab, { active: true }, function (tab) {
                        if (tab) {
                            _addToHistory(tab);
                        }
                    });
                }

                manager.ignoreTabActivation = true;
                break;

            case 'next':
            case 'previous':
                var index = manager.currentTabIndex[removeInfo.windowId];

                if (wasActive && index !== undefined) {
                    if (mode === 'previous') {
                        index = Math.max(0, index - 1);
                    }

                    chrome.tabs.query({
                        windowId: removeInfo.windowId,
                        index: index
                    }, function (tabs) {
                        if (tabs.length > 0) {
                            chrome.tabs.update(tabs[0].id, { active: true }, function (tab) {
                                if (tab) {
                                    _addToHistory(tab);
                                }
                            });
                        }
                    });
                }
                manager.ignoreTabActivation = true;
                break;
        }

        history.remove(id);
    }

    function _onWindowCreated(window) {
        manager.history[window.id] = new HistoryList();

        if (!(window.id in manager.currentTabId)) {
            manager.currentTabId[window.id] = null;
        }
        if (!(window.id in manager.currentTabIndex)) {
            manager.currentTabIndex[window.id] = null;
        }
        if (!(window.id in manager.inOrderTabId)) {
            manager.inOrderTabId[window.id] = null;
        }
    }

    function _onWindowRemoved(windowId) {
        delete manager.history[windowId];
        delete manager.currentTabId[windowId];
        delete manager.currentTabIndex[windowId];
        delete manager.inOrderTabId[windowId];
    }
})(manager || (manager = {}));

/* Initialization */
chrome.runtime.onInstalled.addListener(manager.onInstall);
manager.init();

/** Structure used to save how recently a tab was focused */
var HistoryList = (function () {
    /* Public Functions */
    function HistoryList() {
        this._head = new HistoryList.Node(null);
        this._tail = new HistoryList.Node(null);
        this._head.next = this._tail;
        this._tail.prev = this._head;

        this._map = {};
    }
    Object.defineProperty(HistoryList.prototype, "first", {
        get: /** Returns the most recently active tab */
        function () {
            var item = this._head.next;
            return (item === this._tail) ? null : item.id;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(HistoryList.prototype, "second", {
        get: function () {
            return this.item(1);
        },
        enumerable: true,
        configurable: true
    });

    HistoryList.prototype.item = function (index) {
        var item = this._head.next;
        for (var i = 0; i < index && item !== this._tail; i++) {
            item = item.next;
        }

        return (item === this._tail) ? null : item.id;
    };

    /**
    * Adds a tab at the front of the list. If the tab already
    * exists, it will be moved to the front.
    */
    HistoryList.prototype.insert = function (id) {
        var item = this._detachOrCreateNode(id);
        var second = this._head.next;

        item.prev = this._head;
        this._head.next = item;

        item.next = second;
        second.prev = item;
    };

    /**
    * Adds a tab at the end of the list. If the tab already
    * exists, it will be moved to the front.
    */
    HistoryList.prototype.append = function (id) {
        var item = this._detachOrCreateNode(id);
        var second = this._tail.prev;

        item.next = this._tail;
        this._tail.prev = item;

        item.prev = second;
        second.next = item;
    };

    /** Removes a tab from the list */
    HistoryList.prototype.remove = function (id) {
        var toRemove = this._findNode(id);

        if (toRemove) {
            this._detachNode(toRemove);
            delete this._map[id];
        }
    };

    /** Converts the current history list to an array of tab ids */
    HistoryList.prototype.toArray = function () {
        var list = [];
        var item = this._head.next;
        while (item !== this._tail) {
            list.push(item.id);
            item = item.next;
        }

        return list;
    };

    /* Private Functions */
    /**
    * Gets a node for the tab ID by either detaching an existing
    * one or creating a new one.
    */
    HistoryList.prototype._detachOrCreateNode = function (id) {
        var item = this._findNode(id);
        if (item) {
            this._detachNode(item);
        } else {
            item = new HistoryList.Node(id);
            this._map[id] = item;
        }
        return item;
    };

    /** Returns the node for a tab with a given ID */
    HistoryList.prototype._findNode = function (id) {
        return this._map[id];
    };

    /** Detaches a node */
    HistoryList.prototype._detachNode = function (node) {
        var before = node.prev;
        var after = node.next;

        before.next = after;
        after.prev = before;

        node.prev = null;
        node.next = null;
    };
    return HistoryList;
})();

var HistoryList;
(function (HistoryList) {
    var Node = (function () {
        function Node(id) {
            this.prev = null;
            this.next = null;
            this.id = id;
        }
        return Node;
    })();
    HistoryList.Node = Node;
})(HistoryList || (HistoryList = {}));
//@ sourceMappingURL=background.js.map
