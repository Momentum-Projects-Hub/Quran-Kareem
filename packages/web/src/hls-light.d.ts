// hls.js ships no typings for its 'light' build; it shares the main build's API.
declare module 'hls.js/light' {
  export * from 'hls.js'
  export { default } from 'hls.js'
}
