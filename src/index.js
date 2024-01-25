import { transformContent } from "./modules/data.js";
import { loadFile } from "./modules/files.js";

export { findFile, findFiles } from "./modules/files.js";

export * as ImageTransform from "./modules/transformers/Image.js";
// export * as ImageTransform from "./modules/transformers/Image.js";

/**
 *
 * @param {string} file
 */
export const run = async (file) => {
  const fileContent = await loadFile(file);

  return runContent(fileContent);
};

/**
 *
 * @param {string} content
 * @returns
 */
export const runContent = async (content) => {
  const data = await transformContent(content);

  return data;
};
