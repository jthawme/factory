import fs from "fs";
import path from "path";
import { CONFIG_FILE_NAME } from "./constants.js";

const config = await (async () => {
  // Check to see if there is a config file
  const configFile = path.join(process.cwd(), CONFIG_FILE_NAME);

  // If a config file exists, load it, else mock the object for ease
  const { config: configOverride } = await (fs.existsSync(configFile)
    ? import(configFile)
    : Promise.resolve({ config: {} }));

  // Pull known keys that need to be resolved, and allow the rest to be spread
  const { root, ...restConfig } = configOverride;

  return Object.freeze({
    /**
     * The root location in which the transform mounts, to make any relative paths off of
     */
    root: !!root ? path.resolve(process.cwd(), root) : process.cwd(),

    modules: {
      ...restConfig,
    },
  });
})();

/**
 * Gets an item from the config object
 *
 * @param {keyof config} key
 */
export const getConfigItem = (key) => {
  return config[key];
};

/**
 *
 * @param {string} pathname The relative file path
 */
export const filePath = (pathname) => {
  return path.resolve(getConfigItem("root"), pathname);
};

export default config;
