import * as React from 'react';

import { FileViewer, useMessage } from '@spadin/webextension-options';

/**
 * Button which opens a window displaying third-party credits information.
 */
export const ThirdPartyCredits: React.FunctionComponent = () => {
    return (
        <FileViewer
            label={useMessage('thirdPartyCredits')}
            file="ThirdPartyNotices.txt"
            />
    );
};
