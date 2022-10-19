/**
 *   @fileoverview Based on the implementation in OGDLog.Firebase in opengamedata-unity by Autumn Beauchesne
 *   Handles Communication with the Firebase specific logging features of the OpenGameData servers
 *   Imported as a module by the OGD Logger
 *
 *   @author Alex Grabowski <ajgrabowski@wisc.edu>
 *   @version 1.0.0
 */

import { SessionConsts, FirebaseConsts } from "./LogConsts";
import { ModuleStatus, ModuleID, OGDLogger } from "./OGDLogger";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import * as FBLib from "FirebaseLib";

const FBApp = initializeApp(FirebaseConsts);
export const FBAnalytics = getAnalytics(FBApp);

export class FirebaseLogger {
  s_ModuleStatus = ModuleStatus.Uninitialized;
  m_EventCustomParamsBuffer = {};

  ActivateFB() {
    if (this.s_ModuleStatus != ModuleStatus.Preparing) return;

    if (this.s_ModuleStatus > ModuleStatus.Preparing) {
      OGDLogger.getInstance().SetModuleStatus();
      if (this.s_ModuleStatus == ModuleStatus.Ready) {
        this.FB_SetSessionConsts();
        this.FB_SetAppConsts();
        this.FB_ConfigurationSettings();
      }
    }
  }

  /**
   * @param {int} errorco - the error code
   */
  FB_PrepareFinish(errorco) {
    if (errorco != 0) {
      this.s_ModuleStatus = ModuleStatus.Error;
      console.error("[OGDLog.Firebase] Firebase could not be initialized");
      OGDLogger.getInstance().SetModuleStatus(
        ModuleID.Firebase,
        ModuleStatus.Error
      );
    } else {
      this.s_ModuleStatus = ModuleStatus.Ready;
    }

    OGDLogger.getInstance().Activate();
  }

  FB_Prepare() {
    OGDLogger.SetModuleStatus(ModuleID.Firebase, ModuleStatus.Preparing);
    FBLib.OGDLog_FirebasePrepare(FirebaseConsts);
  }

  FB_SetSessionConsts() {
    let SessionConsts;

    FBAnalytics.setUserId(SessionConsts.UserId);

    if (SessionConsts.UserId) {
      FBAnalytics.setUserProperties({ user_data: SessionConsts.UserData });
    } else {
      FBAnalytics.setUserProperties({ user_data: null });
    }
  }

  FB_SetAppConsts() {
    FBLib.OGDLog_FirebaseSetAppConsts();
  }

  FB_ConfigurationSettings() {
    throw new Error("Method not implemented.");
  }
}
