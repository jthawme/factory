import { fileMeta, findFiles } from "./files.js";

/**
 * Gets a list of meta nodes for the registered data directories. Useful for making
 * sitemaps or other looks at collections
 *
 * @param {string} [prefix] Whether or not to make your search more specific
 * @param {string[]} [extensions]
 * @returns {import("../index.js").FileMeta[]}
 */
export const getManifest = async (prefix = "*", extensions = ["md"]) => {
  const files = await findFiles(
    `${prefix}.${
      extensions.length > 1
        ? `{${extensions.map((ext) => ext).join(",")}}`
        : extensions[0]
    }`
  );

  return files.map((file) => fileMeta(file));
};
