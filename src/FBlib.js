export const OGDLogFirebaseLib = {
  $FirebaseCache: {
    /**
     * Session constants.
     */
    sessionConsts: {
      /** @type {string} */ user_id: null,
      /** @type {string} */ user_data: null,
    },

    /**
     * Application constants.
     */
    appConsts: {
      /** @type {string} */ app_version: null,
      /** @type {string} */ app_flavor: null,
      /** @type {number} */ log_version: 1,
    },

    /**
     * Legacy configuration options
     */
    legacyConfig: {
      /** @type {string} */ copyUserIdToParameters: "user_code",
    },

    /**
     * App instance.
     * @type {FirebaseApp}
     */
    appInstance: null,

    /**
     * Analytics instance.
     * @type {FirebaseAnalytics}
     */
    analyticsInstance: null,

    /**
     * Current event instance.
     * @type {object}
     */
    currentEventInstance: {},

    /**
     * Current event identifier.
     * @type {string}
     */
    currentEventId: null,

    /**
     * Tracks if analytics is loading.
     * @type {string}
     */
    analyticsState: null,

    /**
     * Default logging parameters.
     * @type {object}
     */
    defaultParameters: {},

    /**
     * Syncs constants.
     */
    SyncSettings: function () {
      if (!FirebaseCache.analyticsInstance) {
        return;
      }

      // copy user properties
      FirebaseCache.analyticsInstance.setUserId(
        FirebaseCache.sessionConsts.user_id || ""
      );
      FirebaseCache.analyticsInstance.setUserProperties({
        user_data: FirebaseCache.sessionConsts.user_data || "",
      });

      // copy app constants to default parameters
      Object.assign(FirebaseCache.defaultParameters, FirebaseCache.appConsts);

      // if we're using legacy logging, copy user id to the parameters too
      if (FirebaseCache.legacyConfig.copyUserIdToParameters != null) {
        FirebaseCache.defaultParameters[FirebaseCache.copyUserIdToParameters] =
          FirebaseCache.sessionConsts.user_id;
      }
    },
  },

  /**
   * Prepares the analytics module.
   * @param {typeof FirebaseConsts} consts
   * @returns
   */
  OGDLog_FirebasePrepare: function (consts) {
    if (FirebaseCache.appInstance || FirebaseCache.analyticsState) {
      return;
    }

    FirebaseCache.analyticsState = "loading";

    const appConfig = FirebaseConsts;

    // ensure these get loaded in sequence
    const scriptQueue = [
      "https://www.gstatic.com/firebasejs/9.10.0/firebase-app-compat.js",
      "https://www.gstatic.com/firebasejs/9.10.0/firebase-analytics-compat.js",
    ];

    function onScriptError() {
      if (FirebaseCache.analyticsState != "error") {
        FirebaseCache.analyticsState = "error";
        console.error("[Firebase] Initialization failed");
        if (onFinished) {
          dynCall_vi(onFinished, 1);
        }
      }
    }

    function finishInitializing() {
      FirebaseCache.analyticsState = "loaded";
      try {
        FirebaseCache.appInstance = firebase.initializeApp(appConfig);
        FirebaseCache.analyticsInstance = FirebaseCache.appInstance.analytics();
        gtag("config", "ID", {
          cookie_flags: "max-age=7200;secure;samesite=none",
        });
      } catch (e) {
        FirebaseCache.analyticsInstance = null;
        onScriptError();
      }

      if (!FirebaseCache.analyticsInstance) {
        onScriptError();
      } else {
        FirebaseCache.SyncSettings();
        if (onFinished) {
          dynCall_vi(onFinished, 0);
        }
      }
    }

    function loadNextScript() {
      if (FirebaseCache.analyticsState != "loading") {
        return;
      }

      if (scriptQueue.length > 0) {
        var scriptPath = scriptQueue.shift();
        var loadElement = document.createElement("script");
        loadElement.src = scriptPath;
        loadElement.onload = loadNextScript;
        loadElement.onerror = onScriptError;
        loadElement.crossOrigin = "anonymous";
        document.head.appendChild(loadElement);
      } else {
        finishInitializing();
      }
    }

    loadNextScript();
  },

  /**
   * Returns if Firebase Logging is ready.
   * @returns {boolean}
   */
  OGDLog_FirebaseReady: function () {
    return !!FirebaseCache.analyticsInstance;
  },

  /**
   * Returns if Firebase Logging is loading.
   * @returns {boolean}
   */
  OGDLog_FirebaseLoading: function () {
    return FirebaseCache.analyticsState == "loading";
  },

  /**
   * Sets the session constants.
   * @param {string} userId
   * @param {string} userData
   */
  OGDLog_FirebaseSetSessionConsts: function (userId, userData) {
    var sessionConsts = FirebaseCache.sessionConsts;
    sessionConsts.user_id = Pointer_stringify(userId);
    sessionConsts.user_data = Pointer_stringify(userData);
    FirebaseCache.SyncSettings();
  },

  /**
   * Sets application constants.
   * @param {string} appVersion
   * @param {string} appFlavor
   * @param {number} logVersion
   */
  OGDLog_FirebaseSetAppConsts: function (appVersion, appFlavor, logVersion) {
    var appConsts = FirebaseCache.appConsts;
    appConsts.app_version = Pointer_stringify(appVersion);
    appConsts.app_flavor = Pointer_stringify(appFlavor);
    appConsts.log_version = logVersion;
    FirebaseCache.SyncSettings();
  },

  /**
   * Configures a legacy option.
   * @param {string} optionId
   * @param {string} value
   */
  OGDLog_FirebaseConfigureLegacyOption: function (optionId, value) {
    FirebaseCache.legacyConfig[Pointer_stringify(optionId)] = value;
    FirebaseCache.SyncSettings();
  },

  /**
   * Begins a new Firebase event.
   * @param {string} eventName
   * @param {number} sequenceIndex
   */
  OGDLog_FirebaseNewEvent: function (eventName, sequenceIndex) {
    FirebaseCache.currentEventId = Pointer_stringify(eventName);
    FirebaseCache.currentEventInstance = {
      event_sequence_index: sequenceIndex,
    };
    Object.assign(
      FirebaseCache.currentEventInstance,
      FirebaseCache.defaultParameters
    );
  },

  /**
   * Adds a number parameter to the current event.
   * @param {string} paramName
   * @param {number} numValue
   */
  OGDLog_FirebaseEventNumberParam: function (paramName, numValue) {
    FirebaseCache.currentEventInstance[Pointer_stringify(paramName)] = numValue;
  },

  /**
   * Adds a string parameter to the current event.
   * @param {string} paramName
   * @param {string} stringVal
   */
  OGDLog_FirebaseEventStringParam: function (paramName, stringVal) {
    FirebaseCache.currentEventInstance[Pointer_stringify(paramName)] =
      Pointer_stringify(stringVal);
  },

  /**
   * Adds a default number parameter.
   * @param {string} paramName
   * @param {number} numValue
   */
  OGDLog_FirebaseDefaultNumberParam: function (paramName, numValue) {
    FirebaseCache.defaultParameters[Pointer_stringify(paramName)] = numValue;
  },

  /**
   * Adds a default string parameter.
   * @param {string} paramName
   * @param {string} stringVal
   */
  OGDLog_FirebaseDefaultStringParam: function (paramName, stringVal) {
    FirebaseCache.defaultParameters[Pointer_stringify(paramName)] =
      Pointer_stringify(stringVal);
  },

  /**
   * Submits the current event instance.
   */
  OGDLog_FirebaseSubmitEvent: function () {
    if (FirebaseCache.currentEventId) {
      FirebaseCache.analyticsInstance.logEvent(
        FirebaseCache.currentEventId,
        FirebaseCache.currentEventInstance
      );
      FirebaseCache.currentEventId = null;
      FirebaseCache.currentEventInstance = {};
    }
  },
};
