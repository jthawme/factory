import fs from "fs";
import path from "path";
// import { CONFIG_FILE_NAME } from "./constants.js";
import { mergeDeep, isObject, log } from "./modules/utils.js";
import * as Image from "./modules/transformers/Image.js";
import { setValue, getValue } from "./modules/walk.js";
import { mergician } from "mergician";
import { CONFIG_FILE_NAME } from "./constants.js";

/**
 * @typedef {(value: string | number | boolean, key: string, {depth: number}) => any} ConfigTransformMatchHandler
 *
 * @typedef {object} ConfigTransformMatch
 * @property {string} id The id of the transform module
 * @property {string[] | () => string[]} [keys] Explicit keys to match to run this transformer on
 * @property {RegExp} [pattern] The pattern to test the key or value, to determine whether to transform this or not
 * @property {ConfigTransformMatchHandler} handler The callback to run if matched
 * @property {boolean} [testValue] Whether to test the value of the item or the key (default)
 * @property {number} [depth] How many files down of transformation this module should run on
 *
 * @typedef {object} ConfigTransform
 * @property {ConfigTransformMatch[]} match
 *
 * @typedef {object} ConfigSource
 * @property {string} media
 * @property {string} data
 *
 * @typedef {object} ConfigDist
 * @property {string} images
 * @property {string} files
 *
 * @typedef {object} Config
 * @property {string} root The root of the project
 * @property {ConfigTransform} transform Defines many things to do with the transforming of data
 * @property {object} modules Any other data that should get attached arbitrarily to the config object
 * @property {ConfigSource} source A dictionary of folders for the source
 * @property {ConfigDist} dist A dictionary of folders for the dist
 * @property {boolean} dev
 * @property {boolean} silent
 * @property {(file: string, { slugify: (value: string) => string }) => string} slugify
 */

/**
 *
 * @returns {Promise<Config>}
 */
const getConfig = async () => {
  const configFile = path.join(process.cwd(), CONFIG_FILE_NAME);

  // If a config file exists, load it, else mock the object for ease
  const { config: configOverride } = await (fs.existsSync(configFile)
    ? import(/* @vite-ignore */ configFile)
    : Promise.resolve({ config: {} }));

  // Pull known keys that need to be resolved, and allow the rest to be spread
  const { root, dev, ...restConfig } = configOverride;

  // // putting these here for now
  // const dev = false;
  // const root = undefined;
  // const restConfig = {};

  let _root = root;

  const sourceFolders = {
    media: "media",
    data: "data",
  };

  const distFolders = {
    images: "static/assets",
    files: "static/assets",
  };

  const spread = {
    get root() {
      return !!_root ? path.resolve(process.cwd(), _root) : process.cwd();
    },

    set root(val) {
      _root = val;
    },
  };

  return mergician(spread, {
    dev: dev ?? process.env.NODE_ENV !== "production",

    silent: false,

    source: {
      get media() {
        return path.resolve(spread.root, sourceFolders.media);
      },

      set media(val) {
        sourceFolders.media = val;
      },

      get data() {
        return path.resolve(spread.root, sourceFolders.data);
      },

      set data(val) {
        sourceFolders.data = val;
      },
    },

    dist: {
      get images() {
        return path.resolve(spread.root, distFolders.images);
      },

      set images(val) {
        distFolders.images = val;
      },

      get files() {
        return path.resolve(spread.root, distFolders.files);
      },

      set files(val) {
        distFolders.files = val;
      },
    },

    transform: {
      match: [Image.transform],
    },

    modules: mergeDeep(restConfig, {
      image: Image.options,
    }),
  });
};

export const resetConfig = async () => {
  con.fig = await getConfig();
};

/**
 *
 * @param {Partial<Config>} additionalConfig
 */
export const setConfig = (additionalConfig) => {
  con.fig = mergeDeep(con.fig, additionalConfig);

  return con.fig;
};

/**
 *
 * @param {keyof Config} key
 * @param {any} value
 * @param {boolean} [merge]
 */
export const setConfigItem = (key, value, merge = true) => {
  const currentValue = getValue(con.fig, key);

  setValue(
    con.fig,
    key,
    isObject(currentValue) && merge ? mergeDeep(currentValue, value) : value
  );
};

export const pushConfigItem = (key, value) => {
  setValue(con.fig, key, [...(getValue(con.fig, key) ?? []), value]);
};

export const setTransformConfig = (moduleId, config, merge = true) => {
  const transforms = getConfigItem("transform");
  const transformRuleIndex = transforms.findIndex(
    (module) => module.id === moduleId
  );

  if (transformRuleIndex < 0) {
    log(`No module named '${moduleId}'`);
    return;
  }

  setConfigItem(`transform.${transformRuleIndex}`, config, merge);
};

/**
 * Gets an item from the config object
 *
 * @param {keyof Config} key
 * @param {any} [defaultValue]
 */
export const getConfigItem = (key, defaultValue = null) => {
  return getValue(con.fig, key) ?? defaultValue;
};

export const con = {
  fig: await getConfig(),
};
