// @ts-check
/**
 *   @fileoverview provides helpful methods for generating uris and identifiers used by the OGDLogger class refrencing the information in LogConsts
 *
 * Based on the implementation in LogUtils.cs in opengamedata-unity by Autumn Beauchesne
 *
 * @author Alex Grabowski <ajgrabowski@wisc.edu>
 *   @version 0.1.0
 */
import { OGDLogConsts, OGDLogVersion, OGDSchemaVersion, SessionConsts } from "./LogConsts";

/**
 *  a helper function used to calculate a piece of the uuid
 *  @param {number} uuid - uniquie user id
 *  @param {number} input - number to be used; i.e. date section
 *  @param {number} multiply - multiplier to be used in funciton
 *  @returns a section
 */
function UUIDAccumulate(uuid, input, multiply) {
    return uuid * multiply + ((input | 0) % multiply);
}

/**
 * @returns a 17-digit unique identifier using the current datetime.
 */
export function UUIDint() {
    let uuid = 0;

    let now = new Date();

    uuid = UUIDAccumulate(uuid, now.getFullYear(), 100);
    uuid = UUIDAccumulate(uuid, now.getMonth(), 100);
    uuid = UUIDAccumulate(uuid, now.getDate(), 100);
    uuid = UUIDAccumulate(uuid, now.getHours(), 100);
    uuid = UUIDAccumulate(uuid, now.getMinutes(), 100);
    uuid = UUIDAccumulate(uuid, now.getSeconds(), 100);
    uuid = UUIDAccumulate(uuid, Math.random() * 10, 10);
    uuid = UUIDAccumulate(uuid, Math.random() * 10, 10);
    uuid = UUIDAccumulate(uuid, Math.random() * 10, 10);
    uuid = UUIDAccumulate(uuid, Math.random() * 10, 10);
    uuid = UUIDAccumulate(uuid, Math.random() * 10, 10);

    return uuid;
}

/**
 * replaces confusing or ambigious characters in a given sting for sending JSON objects to the database
 *
 * @param {string} text - string to be formatted
 */
export function EscapeJSONString(text) {
    if (text.length == 0 || text == null) return;

    const escapedText = text
        .replace(/\\n/g, "\\n")
        .replace(/\\'/g, "\\'")
        .replace(/\\"/g, '\\"')
        .replace(/\\&/g, "\\&")
        .replace(/\\r/g, "\\r")
        .replace(/\\t/g, "\\t")
        .replace(/\\b/g, "\\b")
        .replace(/\\f/g, "\\f");

    return escapedText;
}

/**
 * @returns {string} generates the Open Game Data uri from information in ./LogConsts
 */
export function BuildOGDUrl() {
    if (OGDLogConsts.SchemaVersion !== OGDSchemaVersion.V0_1) {
        // log.php reads the rest of the v1.0 session fields from the request body, see BuildOGDSessionParams
        return OGDLogConsts.Endpoint.concat("?game_id=", OGDLogConsts.AppId.toUpperCase(), "&schema_version=", OGDSchemaVersion.V1_0);
    }

    let params = [
        "?app_id=",
        OGDLogConsts.AppId.toUpperCase(), //done automatically to force convention
        "&app_version=",
        OGDLogConsts.AppVersion,
        ...(OGDLogConsts.AppBranch ? ["&appbranch=", encodeURIComponent(OGDLogConsts.AppBranch)] : []),
        "&log_version=",
        encodeURIComponent(OGDLogConsts.ClientLogVersion),
        "&session_id=",
        SessionConsts.SessionId.toString(),
        ...(SessionConsts.UserId ? ["&user_id=", encodeURIComponent(SessionConsts.UserId)] : []),
        ...(SessionConsts.UserData ? ["&user_data=", encodeURIComponent(SessionConsts.UserData)] : []),
    ];

    return OGDLogConsts.Endpoint.concat(...params); // base for the logging endpoint
}

/**
 * @param {object} [gameConfiguration]
 * @param {object} [platform]
 * @returns {string} the session fields sent as form fields ahead of the event data under OGDSchemaVersion.V1_0,
 * ending in "&". Empty under OGDSchemaVersion.V0_1, where they're in the url.
 */
export function BuildOGDSessionParams(gameConfiguration = undefined, platform = undefined) {
    if (OGDLogConsts.SchemaVersion === OGDSchemaVersion.V0_1) {
        return "";
    }

    let params = [
        "log_version=",
        encodeURIComponent(OGDLogConsts.ClientLogVersion),
        // source_version mirrors game_version: this library only logs events the game itself produced
        "&game_version=",
        encodeURIComponent(OGDLogConsts.AppVersion),
        "&source_version=",
        encodeURIComponent(OGDLogConsts.AppVersion),
        "&session_id=",
        SessionConsts.SessionId.toString(),
        ...(OGDLogConsts.AppBranch ? ["&condition=", encodeURIComponent(OGDLogConsts.AppBranch)] : []),
        ...(SessionConsts.UserId ? ["&player_id=", encodeURIComponent(SessionConsts.UserId)] : []),
        ...(SessionConsts.InstanceId ? ["&instance_id=", encodeURIComponent(SessionConsts.InstanceId)] : []),
        // context that shouldn't change during a session is sent here instead of with each event
        ...(gameConfiguration ? ["&game_configuration=", encodeURIComponent(JSON.stringify(gameConfiguration))] : []),
        ...(platform ? ["&platform=", encodeURIComponent(JSON.stringify(platform))] : []),
        ...(SessionConsts.UserData ? ["&player_history=", encodeURIComponent(JSON.stringify(SessionConsts.UserData))] : []),
        "&"
    ];

    return "".concat(...params);
}
