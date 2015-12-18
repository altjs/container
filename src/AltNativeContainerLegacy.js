/*eslint-disable*/
/**
 * AltNativeContainer.
 *
 * @see AltContainer
 */
import React from 'react-native'
import mixinContainer from './mixinContainer'
import assign from 'object.assign'

const AltNativeContainer = React.createClass(assign({
  displayName: 'AltNativeContainer',

  render() {
    return this.altRender(React.View)
  }
}, mixinContainer(React)))

export default AltNativeContainer
