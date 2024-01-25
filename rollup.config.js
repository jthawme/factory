// rollup.config.mjs
export default {
  input: {
    main: "src/index.js",
    vite: "src/vite.js",
  },
  output: {
    dir: "dist",
    format: "es",
  },
};
