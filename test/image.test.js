import "./bootstrap.js";

import { findFile } from "../src/modules/files.js";
import { transformImage } from "../src/modules/transformers/Image.js";
import { setConfigItem } from "../src/config.js";

test("gets valid file path", async () => {
  const file = await findFile("bort.jpg");
  expect(file).not.toBe(null);
});

test("returns null on invalid file path", async () => {
  const file = await findFile("borto.jpg");
  expect(file).toBe(null);
});

test("valid image object returned from transformed image", async () => {
  setConfigItem("silent", true);

  const image = await transformImage("bort.jpg");

  expect(image).toEqual(
    expect.objectContaining({
      color: expect.any(String),
      fallback: expect.any(String),
      // sources: expect.arrayContaining([
      //   expect.objectContaining({
      //     type: expect.any(String),
      //     srcset: expect.any(String),
      //     sizes: expect.any(String),
      //   }),
      // ]),
      // placeholders: expect.arrayContaining([
      //   expect.objectContaining({
      //     type: expect.any(String),
      //     srcset: expect.any(String),
      //     sizes: expect.any(String),
      //   }),
      // ]),
      aspectRatio: expect.any(Number),
      width: expect.any(Number),
      height: expect.any(Number),
    })
  );
}, 10000);
