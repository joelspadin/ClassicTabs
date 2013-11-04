/// <reference path="lib/storage.d.ts" />

var settings = new SettingStorage({
	onOpen: 'nextToActive',
	onClose: 'lastfocused',
	focusOnOpen: 'default',
	exceptCtrl: true,
	preventNewWindow: true,
});

