import Component from '@ember/component';
import { task, timeout } from 'ember-concurrency';

export default Component.extend({
  // Params
  onChange: null,
  property: null,
  propertyPath: null,
  wait: 400,

  //HTML
  tagName: '',

  setValue: task(function * (newValue) {
    yield timeout(this.get('wait'));

    let actionToPerform = this.get('onChange');

    if (actionToPerform) {
      actionToPerform()
      this.set('property', newValue);
    } else {
      this.set('property', newValue);
    }
  }).restartable(),
});
