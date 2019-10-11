import { proxy } from './proxy'
import { request } from './util'

const MATCH_ANY_OR_NO_PROPERTY = /["'=\w\s\/]*/
const SCRIPT_URL_RE = new RegExp(
  '<\\s*script' +
    MATCH_ANY_OR_NO_PROPERTY.source +
    '(?:src="(.+?)")' +
    MATCH_ANY_OR_NO_PROPERTY.source +
    '(?:\\/>|>[\\s]*<\\s*\\/script>)?',
  'g'
)
const SCRIPT_CONTENT_RE = new RegExp(
  '<\\s*script' +
    MATCH_ANY_OR_NO_PROPERTY.source +
    '>([\\w\\W]+?)<\\s*\\/script>',
  'g'
)
const MATCH_NONE_QUOTE_MARK = /[^"]/
const CSS_URL_RE = new RegExp(
  '<\\s*link[^>]*' +
    'href="(' +
    MATCH_NONE_QUOTE_MARK.source +
    '+.css' +
    MATCH_NONE_QUOTE_MARK.source +
    '*)"' +
    MATCH_ANY_OR_NO_PROPERTY.source +
    '>(?:\\s*<\\s*\\/link>)?',
  'g'
)
const STYLE_RE = /<\s*style\s*>([^<]*)<\s*\/style>/g
const BODY_CONTENT_RE = /<\s*body[^>]*>([\w\W]*)<\s*\/body>/
const SCRIPT_ANY_RE = /<\s*script[^>]*>[\s\S]*?(<\s*\/script[^>]*>)/g
const TEST_URL = /^(?:https?):\/\/[-a-zA-Z0-9.]+/

export async function importHtml(app) {
  const template = await request(app.entry)
  const styleNodes = await loadCSS(template)
  const bodyNode = loadBody(template)
  const fake = proxy(window, null)
  const lifecycle = await loadScript(template, fake, app.name)
  return { lifecycle, styleNodes, bodyNode }
}

export async function loadScript(template, global, name) {
  const { scriptURLs, scripts } = parseScript(template)
  const fetchedScripts = await Promise.all(
    scriptURLs.map((url) => request(url))
  )
  const scriptsToLoad = fetchedScripts.concat(scripts)

  let setup = []
  let unmount = []
  let mount = []
  scriptsToLoad.forEach((script) => {
    const lifecycles = runScript(script, global, name)
    setup = [...setup, lifecycles.setup]
    mount = [...mount, lifecycles.mount]
    unmount = [...unmount, lifecycles.unmount]
  })

  return { setup, unmount, mount }
}

function parseScript(template) {
  const scriptURLs = []
  const scripts = []
  SCRIPT_URL_RE.lastIndex = SCRIPT_CONTENT_RE.lastIndex = 0
  let match
  while ((match = SCRIPT_URL_RE.exec(template))) {
    let captured = match[1].trim()
    if (!captured) continue
    if (!TEST_URL.test(captured)) {
      captured = window.location.origin + captured
    }
    scriptURLs.push(captured)
  }
  while ((match = SCRIPT_CONTENT_RE.exec(template))) {
    const captured = match[1].trim()
    if (!captured) continue
    scripts.push(captured)
  }
  return {
    scriptURLs,
    scripts
  }
}

function runScript(script, global, umdName) {
  const resolver = new Function(
    'window',
    `
    with(window.IS_MFAPP_SANDBOX) {
      try {
        ${script}
        return window['${umdName}']
      }
      catch(e) {
        console.log(e)
      }
    }
  `
  )
  return resolver.call(global, global)
}

async function loadCSS(template) {
  const { cssURLs, styles } = parseCSS(template)
  const fetchedStyles = await Promise.all(cssURLs.map((url) => request(url)))
  return toStyleNodes(fetchedStyles.concat(styles))

  function toStyleNodes(styles) {
    return styles.map((style) => {
      const styleNode = document.createElement('style')
      styleNode.appendChild(document.createTextNode(style))
      return styleNode
    })
  }
}

function parseCSS(template) {
  const cssURLs = []
  const styles = []
  CSS_URL_RE.lastIndex = STYLE_RE.lastIndex = 0
  let match
  while ((match = CSS_URL_RE.exec(template))) {
    let captured = match[1].trim()
    if (!captured) continue
    if (!TEST_URL.test(captured)) {
      captured = window.location.origin + captured
    }
    cssURLs.push(captured)
  }
  while ((match = STYLE_RE.exec(template))) {
    const captured = match[1].trim()
    if (!captured) continue
    styles.push(captured)
  }
  return {
    cssURLs,
    styles
  }
}

function loadBody(template) {
  const matches = template.match(BODY_CONTENT_RE)
  let bodyContent = (matches && matches[1]) || ''
  bodyContent = bodyContent.replace(SCRIPT_ANY_RE, scriptReplacer)

  const body = document.createElement('template')
  body.innerHTML = bodyContent
  return body

  function scriptReplacer(substring) {
    const matchedURL = SCRIPT_URL_RE.exec(substring)
    if (matchedURL) {
      return `<!-- Original script url: ${matchedURL[1]} -->`
    }
    return `<!-- Original script: inline script -->`
  }
}
