/*eslint-disable*/
import assign from 'object.assign'
import PropTypes from 'prop-types';

const id = it => it

const getStateFromStore = (store, props) => {
  return typeof store === 'function' ? store(props).value : store.getState()
}

const getStateFromKey = (actions, props) => {
  return typeof actions === 'function' ? actions(props) : actions
}

const mixinContainer = (React) => {
  const cloneElement = (element, props) => {
    return React.createElement(element.type, assign(
      {},
      element.props,
      props,
      { children: element.props.children }
    ))
  }

  return {
    contextTypes: {
      flux: PropTypes.object
    },

    childContextTypes: {
      flux: PropTypes.object
    },

    getChildContext() {
      var flux = this.props.flux || this.context.flux
      return flux ? { flux: flux } : {}
    },

    getInitialState() {
      if (this.props.stores && this.props.store) {
        throw new ReferenceError('Cannot define both store and stores')
      }

      this.storeListeners = []

      return this.reduceState(this.props)
    },

    componentWillReceiveProps(nextProps) {
      this.destroySubscriptions()
      this.setState(this.reduceState(nextProps))
      this.registerStores(nextProps)
    },

    componentDidMount() {
      this.registerStores(this.props)
      if (this.props.onMount) this.props.onMount(this.props, this.context)
    },

    componentWillUnmount() {
      this.destroySubscriptions()
    },

    registerStores(props) {
      var stores = props.stores

      if (props.store) {
        this.addSubscription(props.store)
      } else if (props.stores) {
        if (Array.isArray(stores)) {
          stores.forEach((store) => {
            this.addSubscription(store)
          })
        } else {
          Object.keys(stores).forEach((formatter) => {
            this.addSubscription(stores[formatter])
          })
        }
      }
    },

    destroySubscriptions() {
      this.storeListeners.forEach(storeListener => storeListener())
    },

    getStateFromStores(props) {
      var stores = props.stores
      if (props.store) {
        return getStateFromStore(props.store, props)
      } else if (props.stores) {
        // If you pass in an array of stores then we are just listening to them
        // it should be an object then the state is added to the key specified
        if (!Array.isArray(stores)) {
          return Object.keys(stores).reduce((obj, key) => {
            obj[key] = getStateFromStore(stores[key], props)
            return obj
          }, {})
        }
      } else {
        return {}
      }
    },

    getStateFromActions(props) {
      if (props.actions) {
        return getStateFromKey(props.actions, props)
      } else {
        return {}
      }
    },

    getInjected(props) {
      if (props.inject) {
        return Object.keys(props.inject).reduce((obj, key) => {
          obj[key] = getStateFromKey(props.inject[key], props)
          return obj
        }, {})
      } else {
        return {}
      }
    },

    reduceState(props) {
      return assign(
        {},
        this.getStateFromStores(props),
        this.getStateFromActions(props),
        this.getInjected(props)
      )
    },

    addSubscription(getStore) {
      const store = typeof getStore === 'function'
        ? getStore(this.props).store
        : getStore

      this.storeListeners.push(store.listen(this.altSetState))
    },

    altSetState() {
      this.setState(this.reduceState(this.props))
    },

    getProps() {
      var flux = this.props.flux || this.context.flux
      var transform = typeof this.props.transform === 'function'
        ? this.props.transform
        : id
      return transform(assign(
        flux ? { flux: flux } : {},
        this.state
      ))
    },

    shouldComponentUpdate() {
      return this.props.shouldComponentUpdate
        ? this.props.shouldComponentUpdate(this.getProps())
        : true
    },

    altRender(Node) {
      var children = this.props.children
      // Custom rendering function
      if (typeof this.props.render === 'function') {
        return this.props.render(this.getProps())
      } else if (this.props.component) {
        return React.createElement(this.props.component, this.getProps())
      }

      // Does not wrap child in a div if we don't have to.
      if (Array.isArray(children)) {
        return React.createElement(Node, null, children.map((child, i) => {
          return cloneElement(child, assign(
            { key: i },
            this.getProps()
          ))
        }, this))
      } else if (children) {
        return cloneElement(children, this.getProps())
      } else {
        return React.createElement(Node, this.getProps())
      }
    }
  }
}

export default mixinContainer
