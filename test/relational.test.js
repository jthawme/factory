import "./bootstrap.js";

import * as Relational from "../src/modules/transformers/Relational.js";
import { setConfig } from "../src/config.js";
import { transformContent } from "../src/modules/data.js";
import { run } from "../src/index.js";

beforeAll(() => {
  setConfig({
    transform: {
      match: [Relational.transform],
    },
    modules: {
      relational: {
        ...Relational.options,
        keys: ["attributes.related"],
      },
    },
  });
});

test("gets related data", async () => {
  const data = await transformContent(`---
related: basic.md
---

Relational test`);

  expect(data.attributes.related).toEqual(
    expect.objectContaining({
      attributes: expect.any(Object),
      meta: expect.any(Object),
      body: expect.any(String),
    })
  );
});

test("doesn't die on a circular relationship", async () => {
  const data = await run("data/relational1.md");

  expect(data.attributes.related.attributes.related).toBe("relational1.md");
});
