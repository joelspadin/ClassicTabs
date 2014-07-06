/// <reference path="lib/storage.ts" />

var settings = CreateSettings({
    onOpen: 'default',
    onClose: 'lastfocused',
    focusOnOpen: 'default',
    exceptCtrl: true,
    exceptShift: false,
    openInOrder: false,
    preventNewWindow: true,
    preventWindowPopups: false
});
