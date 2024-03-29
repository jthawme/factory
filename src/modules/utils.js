import { mergician } from "mergician";
import { getConfigItem } from "../config.js";

export function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}

export function mergeDeep(target, source) {
  return mergician(target, source);
}

export const promiseRunner = (arr, cb) => {
  const items = [];

  return new Promise((resolve) => {
    const run = async (idx = 0) => {
      if (idx >= arr.length) {
        resolve(items);
        return;
      }

      items.push(await Promise.resolve().then(() => cb(arr[idx], idx, arr)));
      run(idx + 1);
    };

    run();
  });
};

export const log = (...messages) => {
  if (getConfigItem("dev") && !getConfigItem("silent", false)) {
    console.log(...messages);
  }
};

export const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
};
