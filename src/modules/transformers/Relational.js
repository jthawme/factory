import { getConfigItem } from "../../config.js";
import { run } from "../../index.js";
import { findFile } from "../files.js";

/**
 * @type {import("../../config.js").ConfigTransformMatch}
 */
export const transform = {
  id: "relational-lookup",
  keys() {
    return getConfigItem("modules.relational.keys", []);
  },
  async handler(value, key, { depth }) {
    const file = await findFile(
      getConfigItem("modules.relational.convertSlug", (val) => val)(value)
    );

    if (!file) {
      return value;
    }

    return run(file, depth + 1);
  },
  depth: 0,
};

export const options = {
  keys: [],

  convertSlug: (val) => (val.endsWith(".md") ? val : `${val}.md`),
};
