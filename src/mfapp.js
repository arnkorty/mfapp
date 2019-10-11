import { importHtml } from './loader'
export const NOT_CREATED = 'NOT_CREATED',
  CREATING = 'CREATING',
  NOT_SETUPPED = 'NOT_SETUPPED',
  SETUPPING = 'SETUPPING',
  NOT_MOUNTED = 'NOT_MOUNTED',
  MOUNTING = 'MOUNTING',
  MOUNTED = 'MOUNTED',
  UPDATING = 'UPDATING',
  UPDATED = 'UPDATED',
  UNMOUNTING = 'UNMOUNTING'

const routingEventsListeningTo = ['hashchange', 'popstate']
let started = false
const apps = new Set()

export function register(name, entry, match, hooks = {}) {
  apps.add({
    name,
    entry,
    match,
    status: Status.NOT_CREATED,
    hooks
  })
}

export function start() {
  started = true
  reroute()
}

function reroute() {
  const { creates, mounts, unmounts } = getAppChanges()

  if (started) {
    return perform()
  } else {
    return init()
  }

  async function init() {
    if (!window.IS_MFAPP_SANDBOX) {
      Object.defineProperty(window, 'IS_MFAPP_SANDBOX', {
        get() {
          return true
        }
      })
    }
    await Promise.all(creates.map(runCreate))
  }

  async function perform() {
    unmounts.map(runUnmount)

    creates.map(async (app) => {
      app = await runCreate(app)
      app = await runSetup(app)
      return runMount(app)
    })

    mounts.map(async (app) => {
      app = await runSetup(app)
      return runMount(app)
    })
  }
}

function getAppChanges() {
  const unmounts = []
  const creates = []
  const mounts = []

  apps.forEach((app) => {
    const isActive = app.match(window.location)
    switch (app.status) {
      case Status.NOT_CREATED:
      case Status.CREATING:
        isActive && creates.push(app)
        break
      case Status.NOT_SETUPPED:
      case Status.SETUPPING:
      case Status.NOT_MOUNTED:
        isActive && mounts.push(app)
        break
      case Status.MOUNTED:
        !isActive && unmounts.push(app)
    }
  })
  return { unmounts, creates, mounts }
}

function compose(fns) {
  fns = Array.isArray(fns) ? fns : [fns]
  return (app) =>
    fns.reduce((p, fn) => p.then(() => fn(app)), Promise.resolve())
}

async function runCreate(app) {
  if (app.created) return app.created
  app.created = Promise.resolve().then(async () => {
    app.status = Status.CREATING
    app.host = await createShadowDOM(app)
    const { lifecycle: selfLife, bodyNode, styleNodes } = await importHtml(app)
    app.host.shadowRoot &&
      app.host.shadowRoot.appendChild(bodyNode.content.cloneNode(true))
    for (const k of styleNodes)
      app.host.shadowRoot &&
        app.host.shadowRoot.insertBefore(k, app.host.shadowRoot.firstChild)
    app.status = Status.NOT_SETUPPED
    delete app.created
    return app
  })
  return app.created
}

async function createShadowDOM(app) {
  return new Promise((resolve) => {
    class MfAppElement extends HTMLElement {
      static get tag() {
        return app.name
      }
      connectedCallback() {
        resolve(this)
      }
      constructor() {
        super()
        this.attachShadow({ mode: 'open' })
      }
    }
    const hasDef = window.customElements.get(app.name)
    if (!hasDef) {
      customElements.define(app.name, MfAppElement)
    }
  })
}

async function runUnmount(app) {
  if (app.status != Status.MOUNTED) {
    return app
  }
  app.status = Status.UNMOUNTING
  await app.unmount(app)
  app.status = Status.NOT_MOUNTED
  return app
}

async function runSetup(app) {
  if (app.status !== Status.NOT_SETUPPED) {
    return app
  }
  app.status = Status.SETUPPING
  await app.setup(app)
  app.status = Status.NOT_MOUNTED
  return app
}

async function runMount(app) {
  if (app.status !== Status.NOT_MOUNTED) {
    return app
  }
  app.status = Status.MOUNTING
  await app.mount(app)
  app.status = Status.MOUNTED
  return app
}

const captured = {
  hashchange: [],
  popstate: []
}

routingEventsListeningTo.forEach((event) => {
  window.addEventListener(event, reroute)
})

const oldAEL = window.addEventListener
const oldREL = window.removeEventListener

window.addEventListener = function (name, fn) {
  if (
    routingEventsListeningTo.includes(name) &&
    !captured[name].some((l) => l == fn)
  ) {
    captured[name].push(fn)
    return
  }
  return oldAEL.apply(this, arguments)
}

window.removeEventListener = function (name, fn) {
  if (routingEventsListeningTo.includes(name)) {
    captured[name] = captured[name].filter((l) => l !== fn)
    return
  }
  return oldREL.apply(this, arguments)
}

function patchedUpdateState(updateState) {
  return function () {
    const urlBefore = window.location.href
    updateState.apply(this, arguments)
    const urlAfter = window.location.href

    if (urlBefore !== urlAfter) {
      reroute(new PopStateEvent('popstate'))
    }
  }
}

window.history.pushState = patchedUpdateState(window.history.pushState)
window.history.replaceState = patchedUpdateState(window.history.replaceState)
