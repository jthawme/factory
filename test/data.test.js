import { convertObjectToMap } from "../src/modules/data.js";

test("Converts object into list of keys", () => {
  expect(
    Object.keys(
      convertObjectToMap({
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
      })
    ).length
  ).toEqual(8);
});
