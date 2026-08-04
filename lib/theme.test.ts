import { describe, it, expect } from "vitest";
import { resolveTheme, isValidTheme } from "./theme";

describe("resolveTheme", () => {
  it("light は常にlight", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("light", false)).toBe("light");
  });

  it("dark は常にdark", () => {
    expect(resolveTheme("dark", true)).toBe("dark");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("system はOSの設定に従う", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});

describe("isValidTheme", () => {
  it("light / dark / system は有効", () => {
    expect(isValidTheme("light")).toBe(true);
    expect(isValidTheme("dark")).toBe(true);
    expect(isValidTheme("system")).toBe(true);
  });

  it("それ以外の値は無効", () => {
    expect(isValidTheme("blue")).toBe(false);
    expect(isValidTheme("")).toBe(false);
    expect(isValidTheme(null)).toBe(false);
    expect(isValidTheme(undefined)).toBe(false);
    expect(isValidTheme(1)).toBe(false);
    expect(isValidTheme(true)).toBe(false);
  });
});
