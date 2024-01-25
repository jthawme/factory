import "./bootstrap.js";
import { getManifest } from "../src/modules/manifest.js";

test("Gets a manifest of all the files", async () => {
  const manifest = await getManifest();
  expect(manifest).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        slug: expect.any(String),
        fileName: expect.any(String),
      }),
    ])
  );
});
