import { browser } from 'webextension-polyfill-ts';

const SHIFT = 16;
const CTRL = 17;

function sendModifiers(e: KeyboardEvent) {
    if (e.which === SHIFT || e.which === CTRL) {
        browser.runtime.sendMessage({
            action: e.type,
            key: e.which,
        });
    }
}

window.addEventListener('keydown', sendModifiers);
window.addEventListener('keyup', sendModifiers);
