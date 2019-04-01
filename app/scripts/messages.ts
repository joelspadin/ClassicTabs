export interface KeyMessage {
    action: 'keydown' | 'keyup';
    key: number;
}

export interface LogMessage {
    action: 'get_log' | 'clear_log';
}

export type Message = KeyMessage | LogMessage;
