import fs from "fs/promises";

/**
 *
 *
 * @param {string} filePath The file path to the .md file to transform
 */
export const loadFile = (filePath) => {
  return fs.readFile(filePath, "utf-8");
};
