import { con, resetConfig, setConfig } from "../src/config.js";
import { transformContent } from "../src/modules/data.js";
import {
  convertKeyMapToObject,
  convertObjectToKeyMap,
} from "../src/modules/walk.js";

beforeEach(() => {
  return resetConfig();
});

test("Converts object into list of keys", () => {
  expect(
    convertObjectToKeyMap({
      test: "ok",
      parent: {
        child: "ok",
      },
      array: [1, 2, 3],
      parentWithArray: {
        child: [
          4,
          5,
          {
            complex: true,
          },
        ],
      },
    }).length
  ).toEqual(8);
});

test("Converts list of keys into same original object", () => {
  const obj = {
    test: "ok",
    parent: {
      child: "ok",
    },
    array: [1, 2, 3],
    parentWithArray: {
      child: [
        4,
        5,
        {
          complex: true,
        },
      ],
    },
  };

  const keyMap = convertObjectToKeyMap(obj);

  expect(convertKeyMapToObject(keyMap)).toMatchObject(obj);
});

test("Allow arbitrary conversion of attributes via config", async () => {
  setConfig({
    transform: {
      match: [
        {
          pattern: /test/,
          handler: (val) => val + 1,
        },
      ],
    },
  });

  const data = await transformContent(`---
test: 1
---

We will take the value of 'test' and add 1 to it`);

  expect(data.attributes.test).toBe(2);
});

test("Allow transformer to run on explicit key", async () => {
  setConfig({
    transform: {
      match: [
        {
          keys: ["attributes.test"],
          handler: (val) => val + 1,
        },
      ],
    },
  });

  const data = await transformContent(`---
test: 1
---

We will take the value of 'test' and add 1 to it`);

  expect(data.attributes.test).toBe(2);
});

test("Grabs media to handle from within values", async () => {
  const data = await transformContent(
    `Body with an image.jpg that we want to grab automatically and also convert an already valid markdown image 

![The San Juan Mountains are beautiful!](/assets/images/san-juan-mountains.jpg \"San Juan Mountains\")`
  );

  expect(
    [...data.body.matchAll(/!\[.*\]\((.*.(jpg|png|jpeg|webp)).*\)/gim)].length
  ).toBe(2);
});
