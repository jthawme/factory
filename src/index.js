import { transformContent } from "./modules/data.js";
import { loadFile } from "./modules/file.js";

/**
 *
 * @param {string} file
 */
export const run = async (file) => {
  const fileContent = await loadFile(file);
  const data = await transformContent(fileContent);
};
