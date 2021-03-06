// webextension-polyfill is big, and this script gets loaded in every tab.
// We only use one function from the API, and we don't need the promisified
// version of it, so just use the Chrome API instead to keep this script small.

const SHIFT = 16;
const CTRL = 17;

function sendModifiers(e: KeyboardEvent) {
    if (e.which === SHIFT || e.which === CTRL) {
        if (chrome.runtime) {
            chrome.runtime.sendMessage({
                action: e.type,
                key: e.which,
            });
        }
    }
}

window.addEventListener('keydown', sendModifiers);
window.addEventListener('keyup', sendModifiers);
