interface SettingStorageOptions {
	/** Sets the name of the setting which stores whether the extension has been initialized.
	 * Defaults to __initialized__ */
	initSetting?: string;
	/** Sets the prefix used when saving settings to web storage. 
	 * This allows multiple SettingStorage objects to coexist in one storage object.
	 * Defaults to no prefix. */
	prefix?: string;
	/** Sets the web storage object used to save settings. Defaults to localStorage. */
	storage?: Storage;
	/** If set false, prevents accessor properties from being created for each setting. */
	useAccessors?: boolean;
}

declare class SettingStorageBase {
	defaults: { [key: string]: any; };
	initSetting: string;
	prefix: string;
	storage: Storage;
	useAccessors: boolean;
	/** Returns true if this is the first time the extension has been run. */
	firstRun: boolean;

	/**
	 * @param defaults A map containing setting names and their default values
	 * @param options Configuration options
	 */
	constructor (defaults?: { [key: string]: any; }, options?: SettingStorageOptions);
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
	isDefined(key: string): bool;
	/** Reset a setting to its default value */
	reset(key: string);
	/** Resets all settings to their default values */
	resetAll();
}


declare class SettingStorage extends SettingStorageBase {
	// If useAccessors is not disabled, give the names and types of all your settings 
	// here so they can be referenced in TypeScript code.

	onOpen: string;
	onClose: string;
	focusOnOpen: string;
	exceptCtrl: boolean;
	preventNewWindow: boolean;
}