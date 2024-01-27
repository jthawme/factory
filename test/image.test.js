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
      sources: expect.any(Array),
      placeholder: expect.objectContaining({
        src: expect.any(String),
        sources: expect.any(Array),
      }),
      aspectRatio: expect.any(Number),
      width: expect.any(Number),
      height: expect.any(Number),
    })
  );
});

test("converts image when not dev", async () => {
  setConfigItem("silent", true);
  setConfigItem("dev", false);

  const image = await transformImage("bort.jpg");

  expect(image.fallback).not.toMatch(/\image-api/);
}, 10000);
