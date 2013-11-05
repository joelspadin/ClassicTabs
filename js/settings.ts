/// <reference path="lib/storage.d.ts" />

var settings = CreateStorage({
	onOpen: 'default',
	onClose: 'lastfocused',
	focusOnOpen: 'default',
	enableTabCycle: false,
	exceptCtrl: true,
	openInOrder: false,
	preventNewWindow: true,
});

