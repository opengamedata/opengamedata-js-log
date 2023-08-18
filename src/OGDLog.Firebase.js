/**
 *   @fileoverview Based on the implementation in OGDLog.Firebase in opengamedata-unity by Autumn Beauchesne
 *   Handles Communication with the Firebase specific logging features of the OpenGameData servers
 *   Imported as a module by the OGD Logger
 *
 *   @author Alex Grabowski <ajgrabowski@wisc.edu>
 *   @version 1.0.0
 */

import { SessionConsts, OGDLogConsts } from "./LogConsts";
import { initializeApp, FirebaseOptions } from "firebase/app";
import { getAnalytics, Analytics, logEvent } from "firebase/analytics";

/** @type {FirebaseApp} */ let app = null;
/** @type {Analytics} */ let analytics = null;

/**
 * 
 * @param {FirebaseOptions} initializationParams 
 * @returns {boolean}
 */
export function InitializeFirebase(initializationParams) {
    try {
        app = initializeApp(initializationParams);
        analytics = getAnalytics(app);
        return true;
    } catch(e) {
        console.error("[OGDLog.Firebase] Failed to initialize firebase", e);
        return false;
    }
}

/**
 * 
 * @param {string} eventName 
 * @param {object} eventParams 
 * @param {number} sequenceIndex 
 * @param {OGDLogConsts} appConsts 
 */
export function LogFirebaseEvent(eventName, eventParams, sequenceIndex) {
    const evtData = {
        event_sequence_index: sequenceIndex,
        user_id: SessionConsts.UserId,
        user_data: SessionConsts.UserData,
        app_id: OGDLogConsts.AppId,
        app_flavor: OGDLogConsts.AppBranch,
        app_version: OGDLogConsts.AppVersion,
    };
    if (!!eventParams) {
        Object.assign(evtData, eventParams);
    }
    logEvent(analytics, eventName, evtData)
}