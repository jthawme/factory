import fs from "fs";
import path from "path";
import { CONFIG_FILE_NAME } from "./constants.js";
import { mergeDeep, isObject } from "./modules/utils.js";
import { transform as ImageTransform } from "./modules/transformers/Image.js";

/**
 * @typedef {(value: string | number | boolean, key: string) => any} ConfigTransformMatchHandler
 *
 * @typedef {object} ConfigTransformMatch
 * @property {RegExp} pattern The pattern to test the key or value, to determine whether to transform this or not
 * @property {ConfigTransformMatchHandler} handler The callback to run if matched
 * @property {boolean} [testValue] Whether to test the value of the item or the key (default)
 *
 * @typedef {object} ConfigTransform
 * @property {ConfigTransformMatch[]} match
 *
 * @typedef {object} Config
 * @property {string} root The root of the project
 * @property {ConfigTransform} transform Defines many things to do with the transforming of data
 * @property {object} modules Any other data that should get attached arbitrarily to the config object
 */

/**
 *
 * @returns {Promise<Config>}
 */
const getConfig = async () => {
  // Check to see if there is a config file
  const configFile = path.join(process.cwd(), CONFIG_FILE_NAME);

  // If a config file exists, load it, else mock the object for ease
  const { config: configOverride } = await (fs.existsSync(configFile)
    ? import(configFile)
    : Promise.resolve({ config: {} }));

  // Pull known keys that need to be resolved, and allow the rest to be spread
  const { root, ...restConfig } = configOverride;

  let _root = root;

  return {
    /**
     * The root location in which the transform mounts, to make any relative paths off of
     */
    get root() {
      return !!_root ? path.resolve(process.cwd(), _root) : process.cwd();
    },

    set root(val) {
      _root = val;
    },

    transform: {
      match: [ImageTransform],
    },

    modules: {
      ...restConfig,
    },
  };
};

export const resetConfig = async () => {
  con.fig = await getConfig();
};

/**
 *
 * @param {Partial<config>} additionalConfig
 */
export const setConfig = (additionalConfig) => {
  con.fig = mergeDeep(con.fig, additionalConfig);

  return con.fig;
};

/**
 *
 * @param {keyof config} key
 * @param {any} value
 * @param {boolean} [merge]
 */
export const setConfigItem = (key, value, merge = true) => {
  con.fig[key] =
    isObject(con.fig[key]) && merge ? mergeDeep(con.fig[key], value) : value;
};

/**
 * Gets an item from the config object
 *
 * @param {keyof config} key
 */
export const getConfigItem = (key) => {
  return con.fig[key];
};

/**
 *
 * @param {string} pathname The relative file path
 */
export const filePath = (pathname) => {
  return path.resolve(getConfigItem("root"), pathname);
};

export const con = {
  fig: await getConfig(),
};
