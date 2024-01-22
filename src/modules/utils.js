export function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}

export function mergeDeep(target, source) {
  let output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) Object.assign(output, { [key]: source[key] });
        else output[key] = mergeDeep(target[key], source[key]);
      } else {
        if (Array.isArray(target[key])) {
          Object.assign(output, { [key]: [...source[key], ...target[key]] });
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      }
    });
  }
  return output;
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
