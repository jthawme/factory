import fm from "front-matter";
import { convertKeyMapToObject, convertObjectToKeyMap } from "./walk.js";
import { getConfigItem } from "../config.js";
import { promiseRunner } from "./utils.js";
import { fileMeta } from "./files.js";

/**
 *
 * @typedef {object} TransformedContent
 * @property {object} attributes
 * @property {string} body
 */

/**
 *
 * @param {string} content File Content
 * @param {number} [depth]
 * @returns {TransformedContent}
 */
export const transformContent = async (content, depth) => {
  const { attributes, body } = fm(content);

  return transformObject(
    {
      attributes: { ...attributes },
      body,
    },
    depth
  );
};

/**
 *  Walks through an object, converts any data that needs to be converted,
 * then reconstructs the object in its new data format
 *
 * @param {object} object
 * @param {number} [depth]
 *
 * @returns {TransformedContent}
 */
export const transformObject = async (object, depth = 0) => {
  const keys = convertObjectToKeyMap(object);

  const matchers = getConfigItem("transform");

  const convertedKeys = await promiseRunner(keys, async (item) => {
    /** @type {import("../config.js").ConfigTransformMatch | null} */
    const transform = matchers.match.find(
      ({ keys: matchKeys, pattern, testValue, depth: depthCheck }) => {
        if (depthCheck < depth) {
          return;
        }

        if (pattern) {
          const regex = new RegExp(pattern);
          return regex.test(testValue ? item.value : item.key);
        }

        if (Array.isArray(matchKeys)) {
          return matchKeys.includes(item.key);
        }

        if (typeof matchKeys === "function") {
          return matchKeys().includes(item.key);
        }

        return false;
      }
    );

    if (transform) {
      item.value = await Promise.resolve().then(() =>
        transform.handler(item.value, item.key, { depth })
      );
    }

    return item;
  });

  return convertKeyMapToObject(convertedKeys);
};
