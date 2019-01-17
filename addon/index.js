import { changeset } from 'ember-changeset';
import deepEqual from 'ember-changeset-history/utils/deep-equals';
import { set, get, computed } from '@ember/object'

const {
  keys,
  assign
} = Object;

const PAST = '_past';
const FUTURE = '_future';
const CHANGES = '_changes';
const ERRORS = '_errors';


export default class Changeset {
  /**
   * Changeset factory
   *
   * @class Changeset
   * @constructor
   */
  constructor() {
    return changesetHistory(...arguments).create();
  }
}

export function changesetHistory(obj, validateFn = () => true, validationMap = {}, {maxHistoryLength=0} = {}) {
  let changesetClass = changeset(...arguments);

  return changesetClass.extend({
    init() {
      this._super(...arguments);
      this[PAST] = [];
      this[FUTURE] = [];
    },

    lastState: computed(`${PAST}.[]`, function() {
      const pastStates = this[PAST];
      return pastStates.length ? pastStates[pastStates.length-1] : {};
    }),

    _setProperty() {
      const originalState = assign({}, this.snapshot());
      this._super(...arguments);

      if (deepEqual(this.snapshot(), originalState)) {
        return;
      }

      let newPast = [...this[PAST], originalState];
      if (maxHistoryLength) {
        newPast.splice(0, newPast.length - maxHistoryLength);
      }
      set(this, PAST, newPast);
      set(this, FUTURE, []);
    },

    canUndo: computed.bool(`${PAST}.length`),
    canRedo: computed.bool(`${FUTURE}.length`),

    undo() {
      if(!this.get('canUndo')) {
        return;
      }

      const currentState = assign({}, this.snapshot());
      const newState = get(this, 'lastState');

      const pastStates = this[PAST];
      set(this, PAST, pastStates.slice(0, pastStates.length - 1));
      set(this, FUTURE, [currentState, ...this[FUTURE]]);

      this._setCurrentState(newState);
      this._notifyChangedVirtualProperties(currentState, newState);
    },

    redo() {
      if(!this.get('canRedo')) {
        return;
      }

      const currentState = assign({}, this.snapshot());
      const futureStates = this[FUTURE];
      const newState = futureStates[0];

      set(this, PAST, [...this[PAST], currentState]);
      set(this, FUTURE, futureStates.slice(1, futureStates.length));

      this._setCurrentState(newState);
      this._notifyChangedVirtualProperties(currentState, newState)
    },

    merge() {
      let mergedChangeset = this._super(...arguments);
      return changesetHistory(mergedChangeset).create();
    },

    rollback() {
      const originalState = assign({}, this.snapshot());
      this._super(...arguments);

      if (deepEqual(this.snapshot(), originalState)) {
        return;
      }
      set(this, PAST, [...this[PAST], originalState]);
      set(this, FUTURE, []);
    },

    restore(snapshot) {
      this._super(...arguments);

      set(this, PAST, snapshot[PAST] || []);
      set(this, FUTURE, snapshot[FUTURE] || []);
    },

    save() {
      let past = get(this, PAST);
      let savePromise = this._super(...arguments);

      return savePromise.then(() => {
        set(this, PAST, past);
      });
    },

    snapshot() {
      const historicalState = {};
      historicalState[PAST] = this[PAST];
      historicalState[FUTURE] = this[FUTURE];

      return assign(this._super(...arguments), historicalState);
    },

    resetHistory() {
      set(this, PAST, []);
      set(this, FUTURE, []);
    },

    _setCurrentState: function (newState) {
      set(this, CHANGES, assign({}, newState.changes));
      set(this, ERRORS, assign({}, newState.errors));
    },

    _notifyChangedVirtualProperties(originalState, newState) {
      const allChangedKeys = [
        ...keys(originalState.changes),
        ...keys(originalState.errors),
        ...keys(newState.changes),
        ...keys(newState.errors)];

      const uniqueChangedKeys = [...new Set(allChangedKeys)];
      uniqueChangedKeys.forEach(key => {
        this.notifyPropertyChange(key);
      });
    }
  });
}
