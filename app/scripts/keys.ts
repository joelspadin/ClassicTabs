import { browser } from 'webextension-polyfill-ts';
import { Message } from './messages';

const SHIFT = 16;
const CTRL = 17;

export let ctrl = false;
export let shift = false;

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

browser.runtime.onMessage.addListener((message: Message) => {
    switch (message.action) {
        case 'keydown':
            setKey(message.key, true);
            break;

        case 'keyup':
            setKey(message.key, false);
            break;
    }
});
