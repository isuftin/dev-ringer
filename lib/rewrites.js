/**
 * Create a global regex of a hostname
 * @param  {string} host
 * @return {RegExp} A global RegExp of the hostname
 */
function regexify(host) {
  let cleanedHost = host
    .replace(/\./g, '\\.')
    .replace(/\//g, '\\/');
  return new RegExp(cleanedHost, 'g');
}

/**
 * Globally replace a string
 * @param  {string} content rewrite this
 * @param  {string} search  search for this within the content
 * @param  {string} replace replace any matches with this
 * @return {string}         The rewritten content
 */
function rewrite(content, search, replace) {
  let result = content;
  if (content && 'string' === typeof content) {
    result = content.replace(regexify(search), replace);
  }
  return result;
}

/**
 * Creates a middleware callback ready to rewrite the header
 * @param  {string} headerKey rewrite this header if it exists
 * @param  {string} search    search for this within the header value
 * @param  {string} replace   replace any matches with this
 * @return {Function} a middleware filter
 */
function rewriteHeader(headerKey, search, replace) {
  return function(req, res) {
    let _writeHead = res.writeHead;
    res.writeHead = function(statusCode, statusMessage, headers) {
      if (res.hasHeader(headerKey)) {
        res.setHeader(headerKey, rewrite(res.getHeader(headerKey), search, replace));
      }
      _writeHead.call(res, statusCode, statusMessage, headers);
    }
    return true;
  }
}

/**
 * Creates a middleware callback ready to rewrite the body.
 * @param  {string} search search for this within the response body
 * @param  {string} replace replace any matches with this
 * @return {Function} a middleware filter
 */
function rewriteBody(search, replace) {
  return function(req, res) {
    let _write = res.write;
    res.write = function(data) {
      _write.call(res, rewrite(data.toString(), search, replace));
    };
    return true;
  };
}

module.exports = {
  regexify,
  rewrite,
  rewriteHeader,
  rewriteBody,
};
