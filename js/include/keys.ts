/// <reference path="../lib/chrome.d.ts" />

var SHIFT = 16;
var CTRL = 17;

window.addEventListener('keydown', (e: KeyboardEvent) => {
	if (e.which === SHIFT || e.which === CTRL) {
		chrome.runtime.sendMessage({
			key: e.which,
			action: 'down',
		});
	}
});

window.addEventListener('keyup', (e: KeyboardEvent) => {
	if (e.which === SHIFT || e.which === CTRL) {
		chrome.runtime.sendMessage({
			key: e.which,
			action: 'up',
		});
	}
});