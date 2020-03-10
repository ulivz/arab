const toString = obj => Object.prototype.toString.call(obj)

exports.isPlainObject = obj => toString(obj) === '[object Object]'
