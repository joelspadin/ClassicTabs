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

    /** Delay in milliseconds to prevent re-ordering tabs on startup. */
    startupDelay: number;
    /** Time to wait in milliseconds when checking if a tab was closed immediately after a focus change. */
    activeChangedTimeout: number;

    /** If true, log all tab events. */
    logEnabled: boolean;
}

export const storage = StorageArea.create<StorageItems>({
    defaults: {
        activeChangedTimeout: 100,
        exceptCtrl: true,
        exceptShift: false,
        focusOnOpen: 'default',
        logEnabled: false,
        onClose: 'default',
        onOpen: 'default',
        openInOrder: true,
        preventNewWindow: false,
        preventWindowPopups: false,
        startupDelay: 2000,
    },
});
