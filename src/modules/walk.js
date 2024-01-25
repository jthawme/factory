/**
 * @typedef {object} WalkObject
 * @property {string} key
 * @property {any} value
 */

import { isObject } from "./utils.js";

/**
 *
 * @param {string} key
 * @param {any} value
 * @returns {WalkObject}
 */
const createWalkObject = (key, value) => {
  let _key = key;
  let _value = value;

  const obj = {
    get isWalkObject() {
      return true;
    },
    get key() {
      return _key;
    },
    set key(val) {
      _key = val.toString();
    },
    get value() {
      return _value;
    },
    set value(val) {
      _value = val;
    },
  };

  return obj;
};

/**
 *  Converts a N level dimension object into an iterable key array
 *
 * @example
 *  { test: [1, 2, 3] }
 *
 *  Becomes
 *
 *  {'test.0': 1, 'test.1': 2, 'test.2': 3}
 *
 * @param {object} object
 *
 * @returns {WalkObject[]}
 */
export const convertObjectToKeyMap = (object) => {
  const createKey = (parts) => {
    return parts.join(".");
  };

  const tree = [];

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

    tree.push(createWalkObject(createKey(parentKeys), objOrArrayOrValue));
  };

  walk(object);

  return tree;
};

/**
 * Mutably sets a key on an object with potential dot notation syntax
 *
 * @param {object} obj The object to set onto
 * @param {string} key The key with possible not dotation baked in
 * @param {any} value The value to set
 */
export const setValue = (obj, key, value) => {
  const depths = key.split(".");

  // Dont spread as we are navigating through reference
  let traverse = obj;

  depths.forEach((key, i) => {
    if (i === depths.length - 1) {
      traverse[key] = value.hasOwnProperty("isWalkObject")
        ? value.value
        : value;
    } else {
      traverse[key] = traverse[key] || {};
      traverse = traverse[key];
    }
  });
};

/**
 * Gets a key on an object with potential dot notation syntax
 *
 * @param {object} obj The object to set onto
 * @param {string} key The key with possible not dotation baked in
 */
export const getValue = (obj, key) => {
  const depths = key.split(".");

  return depths.reduce((traverse, key, i) => {
    if (i === depths.length - 1) {
      const value = traverse[key];

      return value.hasOwnProperty("isWalkObject") ? value.value : value;
    } else {
      return traverse[key];
    }
  }, obj);
};

/**
 *
 * @param {WalkObject[]} map
 */
export const convertKeyMapToObject = (map) => {
  const obj = map.reduce((dict, { key, value }) => {
    setValue(dict, key, value);

    return dict;
  }, {});

  // Iterate through all of the object now to see if any keys are numeric
  // and therefore treat them as an array (if all keys are numeric)
  const convertArrays = (o) => {
    Object.entries(o).map(([key, value]) => {
      if (isObject(value)) {
        const numericKeys = Object.keys(value).every(
          (k) => !isNaN(parseInt(k))
        );

        if (numericKeys) {
          o[key] = Object.assign([], o[key]);

          o[key].forEach((value) => {
            convertArrays(value);
          });
        } else {
          convertArrays(o[key]);
        }
      }
    });
  };

  convertArrays(obj);

  return obj;
};
