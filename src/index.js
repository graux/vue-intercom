/* globals window, document */
import { callIf, assert, is, mapInstanceToProps } from './util'

let Vue
const init = ({ appId }) => {
  assert(Vue, 'call Vue.use(VueIntercom) before creating an instance')

  const vm = new Vue({
    data() {
      return {
        ready: false,
        visible: false,
        unreadCount: 0
      }
    }
  })

  const queued = []

  const callIntercom = (...args) => {
    const intercomAvailable =
      window && window.Intercom && typeof window.Intercom === 'function'
    const f = () => window.Intercom(...args)
    return intercomAvailable ? f() : queued.push(f)
  }

  const intercom = { _vm: vm }

  Object.defineProperties(
    intercom,
    mapInstanceToProps(vm, ['ready', 'visible', 'unreadCount'])
  )

  intercom._init = () => {
    vm.ready = true

    queued.forEach(f => f())

    callIntercom('onHide', () => (vm.visible = false))
    callIntercom('onShow', () => (vm.visible = true))
    callIntercom(
      'onUnreadCountChange',
      unreadCount => (vm.unreadCount = unreadCount)
    )
  }
  intercom.boot = (options = { app_id: appId }) => {
    callIf(!options.app_id, () => (options.app_id = appId))
    callIntercom('boot', options)
  }
  intercom.shutdown = () => callIntercom('shutdown')
  intercom.update = (...options) => callIntercom('update', ...options)
  intercom.show = () => callIntercom('show')
  intercom.hide = () => callIntercom('hide')
  intercom.showMessages = () => callIntercom('showMessages')
  intercom.showNewMessage = content =>
    callIntercom('showNewMessage', ...(is(String, content) ? [content] : []))
  intercom.trackEvent = (name, ...metadata) =>
    callIntercom('trackEvent', ...[name, ...metadata])
  intercom.getVisitorId = () => callIntercom('getVisitorId')

  return intercom
}

let installed

init.install = function install(_Vue, { appId }) {
  assert(!Vue, 'already installed.')
  Vue = _Vue
  const vueIntercom = init({ appId })
  Vue.mixin({
    created() {
      callIf(!installed, () => {
        init.loadScript(appId, (x, y) => this.$intercom._init())
        installed = true
      })
    }
  })
  Object.defineProperty(Vue.prototype, '$intercom', {
    get: () => vueIntercom
  })
}

init.loadScript = function loadScript(appId, done) {
  const script = document.createElement('script')
  script.src = `https://widget.intercom.io/widget/${appId}`
  const firstScript = document.getElementsByTagName('script')[0]
  firstScript.parentNode.insertBefore(script, firstScript)
  script.onload = done
}

export default init
