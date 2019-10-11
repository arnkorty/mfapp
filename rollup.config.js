// import replace from '@rollup/plugin-replace'

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/mfapp.esm.js',
      format: 'esm',
      sourcemap: true
    },
    {
      file: 'dist/mfapp.js',
      format: 'umd',
      sourcemap: true,
      name: 'mfapp'
    }
  ],
  plugins: [
    replace({
      __DEV__: process.env.NODE_ENV !== 'production'
    })
  ]
}
