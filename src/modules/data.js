import fm from "front-matter";

/**
 *
 * @param {string} content File Content
 */
export const transformContent = async (content) => {
  const { attributes, body } = fm(content);
};

/**
 *
 * @param {object} object
 */
export const transformObject = async (object) => {};

/**
 *
 * @param {object} object
 */
export const convertObjectToMap = (object) => {
  const createKey = (parts) => {
    return parts.join(".");
  };

  const tree = {};

  const walk = (objOrArrayOrValue, parentKeys = []) => {
    // Check if value is array of object
    if (typeof objOrArrayOrValue === "object") {
      // If array iterate through
      if (Array.isArray(objOrArrayOrValue)) {
        objOrArrayOrValue.forEach((value, idx) => {
          walk(value, [...parentKeys, idx]);
        });

        return;
      }

      // if Object create entries and iterate through
      Object.entries(objOrArrayOrValue).forEach(([key, value]) => {
        walk(value, [...parentKeys, key]);
      });

      return;
    }

    tree[createKey(parentKeys)] = objOrArrayOrValue;
  };

  walk(object);

  return tree;
};
