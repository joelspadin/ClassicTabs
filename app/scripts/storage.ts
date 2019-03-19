import { StorageArea } from '@spadin/webextension-storage';

export type OpenBehavior = 'default' | 'nextToActive' | 'atEnd' | 'otherAtEnd';
export type CloseBehavior = 'default' | 'lastfocused' | 'next' | 'previous';
export type FocusBehavior = 'default' | 'always';

export interface StorageItems {
    /** Action to take when opening a tab. */
    onOpen: OpenBehavior;
    /** Action to take when closing a tab. */
    onClose: CloseBehavior;
    /** Behavior for focusing opened tabs. */
    focusOnOpen: FocusBehavior;
    /** Ignore focusOnOpen == 'always' if Ctrl is held. */
    exceptCtrl: boolean;
    /** Ignore focusOnOpen == 'always' if Shift is held. */
    exceptShift: boolean;
    /** Place consecutively-opened tabs in order when onOpen == 'nextToActive' */
    openInOrder: boolean;
    /** If true, prevent Shift + Click from opening tabs in a new window. */
    preventNewWindow: boolean;
    /** If true, prevent all tabs from opening in a new window. */
    preventWindowPopups: boolean;
}

export const storage = StorageArea.create<StorageItems>({
    defaults: {
        onOpen: 'default',
        onClose: 'default',
        focusOnOpen: 'default',
        exceptCtrl: true,
        exceptShift: false,
        openInOrder: true,
        preventNewWindow: false,
        preventWindowPopups: false,
    }
});
