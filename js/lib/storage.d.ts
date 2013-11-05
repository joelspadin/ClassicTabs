/// <reference path="storage.ts" />

interface ISettingStorage {
	// If useAccessors is not disabled, give the names and types of all your settings 
	// here so they can be referenced in TypeScript code.

	onOpen: string;
	onClose: string;
	focusOnOpen: string;
	enableTabCycle: boolean;
	exceptCtrl: boolean;
	openInOrder: boolean;
	preventNewWindow: boolean;
}