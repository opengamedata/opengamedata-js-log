# opengamedata-js-log

A Javascript service package for logging data in web games with OpenGameData's servers.

## Version Log

1. Initial version
2. Support for Firebase Analytics integration
3. Firebase Analytics Integration fully hooked up, API simplifications.

## Setup

using npm:

`$ npm i opengamedata-js-log`

## Contents

- `OGDLogger`: handles communication with the OpenGameData databases using Ajax

## Logging

An instance of the `OGDLogger` can be created with the following format:

`OGDLog log = new OGDLogger(myAppId, myAppVersion, firebaseConfig)`

- `myAppId`: an identifier for this app within the database (ex. "MASHOPOLIS")
- `myAppVersion`: the current version of the app for all logging events

- `firebaseConfig` (Optional): an optional firebase app configuration object, used to enable logging to firebase

To send a user id along with every event, call `OGDLogger.setUserId(userId);`

### Events

You can send events using the `OGDLogger.Log(eventName, eventParams)` method.

- `eventName`: event type identifier
- `eventParams`: (optional) object containing custom event parameters

### Schema Version

The logger can emit either the original `0.1` event schema or the OpenGameData
Event Standard `1.0`. It defaults to `1.0`, so a game that updates this package
moves to the new standard without any code change. To stay on the old schema:

```js
import { OGDSchemaVersion } from "opengamedata-js-log";

log.setSchemaVersion(OGDSchemaVersion.V0_1);
```

Under `V1_0`, `app_version` becomes `game_version`, and `source_version` (which
mirrors `game_version`) and `schema_version` are added.

### Firebase Analytics

You can optionally set up Firebase integration by either passing the `firebaseConfig` object into the `OGDLogger` constructor, or by calling `OGDLogger.useFirebase(firebaseConfig)` method. If Firebaase is configured, events will be sent to both Open Game Data as well as Firebase

## Debugging

`OGDLogger.setDebug()` can be called to set the logger's debug flag. If set, all requests and responses associated with OpenGameData event logging will be logged to the console.

## Updating

To update the local package, run the following command:

`$ git submodule update --remote`

## Removal

`$ npm uninstall opengamedata-js-log`
