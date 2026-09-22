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
 * Version of the OpenGameData event schema to emit, as sent on the wire.
 * @typedef {string} OGDSchemaVersion
 */
export const OGDSchemaVersion = {
    V0_1: "0.1",
    V1_0: "1.0"
};

Object.freeze(OGDSchemaVersion);

/**
 * @typedef OGDLogConsts
 * @property {string} AppId - Identifier for the app. Should match the name of the game in the database.
 * @property {string} AppVersion - The current version of the app.
 * @property {string} [AppBranch] - The current branch of the app.
 * @property {string} ClientLogVersion - Client logging version
 * @property {string} SchemaVersion - Event schema version this logger emits
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
    ClientLogVersion: "v0.1.1",
    SchemaVersion: OGDSchemaVersion.V1_0
};

Object.seal(OGDLogConsts);
