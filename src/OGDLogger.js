//// @ts-check
/**
 *   @fileoverview Based on the implementation in OGDLog.cs in opengamedata-unity by Autumn Beauchesne
 *   Handles Communication with the logging features of the OpenGameData servers
 *   Additional Functionality for Firebase
 *
 *   @author Alex Grabowski <ajgrabowski@wisc.edu>
 *   @version 1.0.0
 */
import { SessionConsts, OGDLogConsts } from "./LogConsts";
import { BuildOGDUrl, EscapeJSONString, UUIDint } from "./LogUtils";
import { InitializeFirebase, LogFirebaseEvent } from "./OGDLog.Firebase";

// same as the Unity package; delays in milliseconds
const FlushFailureDelay = 400;
const RepeatedFailureDelay = 200;
const ReconnectDelay = 10000;
const EndpointFailureCountCap = 10;
const EndpointFailureCountReset = 6;

const RequestTimeout = 30000;
const MaxBatchSize = 100;

/**
 * @param {number} number
 * @param {number} digits
 */
function NumberToStringPadLeft(number, digits) {
    return Math.round(number).toString().padStart(digits, "0");
}

/**
 * Base64-encodes the UTF-8 bytes of the text, since btoa only accepts Latin-1 characters
 * @param {string} text
 */
function Base64EncodeUTF8(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
}

/**
 * Dictates debug output and base64 encoding
 * @typedef {number} SettingsFlags
 * */
export const SettingsFlags = {
    Debug: 0x01,
    Base64Encode: 0x02,
};

export class OGDLogger {
    /**
     * @param {string} myAppID - an id for the app in the database
     * @param {string} myAppVersion - the current version of the app's logging events
     * @param {FirebaseOptions} firebaseConfig (optional) - your app's Firebase project configuration object; If no object is provided, Firebase module will not be initialized
     */
    constructor(myAppID, myAppVersion, firebaseConfig = null) {
        /** @private @type {string} */ this._endpoint = null;

        /** @private @type {number} */ this._eventSequence = 0;
        /** @private @type {boolean} */ this._firebaseReady = false;
        /** @private @type {boolean} */ this._flushing = false;
        /** @private @type {object[]} */ this._logQueue = [];
        this._submittedEventCount = 0;
        this._submittedEndpoint = null;
        this._failureCount = 0;

        this._gameState = undefined;
        this._flushCallback = undefined;
        this._settings = SettingsFlags.Base64Encode;

        OGDLogConsts.AppId = myAppID;
        OGDLogConsts.AppVersion = myAppVersion;
        this._endpoint = BuildOGDUrl();

        this.useFirebase(firebaseConfig);
    }

    /**
     * Set up the application constants and activiate the ready modules
     * @param {*} firebaseConfig (optional) - your app's Firebase project configuration object; If no object is provided, Firebase module will not be initialized
     */
    useFirebase(firebaseConfig) {
        if (!!firebaseConfig) {
            this._firebaseReady = InitializeFirebase(firebaseConfig);
        }
    }

    /**
     * Allows caller to modify the UserId and UserData of the SessionConsts.
     * Additionallty triggers a rebuild of the OGD endpoint
     *
     * @param {string} userId
     * @param {object} userData
     */
    setUserId(userId, userData = null) {
        if (SessionConsts.UserId != userId || SessionConsts.UserData != userData) {
            SessionConsts.UserId = userId;
            SessionConsts.UserData = userData;
            this._endpoint = BuildOGDUrl();
        }
    }

    /**
     * Configures settings for the logger modules
     * @param {SettingsFlags} settings
     */
    setSettings(settings) {
        // @ts-ignore
        this._settings = settings;
    }

    /**
     * Sets the debug settings flags.
     * @param {boolean} debug - shall we?
     */
    setDebug(debug) {
        if (debug) {
            // @ts-ignore
            this.setSettings(this._settings | SettingsFlags.Debug);
        } else {
            // @ts-ignore
            this.setSettings(this._settings | ~SettingsFlags.Debug);
        }
    }

    /**
     * Resets the session id to a new session.
     */
    resetSessionId() {
        SessionConsts.SessionId = UUIDint();
        this._eventSequence = 0;
        this._endpoint = BuildOGDUrl();
    }

    /**
     * Sets the current game state.
     * @param {object} gameState 
     */
    setGameState(gameState) {
        this._gameState = gameState;
    }

    //* Events */

    /**
     * Writes an event to the buffer.
     * @param {string} eventName
     * @param {object?} eventParams
     */
    log(eventName, eventParams = undefined) {
        const now = new Date();
        const nowString = [now.getFullYear(), NumberToStringPadLeft(now.getMonth() + 1, 2), NumberToStringPadLeft(now.getDate(), 2)].join("-")
            + " " + [NumberToStringPadLeft(now.getHours(), 2), ":", NumberToStringPadLeft(now.getMinutes(), 2), ":", NumberToStringPadLeft(now.getSeconds(), 2), ".", NumberToStringPadLeft(now.getMilliseconds(), 3)].join("") + "Z";

        const offset = -now.getTimezoneOffset(); // negative, to represent offset from UTC to here (rather than the reverse)

        const h = (offset / 60) >> 0;
        const m = (offset % 60) >> 0;
        const s = (60 * (offset % 1)) >> 0;
        const offsetString = [h, m.toString().padStart(2, "0"), s.toString().padStart(2, "0")].join(":");

        const sequenceIndex = this._eventSequence++;

        let eventData = {
            event_name: eventName,
            event_sequence_index: sequenceIndex,
            client_time: nowString,
            client_offset: offsetString
        };

        if (!!SessionConsts.UserData) {
            eventData["user_data"] = JSON.stringify(SessionConsts.UserData);
        }

        if (!!this._gameState) {
            eventData["game_state"] = JSON.stringify(this._gameState);
        }

        if (!!eventParams) {
            eventData["event_data"] = JSON.stringify(eventParams);
        }

        this._logQueue.push(eventData);
        if (!this._flushing && typeof this._flushCallback == "undefined") {
            this._flushCallback = setTimeout(() => this.flush(), 0);
        }

        if (this._firebaseReady) {
            LogFirebaseEvent(eventName, eventParams, sequenceIndex);
        }
    }

    /**
     * Flush the current logging queue to the database and handle the response
     */
    flush() {
        clearTimeout(this._flushCallback);
        this._flushCallback = undefined;

        if (this._flushing || this._logQueue.length <= 0) {
            return;
        }

        // a batch that failed is sent again unchanged, so events logged since then go in the next one
        if (this._submittedEventCount <= 0) {
            this._submittedEventCount = Math.min(this._logQueue.length, MaxBatchSize);
            // the URL has the session and user ids, which can change before a retry
            this._submittedEndpoint = this._endpoint;
        }
        const batch = this._logQueue.slice(0, this._submittedEventCount);

        let data;
        try {
            data = EscapeJSONString(JSON.stringify(batch));
            if (this._settings & SettingsFlags.Base64Encode) {
                data = Base64EncodeUTF8(data);
            }
        } catch (e) {
            // dropping the whole batch keeps one bad event from blocking everything logged after it
            console.error("[OGDLogger] Dropped events that could not be encoded: ", e);
            this._logQueue.splice(0, this._submittedEventCount);
            this._submittedEventCount = 0;
            this.flush();
            return;
        }

        this._flushing = true;

        const toPost = "data=" + encodeURIComponent(data);

        // Debugging
        if ((this._settings & SettingsFlags.Debug) != 0) {
            console.log(
                "[DEBUG OGDLogger] current batch: ",
                JSON.stringify(batch),
                "\nab to post to:",
                this._submittedEndpoint
            );
        }

        const xhttp = new XMLHttpRequest();
        // @ts-ignore
        xhttp.open("POST", this._submittedEndpoint);
        xhttp.timeout = RequestTimeout;
        xhttp.setRequestHeader(
            "Content-Type",
            "application/x-www-form-urlencoded"
        );
        xhttp.send(toPost);
        // Handle response
        xhttp.onreadystatechange = () => {
            if (xhttp.readyState === XMLHttpRequest.DONE) {
                this._flushing = false;

                const status = xhttp.status;
                
                if (status >= 200 && status < 400) {
                    if ((this._settings & SettingsFlags.Debug) != 0) {
                        console.log(
                            "[DEBUG OGDLogger:xhttp] Great success\n",
                            "response:",
                            xhttp.responseText
                        );
                    }
                    this._logQueue.splice(0, this._submittedEventCount);
                    this._submittedEventCount = 0;
                    this._failureCount = 0;
                } else if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
                    // sending a batch the server rejected again won't help, unless it timed out or was rate limited
                    console.error(
                        "[OGDLogger] Dropped events the server rejected with status: ",
                        status,
                        xhttp.responseText.slice(0, 200)
                    );
                    this._logQueue.splice(0, this._submittedEventCount);
                    this._submittedEventCount = 0;
                    this._failureCount = 0;
                } else {
                    console.error(
                        "[OGDLogger] XMLHttpRequest returned error status: ",
                        status
                    );
                    // status 0 means there was no response at all (offline, timed out), which counts double
                    this._failureCount += status === 0 ? 2 : 1;
                }

                if (this._logQueue.length <= 0) {
                    return;
                }

                if (this._failureCount == 0) {
                    this.flush();
                } else if (this._failureCount >= EndpointFailureCountCap) {
                    this._failureCount = EndpointFailureCountReset;
                    this._flushCallback = setTimeout(() => this.flush(), ReconnectDelay);
                } else {
                    const delay = FlushFailureDelay + (this._failureCount - 1) * RepeatedFailureDelay;
                    this._flushCallback = setTimeout(() => this.flush(), delay);
                }
            }
        };
    }
}