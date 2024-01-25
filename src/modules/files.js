import * as path from "path";
import { glob } from "glob";
import { getConfigItem } from "../config.js";
import fs from "fs-extra";

/**
 *
 * @param {string} pathname The relative file path
 * @returns {string}
 */
export const filePath = (pathname, basePath = getConfigItem("root")) => {
  return path.resolve(basePath, pathname);
};

/**
 *
 * @param {string} absolutePath
 * @param {string} basePath
 * @returns {string}
 */
export const relativeFilePath = (
  absolutePath,
  basePath = getConfigItem("root")
) => {
  return absolutePath.replace(basePath, "");
};

/**
 *
 * @param {string} fileName The file to lookup
 * @param {string[]} [additionalLookup] Any additional paths. These also get priority
 * @param {string[]} [baseLookup] The lookups that are defaulted by the engine
 *
 * @returns {Promise<string[]>}
 */
export const findFiles = (
  fileName,
  additionalLookup = [],
  baseLookup = [
    `${getConfigItem("source.media")}/**`,
    `${getConfigItem("source.data")}/**`,
    getConfigItem("root"),
  ]
) => {
  return glob(
    [...additionalLookup, ...baseLookup].map((p) => path.resolve(p, fileName))
  );
};

/**
 *
 * @param {string} fileName The file to lookup
 * @param {string[]} [additionalLookup] Any additional paths. These also get priority
 * @param {string[]} [baseLookup] The lookups that are defaulted by the engine
 *
 * @returns {Promise<string | null>}
 */
export const findFile = async (fileName, additionalLookup, baseLookup) => {
  const files = await findFiles(fileName, additionalLookup, baseLookup);

  return files?.[0] || null;
};

export const ensureDir = (filePath) => {
  return fs.ensureDir(filePath);
};

/**
 *
 *
 * @param {string} filePath The file path to the .md file to transform
 */
export const loadFile = (filePath) => {
  return fs.readFile(filePath, "utf-8");
};
