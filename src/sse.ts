// Copyright (C) 2016 Maxime Petazzoni <maxime.petazzoni@bulix.org>.
// All rights reserved.

type Listener = (event: CustomEvent) => void;
type Listeners = { [type: string]: Listener[] };

interface Options {
    headers?: { [header: string]: string };
    payload?: string;
    method?: string;
    withCredentials?: boolean;
}

export class SSE {
    private static readonly INITIALIZING = -1;
    private static readonly CONNECTING = 0;
    private static readonly OPEN = 1;
    private static readonly CLOSED = 2;
    private static readonly FIELD_SEPARATOR = ':';

    private readonly url: string;
    private readonly headers: { [header: string]: string };
    private readonly payload: string;
    private readonly method: string;
    private readonly withCredentials: boolean;
    private readonly listeners: Listeners;

    private xhr: XMLHttpRequest | null;
    private readyState: number;
    private progress: number;
    private chunk: string;

    constructor(url: string, options?: Options) {
        this.url = url;

        options = options || {};
        this.headers = options.headers || {};
        this.payload = options.payload !== undefined ? options.payload : '';
        this.method = options.method || (this.payload && 'POST') || 'GET';
        this.withCredentials = !!options.withCredentials;

        this.listeners = {};

        this.xhr = null;
        this.readyState = SSE.INITIALIZING;
        this.progress = 0;
        this.chunk = '';
    }

    addEventListener(type: string, listener: Listener): void {
        if (this.listeners[type] === undefined) {
            this.listeners[type] = [];
        }

        if (this.listeners[type].indexOf(listener) === -1) {
            this.listeners[type].push(listener);
        }
    }

    removeEventListener(type: string, listener: Listener): void {
        if (this.listeners[type] === undefined) {
            return;
        }

        const filtered = this.listeners[type].filter((element) => element !== listener);
        if (filtered.length === 0) {
            delete this.listeners[type];
        } else {
            this.listeners[type] = filtered;
        }
    }

    dispatchEvent(e: any): boolean {
        if (!e) {
            return true;
        }

        e.source = this;

        const onHandler = 'on' + e.type;
        if (this.hasOwnProperty(onHandler)) {
            (this as any)[onHandler].call(this, e);
            if (e.defaultPrevented) {
                return false;
            }
        }

        if (this.listeners[e.type]) {
            return this.listeners[e.type].every((callback) => {
                callback(e);
                return !e.defaultPrevented;
            });
        }

        return true;
    }

    private _setReadyState(state: number): void {
        const event: any = new CustomEvent('readystatechange');
        event.readyState = state;
        this.readyState = state;
        this.dispatchEvent(event);
    }

    private _onStreamFailure(e: ProgressEvent): void {
        const event = new CustomEvent('error');
        /// @ts-ignore
        event.data = e.currentTarget?.response;
        this.dispatchEvent(event);
        this.close();
    }

    private _onStreamAbort(e: ProgressEvent): void {
        this.dispatchEvent(new CustomEvent('abort'));
        this.close();
    }

    private _onStreamProgress(e: ProgressEvent): void {
        if (!this.xhr) {
            return;
        }

        if (this.xhr.status !== 200) {
            this._onStreamFailure(e);
            return;
        }

        if (this.readyState == SSE.CONNECTING) {
            this.dispatchEvent(new CustomEvent('open'));
            this._setReadyState(SSE.OPEN);
        }

        const data = this.xhr.responseText.substring(this.progress);
        this.progress += data.length;
        data.split(/(\r\n|\r|\n){2}/g).forEach((part) => {
            if (part.trim().length === 0) {
                this.dispatchEvent(this._parseEventChunk(this.chunk.trim()));
                this.chunk = '';
            } else {
                this.chunk += part;
            }
        });
    }

    private _onStreamLoaded(e: ProgressEvent): void {
        this._onStreamProgress(e);
        // Parse the last chunk.
        this.dispatchEvent(this._parseEventChunk(this.chunk));
        this.chunk = '';
    }

    /**
    
    Parse a received SSE event chunk into a constructed event object.
    */
    private _parseEventChunk(chunk: string): CustomEvent | null {
        if (!chunk || chunk.length === 0) {
            return null;
        }

        const e = { 'id': null, 'retry': null, 'data': '', 'event': 'message' };

        chunk.split(/\n|\r\n|\r/).forEach((line) => {
            line = line.trimEnd();
            const index = line.indexOf(SSE.FIELD_SEPARATOR);
            if (index <= 0) {
                // Line was either empty, or started with a separator and is a comment.
                // Either way, ignore.
                return;
            }

            const field = line.substring(0, index);
            if (!(field in e)) {
                return;
            }

            const value = line.substring(index + 1).trimLeft();
            if (field === 'data') {
                e[field] += value;
            } else {
                /// @ts-ignore
                e[field] = value;
            }
        });

        const event: any = new CustomEvent(e.event);
        event.data = e.data;
        event.id = e.id;
        return event;
    }

    private _checkStreamClosed(): void {
        if (!this.xhr) {
            return;
        }


        if (this.xhr.readyState === XMLHttpRequest.DONE) {
            this._setReadyState(SSE.CLOSED);
        }

    }

    stream(): void {
        this._setReadyState(SSE.CONNECTING);

        this.xhr = new XMLHttpRequest();
        this.xhr.addEventListener('progress', this._onStreamProgress.bind(this));
        this.xhr.addEventListener('load', this._onStreamLoaded.bind(this));
        this.xhr.addEventListener('readystatechange', this._checkStreamClosed.bind(this));
        this.xhr.addEventListener('error', this._onStreamFailure.bind(this));
        this.xhr.addEventListener('abort', this._onStreamAbort.bind(this));
        this.xhr.open(this.method, this.url);
        for (const header in this.headers) {
            this.xhr.setRequestHeader(header, this.headers[header]);
        }
        this.xhr.withCredentials = this.withCredentials;
        this.xhr.send(this.payload);
    }

    close(): void {
        if (this.readyState === SSE.CLOSED) {
            return;
        }

        this.xhr?.abort();
        this.xhr = null;
        this._setReadyState(SSE.CLOSED);
    }
}