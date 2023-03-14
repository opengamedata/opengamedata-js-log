// @ts-check
/**
 * @fileoverview these objects store logging relivent session information to be refrenced later by the OGDLogger and LogUtils
 *
 * @version 1.1.0
 */
import * as LogUtil from "./LogUtils";

export const SessionConsts = {};

/**
 * Session-level constants
 *
 * SessionId - Unique identifier for this session.
 * UserId - (Optional) The player's unique personal identifier
 * UserData - (Optional) additional data associated with the player ID.
 */
Object.defineProperties(SessionConsts, {
  SessionId: { value: LogUtil.UUIDint(), writable: true },
  UserId: { value: null, writable: true },
  UserData: { value: null, writable: true },
});

export const OGDLogConsts = {};

/**
 * OGD logging constants
 *
 * AppId - Identifier for the app. Should match the name of the game in the database.
 * AppVersion - The current version of the app.
 * AppBranch - (Optional) The current branch of the app.
 * LogVersion - The version of the logging code.
 * ClientLogVersion - Client log version.
 * LogEndpoint - Endpoint base.
 */
Object.defineProperties(OGDLogConsts, {
  AppId: { value: "mashopolis", writable: true },
  AppVersion: { value: "0.1.0", writable: true },
  AppBranch: { value: null },
  LogVersion: { value: "opengamedata" },
  ClientLogVersion: { value: "v0.1.1" },
  LogEndpoint: {
    value: "https://fielddaylab.wisc.edu/logger/log.php",
  },
});
