interface SettingStorageOptions {
	initSetting?: string;
	prefix?: string;
	storage?: Storage;
	useAccessors?: boolean;
}

class SettingStorage {

	defaults: { [key: string]: any; } = {};
	initSetting: string = '__initialized__';
	prefix: string = '';
	storage: Storage = localStorage;
	useAccessors: boolean = true;	

	private _firstRun: boolean = false;
	get firstRun() {
		return this._firstRun;
	}

	constructor(defaults?: { [key: string]: any; }, options?: SettingStorageOptions) {
		var self = this;

		if (defaults !== undefined) {
			this.defaults = defaults || {};
		}

		if (options !== undefined) {
			['initSetting', 'prefix', 'storage', 'useAccessors'].forEach((key) => {
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

	public init() {
		this._fillDefaults();
		if (this.firstRun) {
			this.set(this.initSetting, true);
		}
	}

	public get(key: string): any {
		var result = this.storage[this.prefix + key];
		return result === undefined ? null : JSON.parse(result);
	}

	public set(key: string, value: any) {
		this.storage[this.prefix + key] = JSON.stringify(value);
	}

	public getAll(): { [key: string]: any; } {
		var result = {};
		for (var key in this.defaults) {
			result[key] = this.get(key);
		}
		return result;
	}

	public setAll(settings: { [key: string]: any; }) {
		for (var key in settings) {
			if (settings.hasOwnProperty(key)) {
				this.set(key, settings[key]);
			}
		}
	}

	public isDefined(key: string): bool {
		return this.storage[this.prefix + key] !== undefined;
	}

	public reset(key: string) {
		if (key in this.defaults) {
			this.set(key, this.defaults[key]);
		} else {
			this.set(key, null);
		}
	}

	public resetAll() {
		for (var key in this.defaults) {
			if (this.defaults.hasOwnProperty(key)) {
				this.set(key, this.defaults[key]);
			}
		}
	}

	private _fillDefaults() {
		for (var key in this.defaults) {
			if (this.defaults.hasOwnProperty(key)) {
				if (!this.isDefined(key)) {
					this.set(key, this.defaults[key]);
				}
			}
		}
	}

	private _defineAccessors() {
		var descriptors: PropertyDescriptorMap = {};
		var reserved = [
			'defaults', 'fillDefaults', 'get', 'getAll', 'init', 
			'initSetting', 'isDefined', 'prefix', 'reset', 'resetAll', 
			'set', 'setAll', 'storage', 'useAccessors'];

		function sanitizeName(key: string) {
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

		function makeDesc(key): PropertyDescriptor {
			return {
				get: function () { return this.get(key) },
				set: function (value) { this.set(key, value) },
				enumerable: true,
			};
		}

		for (var key in this.defaults) {
			var propName = sanitizeName(key);
			if (this.defaults.hasOwnProperty(key)) {
				descriptors[propName] = makeDesc(key);
			}
		}

		Object.defineProperties(this, descriptors);
	}
}
