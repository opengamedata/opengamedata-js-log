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

To send an instance id along with every event (schema `1.0` only), call `OGDLogger.setInstanceId(instanceId);`

### Events

You can send events using the `OGDLogger.Log(eventName, eventParams)` method.

- `eventName`: event type identifier
- `eventParams`: (optional) object containing custom event parameters

### Event Codes

Under schema `1.0`, every event carries an `event_id` from the OpenGameData event standard. `OGDEvents` holds
the codes grouped by category and family. Use `logEvent` to send one:

```js
import { OGDEvents } from "opengamedata-js-log";

log.logEvent(OGDEvents.PlayerAction.PointAndClick.SelectObject, "select_crate", { crate: 3 });
```

Events logged with `log(eventName, eventParams)` are sent with an `event_id` of `0`. For game-specific events,
use a code from the `X900`-`X999` range of any block, or from the `9000` block. `src/OGDEvents.js` is generated
from the standard in `ogd-standards`, so don't edit it by hand.

### Schema Version

The logger can emit either the original `0.1` event schema or the OpenGameData
Event Standard `1.0`. It defaults to `1.0`, so a game that updates this package
moves to the new standard without any code change. To stay on the old schema:

```js
import { OGDSchemaVersion } from "opengamedata-js-log";

log.setSchemaVersion(OGDSchemaVersion.V0_1);
```

Under `V1_0`:

- `app_id`, `app_version`, `user_id`, `user_data`, `event_sequence_index` and `client_time`
are sent as `game_id`, `game_version`, `player_id`, `player_history`, `session_sequence_index`
and `timestamp`. `timestamp` is in UTC.
- `source_version` (which mirrors `game_version`) and `schema_version` are added.
- Each event also carries `game_time` (seconds since the session started) and `platform`
(the browser's user agent, filled in automatically).

### Game Segment

The `game_segment` parameter records where the player is within the game's
structural progression, such as the current level, quest, or region. Like the
game state, it is attached to every event until it changes. It is not sent while
the logger is set to `OGDSchemaVersion.V0_1`.

```js
log.setGameSegment({ level: "reef-3", attempt: 2 });
log.clearGameSegment();
```

### Game Configuration and Private Metadata

`game_configuration` and `private_metadata` are attached to every event until they change. Pass
`undefined` to clear them. Both are only sent under schema `1.0`.

```js
log.setGameConfiguration({ difficulty: "hard" });
log.setPrivateMetadata({ classroom: "7b" });
```

### Firebase Analytics

You can optionally set up Firebase integration by either passing the `firebaseConfig` object into the `OGDLogger` constructor, or by calling `OGDLogger.useFirebase(firebaseConfig)` method. If Firebaase is configured, events will be sent to both Open Game Data as well as Firebase

## Debugging

`OGDLogger.setDebug()` can be called to set the logger's debug flag. If set, all requests and responses associated with OpenGameData event logging will be logged to the console.

## Updating

To update the local package, run the following command:

`$ git submodule update --remote`

## Removal

`$ npm uninstall opengamedata-js-log`
