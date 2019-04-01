import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { browser } from 'webextension-polyfill-ts';

import { useMessage } from '@spadin/webextension-options';

export interface LogViewerProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
}

export const LogViewer: React.FunctionComponent<LogViewerProps> = (props) => {
    const { value, ...textAreaProps } = props;

    const logRef = useRef<HTMLTextAreaElement>();
    const [log, setLog] = useState('');

    async function updateLog() {
        const response = await browser.runtime.sendMessage({ action: 'get_log' });
        if (typeof response === 'string') {
            setLog(response);
        }
    }

    useInterval(updateLog, 1000);

    async function handleClearLog() {
        await browser.runtime.sendMessage({ action: 'clear_log' });
        await updateLog();
    }

    function handleCopyLog() {
        if (logRef.current) {
            logRef.current.select();
            document.execCommand('copy');
        }
    }

    return (
        <>
            <span className="input textarea browser-style">
                <TextareaAutosize
                    inputRef={ref => logRef.current = ref}
                    readOnly={true}
                    value={log}
                    {...textAreaProps}
                    />
            </span>
            <div className="button-row">
                <button onClick={handleClearLog}>
                    {useMessage('clearLog')}
                </button>
                <button onClick={handleCopyLog}>
                    {useMessage('copyLog')}
                </button>
            </div>
        </>
    );
};

export default LogViewer;

function useInterval(callback: () => void, delay: number) {
    const savedCallback = useRef<() => void>(callback);

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        function tick() {
            savedCallback.current();
        }

        const id = setInterval(tick, delay);
        return () => clearInterval(id);
    }, [delay]);
}
