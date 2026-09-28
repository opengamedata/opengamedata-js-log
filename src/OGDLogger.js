//// @ts-check
/**
 *   @fileoverview Based on the implementation in OGDLog.cs in opengamedata-unity by Autumn Beauchesne
 *   Handles Communication with the logging features of the OpenGameData servers
 *   Additional Functionality for Firebase
 *
 *   @author Alex Grabowski <ajgrabowski@wisc.edu>
 *   @version 1.0.0
 */
import { SessionConsts, OGDLogConsts, OGDSchemaVersion } from "./LogConsts";
import { BuildOGDUrl, EscapeJSONString, UUIDint } from "./LogUtils";
import { InitializeFirebase, LogFirebaseEvent } from "./OGDLog.Firebase";

const xhttp = new XMLHttpRequest();

/**
 * @param {number} number
 * @param {number} digits
 */
function NumberToStringPadLeft(number, digits) {
    return Math.round(number).toString().padStart(digits, "0");
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

        this._gameState = undefined;
        this._gameSegment = undefined;
        this._gameConfiguration = undefined;
        this._privateMetadata = undefined;
        this._platform = typeof navigator !== "undefined" ? { user_agent: navigator.userAgent } : undefined;
        this._sessionStart = performance.now();
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
     * Sets the event schema version this logger emits.
     * Pass OGDSchemaVersion.V0_1 to stay on the old schema.
     * Additionally triggers a rebuild of the OGD endpoint.
     *
     * @param {OGDSchemaVersion} schemaVersion - the schema version to emit
     */
    setSchemaVersion(schemaVersion) {
        if (OGDLogConsts.SchemaVersion !== schemaVersion) {
            OGDLogConsts.SchemaVersion = schemaVersion;
            this._endpoint = BuildOGDUrl();
        }
    }

    /**
     * Returns the event schema version this logger is currently emitting.
     * @returns {OGDSchemaVersion} the schema version currently being emitted
     */
    getSchemaVersion() {
        return OGDLogConsts.SchemaVersion;
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
        this._sessionStart = performance.now();
        this._endpoint = BuildOGDUrl();
    }

    /**
     * Sets the instance id, submitted with every event under OGDSchemaVersion.V1_0.
     * Additionally triggers a rebuild of the OGD endpoint.
     * @param {string} instanceId
     */
    setInstanceId(instanceId) {
        if (SessionConsts.InstanceId != instanceId) {
            SessionConsts.InstanceId = instanceId;
            this._endpoint = BuildOGDUrl();
        }
    }

    /**
     * Sets the current game state.
     * @param {object} gameState 
     */
    setGameState(gameState) {
        this._gameState = gameState;
    }

    /**
     * Sets the current game segment: where the player is within the game's
     * structural progression (level, quest, region).
     * Not attached to events while the logger is set to OGDSchemaVersion.V0_1.
     * @param {object} gameSegment
     */
    setGameSegment(gameSegment) {
        this._gameSegment = gameSegment;
    }

    /**
     * Clears the current game segment.
     */
    clearGameSegment() {
        this._gameSegment = undefined;
    }

    /**
     * Sets the current game configuration. Pass undefined to clear it.
     * Not attached to events while the logger is set to OGDSchemaVersion.V0_1.
     * @param {object} gameConfiguration
     */
    setGameConfiguration(gameConfiguration) {
        this._gameConfiguration = gameConfiguration;
    }

    /**
     * Sets the current private metadata. Pass undefined to clear it.
     * Not attached to events while the logger is set to OGDSchemaVersion.V0_1.
     * @param {object} privateMetadata
     */
    setPrivateMetadata(privateMetadata) {
        this._privateMetadata = privateMetadata;
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
        const legacy = OGDLogConsts.SchemaVersion === OGDSchemaVersion.V0_1;

        let eventData = legacy ? {
            event_name: eventName,
            event_sequence_index: sequenceIndex,
            client_time: nowString,
            client_offset: offsetString
        } : {
            event_name: eventName,
            session_sequence_index: sequenceIndex,
            timestamp: now.toISOString().replace("T", " "), // UTC, same format as the Unity package
            client_offset: offsetString,
            game_time: Number(((performance.now() - this._sessionStart) / 1000).toFixed(3))
        };

        if (!!SessionConsts.UserData) {
            eventData[legacy ? "user_data" : "player_history"] = JSON.stringify(SessionConsts.UserData);
        }

        if (!!this._gameState) {
            eventData["game_state"] = JSON.stringify(this._gameState);
        }

        if (!legacy) {
            if (!!this._gameSegment) {
                eventData["game_segment"] = JSON.stringify(this._gameSegment);
            }
            if (!!this._gameConfiguration) {
                eventData["game_configuration"] = JSON.stringify(this._gameConfiguration);
            }
            if (!!this._privateMetadata) {
                eventData["private_metadata"] = JSON.stringify(this._privateMetadata);
            }
            if (!!this._platform) {
                eventData["platform"] = JSON.stringify(this._platform);
            }
        }

        if (!!eventParams) {
            eventData["event_data"] = JSON.stringify(eventParams);
        }

        this._logQueue.push(eventData);
        if (typeof this._flushCallback == "undefined") {
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
        this._flushCallback = undefined;

        if (this._flushing || this._logQueue.length <= 0) {
            return;
        }

        this._flushing = true;

        this._submittedEventCount = this._logQueue.length;
        let data = EscapeJSONString(JSON.stringify(this._logQueue));
        if (this._settings & SettingsFlags.Base64Encode) {
            data = btoa(data);
        }
        const toPost = "data=" + encodeURIComponent(data);

        // Debugging
        if ((this._settings & SettingsFlags.Debug) != 0) {
            console.log(
                "[DEBUG OGDLogger] current batch: ",
                JSON.stringify(this._logQueue),
                "\nab to post to:",
                this._endpoint
            );
        }

        // @ts-ignore
        xhttp.open("POST", this._endpoint);
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
                
                if (status === 0 || (status >= 200 && status < 400)) {
                    if ((this._settings & SettingsFlags.Debug) != 0) {
                        console.log(
                            "[DEBUG OGDLogger:xhttp] Great success\n",
                            "response:",
                            xhttp.responseText
                        );
                    }
                    this._logQueue.splice(0, this._submittedEventCount);
                } else {
                    console.error(
                        "[OGDLogger] XMLHttpRequest returned error status: ",
                        status
                    );
                }

                //if we have built up some events while flushing, keep flushing
                if (this._logQueue.length >= 0) {
                    this.flush();
                }
            }
        };
    }
}