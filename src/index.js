import { transformContent } from "./modules/data.js";
import { loadFile } from "./modules/files.js";

export { findFile, findFiles } from "./modules/files.js";
export { setTransformConfig } from "./config.js";

export * as ImageTransform from "./modules/transformers/Image.js";
// export * as ImageTransform from "./modules/transformers/Image.js";

/**
 *
 * @param {string} file
 * @param {number} [depth]
 */
export const run = async (file, depth) => {
  const fileContent = await loadFile(file);

  return runContent(fileContent, depth);
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
