// @ts-check
/**
 *   @fileoverview provides helpful methods for generating uris and identifiers used by the OGDLogger class refrencing the information in LogConsts
 *
 * Based on the implementation in LogUtils.cs in opengamedata-unity by Autumn Beauchesne
 *
 * @author Alex Grabowski <ajgrabowski@wisc.edu>
 *   @version 0.1.0
 */

import { OGDLogConsts, SessionConsts } from "./LogConsts";
import { SettingsFlags } from "./OGDLogger";

/**
 *  a helper function used to calculate a piece of the uuid
 *  @param {number} uuid - uniquie user id
 *  @param {number} input - number to be used; i.e. date section
 *  @param {number} multiply - multiplier to be used in funciton
 *  @returns a section
 */
function UUIDAccumulate(uuid, input, multiply) {
  return uuid * multiply + (input % multiply);
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
 * @returns generates the Open Game Data uri from information in ./LogConsts
 */
export function BuildOGDUrl() {
  let params = [
    "?app_id=",
    OGDLogConsts.AppId.toUpperCase(), //done automatically to force convention
    "&app_version=",
    OGDLogConsts.AppVersion,
    ...(OGDLogConsts.AppBranch ? ["&appbranch", OGDLogConsts.AppBranch] : []),
    "&log_version=",
    OGDLogConsts.LogVersion,
    "&session_id=",
    SessionConsts.SessionId,
    ...(SessionConsts.UserId ? ["&user_id=", SessionConsts.UserId] : []),
    ...(SessionConsts.UserData ? ["&user_data=", SessionConsts.UserData] : []),
  ];
  const url = OGDLogConsts.LogEndpoint.concat(...params); // base for the logging endpoint

  if ((this.m_Settings & SettingsFlags.Debug) != 0) {
    console.log("[OGDLogger] ab to post to:", url);
  }
  const uri = encodeURI(url);
  return uri;
}
