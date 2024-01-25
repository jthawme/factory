import { transformContent } from "./modules/data.js";
import { fileMeta, findFile, loadFile } from "./modules/files.js";

export { findFile, findFiles } from "./modules/files.js";
export { setTransformConfig } from "./config.js";

export * as ImageTransform from "./modules/transformers/Image.js";
// export * as ImageTransform from "./modules/transformers/Image.js";

/**
 *
 * @typedef {object} FileMeta
 * @property {string} slug
 * @property {string} fileName
 * @property {string} extName
 *
 * @param {string} file
 * @param {number} [depth]
 *
 * @returns {Promise<import("./modules/data.js").TransformedContent & {
 *  meta: FileMeta
 * }>}
 */
export const run = async (file, depth) => {
  const fileContent = await loadFile(file);
  const obj = await runContent(fileContent, depth);

  return {
    ...obj,
    meta: fileMeta(file),
  };
};

export const runFile = async (fileName) => {
  const file = await findFile(fileName);

  if (!file) {
    throw new Error(`No file ${fileName}`);
  }

  return run(file);
};

/**
 *
 * @param {string} content
 * @param {number} [depth]
 * @returns
 */
export const runContent = async (content, depth) => {
  const data = await transformContent(content, depth);

  return data;
};
