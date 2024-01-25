import fm from "front-matter";
import { convertKeyMapToObject, convertObjectToKeyMap } from "./walk.js";
import { getConfigItem } from "../config.js";
import { promiseRunner } from "./utils.js";

/**
 * @typedef {object} TransformedContent
 * @property {object} attributes
 * @property {string} body
 */

/**
 *
 * @param {string} content File Content
 * @returns {TransformedContent}
 */
export const transformContent = async (content) => {
  const { attributes, body } = fm(content);

  return transformObject({
    attributes: { ...attributes },
    body,
  });
};

/**
 *  Walks through an object, converts any data that needs to be converted,
 * then reconstructs the object in its new data format
 *
 * @param {object} object
 *
 * @returns {TransformedContent}
 */
export const transformObject = async (object) => {
  const keys = convertObjectToKeyMap(object);

  const matchers = getConfigItem("transform");

  const convertedKeys = await promiseRunner(keys, async (item) => {
    /** @type {import("../config.js").ConfigTransformMatch | null} */
    const transform = matchers.match.find(
      ({ keys: matchKeys, pattern, testValue }) => {
        if (!matchKeys && !pattern) {
          return false;
        }

        if (pattern) {
          const regex = new RegExp(pattern);
          return regex.test(testValue ? item.value : item.key);
        }

        return matchKeys.includes(item.key);
      }
    );

    if (transform) {
      item.value = await Promise.resolve().then(() =>
        transform.handler(item.value, item.key)
      );
    }

    return item;
  });

  return convertKeyMapToObject(convertedKeys);
};
