import "./bootstrap.js";

import { filePath } from "../src/config.js";
import { loadFile } from "../src/modules/file.js";
import { run } from "../src/index.js";

test("Loads content of file with no errors", async () => {
  await expect(loadFile(filePath("data/basic.md"))).resolves.not.toThrow();
});

// test("Loads content of file with no errors", async () => {
//   await expect(run(filePath("data/basic.md"))).resolves.toBe(true);
// });
