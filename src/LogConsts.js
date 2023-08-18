// @ts-check
/**
 * @fileoverview these objects store logging relevant session information to be referenced later by the OGDLogger and LogUtils
 *
 * @version 1.1.0
 */
import * as LogUtil from "./LogUtils";

/**
 * @typedef SessionConsts
 * @property {number} SessionId - Unique session identifier
 * @property {string} [UserId] - The player's unique personal identifier
 * @property {object} [UserData] - Additional data associated with the UserId.
 */

/**
 * @type {SessionConsts}
 */
export const SessionConsts = {
    SessionId: LogUtil.UUIDint(),
    UserId: null,
    UserData: null
};

Object.seal(SessionConsts);

/**
 * @typedef OGDLogConsts
 * @property {string} AppId - Identifier for the app. Should match the name of the game in the database.
 * @property {string} AppVersion - The current version of the app.
 * @property {string} [AppBranch] - The current branch of the app.
 * @property {string} ClientLogVersion - Client logging version
 */

export const OGDLogVersion = "opengamedata";
export const OGDLogEndpoint = "https://ogdlogger.fielddaylab.wisc.edu/logger/log.php";

/**
 * @type {OGDLogConsts}
 */
export const OGDLogConsts = {
    AppId: "mashopolis",
    AppVersion: "0.1.0",
    AppBranch: null,
    ClientLogVersion: "v0.1.1"
};

Object.seal(OGDLogConsts);
