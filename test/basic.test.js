import "./bootstrap.js";

import { filePath } from "../src/config.js";
import { loadFile } from "../src/modules/file.js";
import { run } from "../src/index.js";

test("Loads content of file with no errors", async () => {
  await expect(loadFile(filePath("data/basic.md"))).resolves.not.toThrow();
});

test("Converts markdown file into an object", async () => {
  const data = await run(filePath("data/basic.md"));

  expect(typeof data).toBe("object");
});

test("Markdown file always contains at least attributes and body keys", async () => {
  const data = await run(filePath("data/basic.md"));

  expect(data).toEqual(
    expect.objectContaining({
      attributes: expect.any(Object),
      body: expect.any(String),
    })
  );
});
