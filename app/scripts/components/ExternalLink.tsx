import * as React from 'react';

type LinkProps = React.HTMLProps<HTMLAnchorElement>;

export const ExternalLink: React.FunctionComponent<LinkProps> = (props) => {
    return (
        <a {...props}
            rel="external noopener"
            target="_blank"
            >
            {props.children}
        </a>
    );
};
