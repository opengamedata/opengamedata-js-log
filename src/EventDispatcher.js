let instance = null;

/**
 * A custom Phaser EventEmitter singleton used to dispatch custom Phaser events to OGDLogger
 */
export class EventDispatcher extends Phaser.Events.EventEmitter {
  constructor() {
    super();
  }

  static getInstance() {
    if (instance == null) instance = new EventDispatcher();
    return instance;
  }
}
