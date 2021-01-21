import typescript from "rollup-plugin-typescript2";
import postcss from "rollup-plugin-postcss";
import sass from "@csstools/postcss-sass";
import babel from "rollup-plugin-babel";
import { DEFAULT_EXTENSIONS } from "@babel/core";

export const defaultPlugins = [
  typescript(),
  babel({
    extensions: [...DEFAULT_EXTENSIONS, ".ts", ".tsx"],
    presets: ["@emotion/babel-preset-css-prop"]
  }),
  postcss({
    extract: true,
    plugins: [sass]
  })
];
