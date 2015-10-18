/*eslint-disable*/
/**
 * AltContainer.
 *
 * There are many ways to use AltContainer.
 *
 * Using the `stores` prop.
 *
 * <AltContainer stores={{ FooStore: FooStore }}>
 *   children get this.props.FooStore.storeData
 * </AltContainer>
 *
 * You can also pass in functions.
 *
 * <AltContainer stores={{ FooStore: function () { return { storeData: true } } }}>
 *   children get this.props.FooStore.storeData
 * </AltContainer>
 *
 * Using the `store` prop.
 *
 * <AltContainer store={FooStore}>
 *   children get this.props.storeData
 * </AltContainer>
 *
 * Passing in `flux` because you're using alt instances
 *
 * <AltContainer flux={flux}>
 *   children get this.props.flux
 * </AltContainer>
 *
 * Using a custom render function.
 *
 * <AltContainer
 *   render={function (props) {
 *     return <div />;
 *   }}
 * />
 *
 * Using the `transform` prop.
 *
 * <AltContainer
 *   stores={{ FooStore: FooStore, BarStore: BarStore }}
 *   transform={function(stores) {
 *     var FooStore = stores.FooStore;
 *     var BarStore = stores.BarStore;
 *     var products =
 *       FooStore.products
 *         .slice(0, 10)
 *         .concat(BarStore.products);
 *     return { products: products };
 *   }}
 * >
 *   children get this.props.products
 * </AltContainer>
 *
 * Full docs available at http://goatslacker.github.io/alt/
 */
import React from 'react'
import assign from 'object.assign'

const id = it => it
const getStateFromStore = (store, props) => {
  return typeof store === 'function' ? store(props).value : store.getState()
}
const getStateFromKey = (actions, props) => {
  return typeof actions === 'function' ? actions(props) : actions
}

const getStateFromActions = (props) => {
  if (props.actions) {
    return getStateFromKey(props.actions, props)
  } else {
    return {}
  }
}

const getInjected = (props) => {
  if (props.inject) {
    return Object.keys(props.inject).reduce((obj, key) => {
      obj[key] = getStateFromKey(props.inject[key], props)
      return obj
    }, {})
  } else {
    return {}
  }
}

const reduceState = (props) => {
  return assign(
    {},
    getStateFromStores(props),
    getStateFromActions(props),
    getInjected(props)
  )
}

const getStateFromStores = (props) => {
  var stores = props.stores
  if (props.store) {
    return getStateFromStore(props.store, props)
  } else if (props.stores) {
    // If you pass in an array of stores then we are just listening to them
    // it should be an object then the state is added to the key specified
    if (!Array.isArray(stores)) {
      return Object.keys(stores).reduce(function (obj, key) {
        obj[key] = getStateFromStore(stores[key], props)
        return obj
      }, {})
    }
  } else {
    return {}
  }
}

// TODO need to copy some other contextTypes maybe?
// what about propTypes?
class AltContainer extends React.Component {
  static contextTypes = {
    flux: React.PropTypes.object,
  }

  static childContextTypes = {
    flux: React.PropTypes.object,
  }

  getChildContext() {
    var flux = this.props.flux || this.context.flux
    return flux ? { flux: flux } : {}
  }

  constructor(props) {
    super(props)

    if (props.stores && props.store) {
      throw new ReferenceError('Cannot define both store and stores')
    }

    this.storeListeners = []

    this.state = reduceState(props)
  }

  componentWillReceiveProps(nextProps) {
    this._destroySubscriptions()
    this.setState(reduceState(nextProps))
    this._registerStores(nextProps)
    if (this.props.onWillReceiveProps) {
      this.props.onWillReceiveProps(nextProps, this.props, this.context)
    }
  }

  componentDidMount() {
    this._registerStores(this.props)
    if (this.props.onMount) this.props.onMount(this.props, this.context)
  }

  componentWillUnmount() {
    this._destroySubscriptions()
    if (this.props.onWillUnmount) {
      this.props.onWillUnmount(this.props, this.context)
    }
  }

  _registerStores(props) {
    const stores = props.stores

    if (props.store) {
      this._addSubscription(props.store)
    } else if (props.stores) {
      if (Array.isArray(stores)) {
        stores.forEach(store => this._addSubscription(store))
      } else {
        Object.keys(stores).forEach((formatter) => {
          this._addSubscription(stores[formatter])
        })
      }
    }
  }

  _destroySubscriptions() {
    this.storeListeners.forEach(storeListener => storeListener())
  }

  _addSubscription(getStore) {
    const store = typeof getStore === 'function'
      ? getStore(this.props).store
      : getStore

    this.storeListeners.push(store.listen(this.altSetState))
  }

  altSetState = () => {
    this.setState(reduceState(this.props))
  }

  getProps() {
    var flux = this.props.flux || this.context.flux
    var transform = typeof this.props.transform === 'function'
      ? this.props.transform
      : id
    return transform(assign(
      flux ? { flux: flux } : {},
      this.state
    ))
  }

  shouldComponentUpdate(nextProps, nextState) {
    return this.props.shouldComponentUpdate
      ? this.props.shouldComponentUpdate(this.getProps(), nextProps, nextState)
      : true
  }

  render() {
    const Node = 'div'
    const children = this.props.children

    // Custom rendering function
    if (typeof this.props.render === 'function') {
      return this.props.render(this.getProps())
    } else if (this.props.component) {
      return React.createElement(this.props.component, this.getProps())
    }

    // Does not wrap child in a div if we don't have to.
    if (Array.isArray(children)) {
      return React.createElement(Node, null, children.map((child, i) => {
        return React.cloneElement(child, assign(
          { key: i },
          this.getProps()
        ))
      }))
    } else if (children) {
      return React.cloneElement(children, this.getProps())
    } else {
      return React.createElement(Node, this.getProps())
    }
  }
}

export default AltContainer
