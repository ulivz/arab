const SCRIPT_LIKE_REG = /\.(ts|tsx|jsx)$/i
const VUE_REG = /\.(vue)$/i
const LESS_REG = /\.(less)$/i

module.exports = function () {
  return {
    visitor: {
      ImportDeclaration(path) {
        const { source } = path.node
        if (source.value.match(SCRIPT_LIKE_REG)) {
          source.value = source.value.replace(SCRIPT_LIKE_REG, '.js')
        } else if (source.value.match(VUE_REG)) {
          source.value = source.value.replace(VUE_REG, '.js')
        } else if (source.value.match(LESS_REG)) {
          source.value = source.value.replace(LESS_REG, '.css')
        }
      },
    },
  }
}
