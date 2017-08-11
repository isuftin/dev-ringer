class Rule {
  /**
   * Creates a Rule
   * @param  {string} name For logging purposes
   * @param  {Function} handler (req, res) return true to continue the chain.
   * @param  {string} path Optional
   * @return {[type]}         [description]
   */
  constructor({name, handler, path}) {
    this.name = name;
    this.handler = handler;
    this.path = path;
  }
}

module.exports = Rule;
