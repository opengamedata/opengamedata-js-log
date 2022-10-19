# opengamedata-js-log

Javascript package for logging with Field Day's OpenGameData.

## Version Log

1. Initial version
2. support for Firebase Analytics integration;

## Setup

using npm:

`$ npm i opengamedata-js-log`

## Contents

- `OGDLogger`: handles communication with the OpenGameData databases using Ajax

- `LogEvent`: wrapper class for the data objects that get sent through `OGDLog`

## Logging

An instance of the `OGDLogger` can be created with the following format:

`const ogdLogger = new OGDLogger(firebaseConfig);`

- `firebaseConfig`: an optional firebase app configuration object, used to enable logging to firebase

To send a user id along with every event, call `OGDLogger.SetUserId(userId);`

### Events

You can send events using a `LogEvent` object, which takes the following arguments:

- `Eventname: string`: a data value representing the type for the given event
- `Eventparams: object`: an enum or string value to represent the given event type

Once a `LogEvent` object is constructed with the given data, this function will attempt to write it's payload to the OGDLogger's CustromEventParams buffer which can then be passed into the `OGDLogger.Log()` function.
This will then log it using a sequence of calls similar to those listed in the previous section.

### Firebase Analytics

Coming soon... (v1.1.0)

## Debugging

`OGDLogger.SetDebug()` can be called to set the logger's debug flag. If set, all requests and responses associated with OpenGameData event logging will be logged to the console.

## Updating

To update the local package, run the following command:

`$ git submodule update --remote`

## Removal

`$ npm uninstall opengamedata-js-log`
