import { fileMeta, findFiles } from "./files.js";

export const getManifest = async () => {
  const files = await findFiles("*.md");

  return files.map((file) => fileMeta(file));
};
