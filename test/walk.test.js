import { getValue, setValue } from "../src/modules/walk.js";

test("Walk get value to traverse dot notation", () => {
  expect(
    getValue(
      {
        test: {
          object: "yes",
        },
      },
      "test.object"
    )
  ).toBe("yes");
});

test("Walk set value to set deep level value", () => {
  const obj = {
    test: {
      object: "yes",
    },
  };

  setValue(obj, "test.object", "no");

  expect(getValue(obj, "test.object")).toBe("no");
});
