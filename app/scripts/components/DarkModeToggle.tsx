import * as React from 'react';
import useDarkMode from 'use-dark-mode';

import { useMessage } from '@spadin/webextension-options';

export interface DarkmodeToggle {
    className?: string;
}

export const DarkModeToggle: React.FunctionComponent<DarkmodeToggle> = (props) => {
    const darkMode = useDarkMode(false, {
        classNameDark: 'dark-theme',
        classNameLight: 'light-theme',
        element: document.documentElement,
    });

    return (
        <span className={`input checkbox ${props.className || ''}`}>
            <label htmlFor="dark-mode">
                {useMessage('darkMode')}
            </label>
            <input
                id="dark-mode"
                type="checkbox"
                checked={darkMode.value}
                onChange={darkMode.toggle}
                />
        </span>
    );
};
