/// <reference path="lib/storage.ts" />

interface SettingStorage {
	onOpen: string;
	onClose: string;
	focusOnOpen: string;
	exceptCtrl: boolean;
	exceptShift: boolean;
	openInOrder: boolean;
	preventNewWindow: boolean;
	preventWindowPopups: boolean;
}

var settings = CreateSettings({
	onOpen: 'default',
	onClose: 'lastfocused',
	focusOnOpen: 'default',
	exceptCtrl: true,
	exceptShift: false,
	openInOrder: false,
	preventNewWindow: true,
	preventWindowPopups: false,
});