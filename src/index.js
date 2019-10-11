import { start, register } from './mfappp'
// import { loadScript, importHtml } from './loader'

export const MfApp = {
  start,
  start: mfAppRun,
  register,
  mfAppRegister: register
  // loadScript,
  // importHtml
}

export default MfApp

export { start, start as mfAppRun, register }
