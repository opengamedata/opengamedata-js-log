// @ts-check
/**
 *   @fileoverview Based on the implementation in OGDLog.cs in opengamedata-unity by Autumn Beauchesne
 *   Handles Communication with the logging features of the OpenGameData servers
 *   Additional Functionality for Firebase
 *
 *   @author Alex Grabowski <ajgrabowski@wisc.edu>
 *   @version 1.0.0
 */
import { SessionConsts } from "./LogConsts";
import { BuildOGDUrl, EscapeJSONString } from "./LogUtils";

const xhttp = new XMLHttpRequest();
export let instance = null;

// store the current state of the logger
const StatusFlags = {
  Initalized: 1,
  Flushing: 2,
};

/**
 * Dictates debug output and base64 encoding
 * */
const SettingsFlags = {
  Debug: 0x01,
  Base64Encode: 0x02,
};

// Identifiers for logging modules
export const ModuleID = {
  OGD: 0,
  Firebase: 1,
};

// Enum indicating the status of a module
export const ModuleStatus = {
  Uninitialized: 0,
  Preparing: 1,
  Ready: 2,
  Error: 3,
};

export class OGDLogger {
  /**
   * @param {*} firebaseConfig (optional) - your app's Firebase project configuration object; If no object is provided, Firebase module will not be initialized
   */
  constructor(firebaseConfig = null) {
    this.s_Instance;

    this.m_Endpoint = null;
    // state
    this.m_EventSequence = 0;
    this.m_StatusFlags = undefined;
    this.m_Settings;
    this.m_ModuleStatus = [Object.keys(ModuleID).length];
    // used when addeding custom params to an open event
    this.m_EventCustomParamsBuffer = {};
    // holds the current event stream as an array; this event will then be added to the toLogQueue and cleared the end of BeginEvent
    this.m_EventStream = {};
    // a standby Queue to hold LogEvents to submit to database on Flush()
    this.m_toLogQueue = [];

    this.m_Settings = SettingsFlags.Base64Encode;
    this.m_ModuleStatus[ModuleID.OGD] = ModuleStatus.Preparing;

    // setup the class
    this.Initalize(firebaseConfig);
  }

  /**
   * @returns current instance of this singleton class
   */
  static getInstance() {
    // @ts-ignore
    if (!instance) instance = new OGDLogger();
    return instance;
  }

  /**
   * @param {typeof ModuleID.param} module to check
   * @returns frequently reused conditional boolean
   */
  ModuleReady(module) {
    return this.m_ModuleStatus[module] == ModuleStatus.Ready;
  }

  /**
   * @param {typeof ModuleID.param} module
   * @param {typeof ModuleStatus.param} status
   */
  SetModuleStatus(module, status) {
    this.m_ModuleStatus[module.value] = status;
  }

  /**
   * Set up the application constants and activiate the ready modules
   * @param {*} firebaseConfig (optional) - your app's Firebase project configuration object; If no object is provided, Firebase module will not be initialized
   */
  Initalize(firebaseConfig) {
    if (instance != null && instance != this.s_Instance)
      throw "[Error] Cannot have multiple instances of OGDLog";

    // @ts-ignore
    instance = this.s_Instance = this;
    this.m_Endpoint = BuildOGDUrl();

    this.m_StatusFlags |= StatusFlags.Initalized;
    this.m_ModuleStatus[ModuleID.OGD] = ModuleStatus.Ready;

    if (firebaseConfig) {
      if (this.ModuleReady(ModuleID.Firebase)) {
        //TODO Firebase_SetAppConsts();
      }
    }
  }

  /**
   * Allows caller to modify the UserId and UserData of the SessionConsts.
   * Additionallty triggers a rebuild of the OGD endpoint
   *
   * @param {string} userId
   * @param {object} userData
   */
  SetUserId(userId, userData = null) {
    if (SessionConsts.UserId != userId || SessionConsts.UserData != userData) {
      SessionConsts.UserId = userId;
      SessionConsts.UserData = userData;
      this.m_Endpoint = BuildOGDUrl();

      if (this.ModuleReady(ModuleID.Firebase)) {
        //TODO FB_SetSessionConsts(constants);
      }
    }
  }

  /**
   * Configures settings for the logger modules
   * @param {SettingsFlags} settings
   */
  SetSettings(settings) {
    // @ts-ignore
    this.m_Settings = settings;

    if (this.ModuleReady(ModuleID.Firebase)) {
      //TODO Firebase_ConfigureSettings(constants);
    }
  }

  /**
   * Sets the debug settings flags.
   * @param {boolean} debug - shall we?
   */
  SetDebug(debug) {
    if (debug) {
      // @ts-ignore
      this.SetSettings(this.m_Settings | SettingsFlags.Debug);
    } else {
      // @ts-ignore
      this.SetSettings(this.m_Settings | ~SettingsFlags.Debug);
    }
  }

  /**
   * Indicates that this should also log to Firebase
   *
   * @param {*} firebaseConfig - object for your Firebase App's project configuration object
   */
  // @ts-ignore
  UseFirebase(firebaseConfig) {
    //TODO Firebase_Prepare();
  }

  //* Events */

  /**
   * Write an event parameter to the m_EventCustomParamsBuffer to be added to 'event_data"
   * @param {string} name - of the paramater
   * @param {object} value - of the parameter
   */
  WriteCustomEventParam(name, value) {
    console.log("[DEBUG OGDLogger] writting custom event params");
    this.m_EventCustomParamsBuffer[name] = value;

    if (this.ModuleReady(ModuleID.Firebase)) {
      //TODO Firebase_SetEventParam(parameterName, parameterValue);
    }
  }

  /**
   * Write an event parameter to the m_EventStream
   * @param {string} name - of the paramater
   * @param {object} value - of the parameter
   */
  WriteEventParam(name, value) {
    this.m_EventStream[name] = value;

    // console.dir(
    //   "[DEBUG] updating event stream: ",
    //   { this.m_EventStream }
    // );
  }

  /**
   * write our the params for our EventCustomParamsBuffer to the stream and empty it for the next event
   */
  EndEventCustomParams() {
    if (this.ModuleReady(ModuleID.OGD)) {
      this.WriteEventParam(
        "event_data",
        JSON.stringify(this.m_EventCustomParamsBuffer)
      );
    }
    // console.dir(
    //   "[DEBUG] Ending Custom Event Params:",
    //   { this.m_EventCustomParamsBuffer }
    // );
    this.m_EventCustomParamsBuffer = {};
  }

  /**
   * Finishes any unclosed events
   */
  FinishEventData() {
    this.EndEventCustomParams();

    if (this.ModuleReady(ModuleID.Firebase)) {
      //TODO: this.Firebase_SubmitEvent();
    }
    //TODO: Firebase_AttemptActivate();
  }

  /**
   * Begins the process of formatting an event to be sent from the OGD Logger
   * Should be called by Log()
   * @param {string} eventName
   */
  BeginEvent(eventName) {
    if ((this.m_StatusFlags & StatusFlags.Initalized) == 0) {
      throw "[Error] OGDLog must be initalized before any events are logged.";
    }

    let currDate = new Date();
    let currTime = currDate.getTime();
    let clientOffset = currDate.getTimezoneOffset();
    let eventSequenceIndex = this.m_EventSequence++;

    if (this.ModuleReady(ModuleID.OGD)) {
      this.WriteEventParam("client_time", currTime * 0.001);
      this.WriteEventParam("client_time_ms", currTime);
      this.WriteEventParam("event_name", eventName);

      // finish up custom event params and then write them as 'event_data'
      this.FinishEventData();

      this.WriteEventParam("event_source", null);
      this.WriteEventParam("client_offset", clientOffset * 60000);
      this.WriteEventParam("game_state", SessionConsts.UserData);
      this.WriteEventParam("event_sequence_index", eventSequenceIndex);
    }

    if (this.ModuleReady(ModuleID.Firebase)) {
      //TODO Firebase_NewEvent(eventName, eventSequenceIndex);
    }
    this.m_toLogQueue.push(this.m_EventStream);
    this.m_EventStream = {};
  }

  /**
   * called by Log() to defer the submitting of the event formatted by BeginEvent
   * setTimeout here defers dispatch until the end of the frame
   */
  SubmitEvent() {
    setTimeout(() => {
      this.Flush();
    }, 0);
  }

  /**
   * Flush the current toLogQueue to the database and handle the response
   */
  Flush() {
    //ignore flush if currently flushing
    if (
      (this.m_StatusFlags & StatusFlags.Flushing) != 0 ||
      this.m_toLogQueue.length <= 0
    )
      return;
    this.m_StatusFlags |= StatusFlags.Flushing;

    // generate post with the current EventStream
    if (this.ModuleReady(ModuleID.OGD)) {
      let batch = [];
      while (this.m_toLogQueue.length > 0) {
        batch.push(this.m_toLogQueue.pop());
      }

      const toPost =
        "data=" +
        encodeURIComponent(btoa(EscapeJSONString(JSON.stringify(batch))));

      // 🎵 Post it real good
      const ogdUrl = this.m_Endpoint;

      // Debugging
      if ((this.m_Settings & SettingsFlags.Debug) != 0) {
        console.log(
          "[DEBUG OGDLogger] current batch: ",
          JSON.stringify(batch),
          "/nab to post to:",
          ogdUrl
        );
      }

      // @ts-ignore
      xhttp.open("POST", ogdUrl);
      xhttp.setRequestHeader(
        "Content-Type",
        "application/x-www-form-urlencoded"
      );
      xhttp.send(toPost);
      // Handle response
      xhttp.onreadystatechange = () => {
        if (xhttp.readyState === XMLHttpRequest.DONE) {
          const status = xhttp.status;
          if (status === 0 || (status >= 200 && status < 400)) {
            if ((this.m_Settings & SettingsFlags.Debug) != 0) {
              console.log(
                "[DEBUG OGDLogger:xhttp] Great success\n",
                "response:",
                xhttp.responseText
              );
            }
          } else {
            console.error(
              "[OGDLogger] XMLHttpRequest returned error status: ",
              status
            );
          }
          this.m_StatusFlags &= ~StatusFlags.Flushing;
          //if we have built up some events while flushing, keep flushing
          if (this.m_toLogQueue.length >= 0) {
            this.Flush();
          }
        }
      };
    }
  }

  /**
   * Main function called externally to submit an event to OGD database
   * @param {typeof LogEvent} logEvent - the event that we which to send to the database
   */
  Log(logEvent) {
    // @ts-ignore
    this.BeginEvent(logEvent.eventName);
    this.SubmitEvent();
  }
}

/**
 * An wrapper 'class' used for submitting events from the Logger
 * Once created, this function will attempt to write it's payload to the CustromEventParams buffer
 *
 * @param {string} EventName - name of the event to be submitted
 * @param {object} EventParams - the payload for the event
 */
export function LogEvent(EventName, EventParams) {
  this.eventName = EventName;
  this.eventParams = EventParams;

  for (const key in EventParams) {
    let value = EventParams[key];
    // @ts-ignore
    OGDLogger.getInstance().WriteCustomEventParam(key, value);
  }
}
