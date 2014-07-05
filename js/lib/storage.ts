interface SettingStorageOptions {
	/** Sets the name of the setting used to save that the extension has been run */
	initSetting?: string;
	/** String to place before each setting name when saving to web storage */
	prefix?: string;
	/* Sets the web storage object used to save settings */
	storage?: Storage;
	/* If set to false, accessor properties will not be created for each setting */
	useAccessors?: boolean;
}

interface SettingStorageBase {
	defaults: { [key: string]: any; };
	initSetting: string;
	prefix: string;
	storage: Storage;
	useAccessors: boolean;
	/** Returns true if this is the first time the extension has been run. */
	firstRun: boolean;

	/** Initializes storage and sets any uninitialized settings to their default values.
	 * This should be called once when the extension starts. */
	init();
	/** Gets the value of a setting */
	get (key: string): any;
	/** Sets the value of a setting */
	set (key: string, value: any);
	/** Returns a map containing all settings and their current values */
	getAll(): { [key: string]: any; };
	/** Sets the values of one or more settings */
	setAll(setting: { [key: string]: any; });
	/** Returns true if a setting with the given name exists */
	isDefined(key: string): boolean;
	/** Reset a setting to its default value */
	reset(key: string);
	/** Resets all settings to their default values */
	resetAll();
}

interface SettingStorage extends SettingStorageBase { }

class SettingStorageClass implements SettingStorageBase {

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
		var result: { [key: string]: any; } = {};
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

	public isDefined(key: string): boolean {
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
			// convert dashes to camel case (foo-bar -> fooBar)
			var i = -1;
			while ((i = key.indexOf('-')) != -1) {
				key = key.substr(0, i) + key.substr(i + 1, 1).toUpperCase() + key.substr(i + 2);
			}

			// if name is reserved, prefix with underscore
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

/**
* @param defaults A map containing setting names and their default values
* @param options Configuration options
*/
function CreateSettings(defaults?: { [key: string]: any; }, options?: SettingStorageOptions): SettingStorage {
	return <SettingStorage><any> new SettingStorageClass(defaults, options);
}