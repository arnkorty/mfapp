export function warn(trigger, msg) {
  if (typeof trigger === 'string') msg = trigger
  if (!trigger) return
  throw new Error(`[MfApp: Warning]: ${msg}`)
}

export function error(trigger) {
  if (typeof trigger === 'string') msg = trigger
  if (!trigger) return
  throw new Error(`[MfApp: Error]: ${msg}`)
}

export function request(url, option) {
  if (!window.fetch) {
    error(
      "It looks like that your browser doesn't support fetch. Polyfill is needed before you use it."
    )
  }

  return fetch(url, {
    mode: 'cors',
    ...option
  }).then((res) => res.text())
}

export function lifecycleCheck(lifecycle) {
  const keys = ['setup', 'mount', 'unmount']
  keys.forEach((key) => {
    if (!(key in lifecycle)) {
      error(
        `It looks like that you didn't export the lifecycle hook [${key}], which would cause a mistake.`
      )
    }
  })
}

export function reverse(arr) {
  let last
  const reversed = []
  while ((last = arr.pop())) {
    reversed.push(last)
  }
  return reversed
}
