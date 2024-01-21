import "./bootstrap.js";

const getConfig = () => {
  return import("../src/config.js").then((mod) => mod.default);
};

test("expect config to be object", async () => {
  const config = await getConfig();
  expect(typeof config).toBe("object");
});

test("expects root to be local to current directory when loaded in test directory", async () => {
  const config = await getConfig();
  expect(config.root === process.cwd()).toBe(true);
});
