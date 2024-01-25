import "./bootstrap.js";
import { con, resetConfig, setConfig, setConfigItem } from "../src/config.js";

beforeEach(() => {
  return resetConfig();
});

test("expect config to be object", async () => {
  expect(typeof con.fig).toBe("object");
});

test("expects root to be local to current directory when loaded in test directory", async () => {
  expect(con.fig.root === process.cwd()).toBe(true);
});

test("expects allowing of changing config keys", async () => {
  setConfigItem("root", "unknown");
  expect(con.fig.root).toMatch(/unknown/i);
});

test("expects getter to expand root key", async () => {
  setConfigItem("root", "unknown");
  expect(con.fig.root).toMatch(/\//i);
});

test("expects tests to reset config each test", async () => {
  expect(con.fig.root).not.toMatch(/unknown/i);
});

test("expects changing object config to retain previous values", async () => {
  setConfigItem("transform", {
    one: "ok",
  });
  setConfigItem("transform", {
    two: "ok",
  });

  expect(con.fig.transform).toEqual(
    expect.objectContaining({
      one: "ok",
      two: "ok",
    })
  );
});
