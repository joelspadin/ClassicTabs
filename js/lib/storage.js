var SettingStorage = (function () {
    function SettingStorage(defaults, options) {
        this.defaults = {};
        this.initSetting = '__initialized__';
        this.prefix = '';
        this.storage = localStorage;
        this.useAccessors = true;
        this._firstRun = false;
        var self = this;

        if (defaults !== undefined) {
            this.defaults = defaults || {};
        }

        if (options !== undefined) {
            ['initSetting', 'prefix', 'storage', 'useAccessors'].forEach(function (key) {
                if (options[key] !== undefined) {
                    self[key] = options[key];
                }
            });
        }

        if (!this.get(this.initSetting)) {
            this._firstRun = true;
        }

        if (this.useAccessors) {
            this._defineAccessors();
        }
    }
    Object.defineProperty(SettingStorage.prototype, "firstRun", {
        get: function () {
            return this._firstRun;
        },
        enumerable: true,
        configurable: true
    });

    SettingStorage.prototype.init = function () {
        this._fillDefaults();
        if (this.firstRun) {
            this.set(this.initSetting, true);
        }
    };

    SettingStorage.prototype.get = function (key) {
        var result = this.storage[this.prefix + key];
        return result === undefined ? null : JSON.parse(result);
    };

    SettingStorage.prototype.set = function (key, value) {
        this.storage[this.prefix + key] = JSON.stringify(value);
    };

    SettingStorage.prototype.getAll = function () {
        var result = {};
        for (var key in this.defaults) {
            result[key] = this.get(key);
        }
        return result;
    };

    SettingStorage.prototype.setAll = function (settings) {
        for (var key in settings) {
            if (settings.hasOwnProperty(key)) {
                this.set(key, settings[key]);
            }
        }
    };

    SettingStorage.prototype.isDefined = function (key) {
        return this.storage[this.prefix + key] !== undefined;
    };

    SettingStorage.prototype.reset = function (key) {
        if (key in this.defaults) {
            this.set(key, this.defaults[key]);
        } else {
            this.set(key, null);
        }
    };

    SettingStorage.prototype.resetAll = function () {
        for (var key in this.defaults) {
            if (this.defaults.hasOwnProperty(key)) {
                this.set(key, this.defaults[key]);
            }
        }
    };

    SettingStorage.prototype._fillDefaults = function () {
        for (var key in this.defaults) {
            if (this.defaults.hasOwnProperty(key)) {
                if (!this.isDefined(key)) {
                    this.set(key, this.defaults[key]);
                }
            }
        }
    };

    SettingStorage.prototype._defineAccessors = function () {
        var descriptors = {};
        var reserved = [
            'defaults',
            'fillDefaults',
            'get',
            'getAll',
            'init',
            'initSetting',
            'isDefined',
            'prefix',
            'reset',
            'resetAll',
            'set',
            'setAll',
            'storage',
            'useAccessors'
        ];

        function sanitizeName(key) {
            // remove invalid start characters
            key = key.replace(/^[^a-zA-Z_]+/, '');

            // consolidate invalid characters to dashes
            key = key.replace(/[^a-zA-Z0-9_]+/g, '-');

            // camel-case dashes
            var i = -1;
            while ((i = key.indexOf('-')) != -1) {
                key = key.substr(0, i) + key.substr(i + 1, 1).toUpperCase() + key.substr(i + 2);
            }

            if (reserved.indexOf(key) >= 0) {
                key = '_' + key;
            }

            return key;
        }

        function makeDesc(key) {
            return {
                get: function () {
                    return this.get(key);
                },
                set: function (value) {
                    this.set(key, value);
                },
                enumerable: true
            };
        }

        for (var key in this.defaults) {
            var propName = sanitizeName(key);
            if (this.defaults.hasOwnProperty(key)) {
                descriptors[propName] = makeDesc(key);
            }
        }

        Object.defineProperties(this, descriptors);
    };
    return SettingStorage;
})();
