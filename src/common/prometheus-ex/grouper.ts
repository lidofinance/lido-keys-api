export class Grouper extends Map {
  /**
   * Adds the `value` to the `key`'s array of values.
   * @param {*} key Key to set.
   * @param {*} value Value to add to `key`'s array.
   * @returns {undefined} undefined.
   */
  public add(key, value) {
    if (this.has(key)) {
      this.get(key).push(value);
    } else {
      this.set(key, [value]);
    }
  }
}
