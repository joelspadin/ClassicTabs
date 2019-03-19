import { browser } from 'webextension-polyfill-ts';

const SHIFT = 16;
const CTRL = 17;

export var ctrl = false;
export var shift = false;

interface KeyMessage {
    action: 'keydown' | 'keyup';
    key: number;
}

function setKey(key: number, state: boolean) {
    switch (key) {
        case SHIFT:
            shift = state;
            break;

        case CTRL:
            ctrl = state;
            break;
    }
}

browser.runtime.onMessage.addListener((message: KeyMessage, sender) => {
    switch (message.action) {
        case 'keydown':
            setKey(message.key, true);
            break;

        case 'keyup':
            setKey(message.key, false);
            break;
    }
});
