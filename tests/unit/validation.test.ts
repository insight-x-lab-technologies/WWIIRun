import { describe, expect, test } from "vitest";

import {
  appendJsonPointer,
  decodeCanonicalToken,
  decodeExactObject,
  decodeJsonArray,
  decodeNormalizedRelativePath,
} from "../../src/shared/validation/index.ts";

describe("shared validation primitives", () => {
  test("escapes JSON Pointer segments deterministically", () => {
    expect(appendJsonPointer("", "assets/0~draft")).toBe("/assets~10~0draft");
  });

  test.each(["a", "a.b:c_d-0", `a${"b".repeat(63)}`])(
    "accepts canonical token %s",
    (token) => {
      expect(decodeCanonicalToken(token, "/id")).toEqual({
        ok: true,
        value: token,
      });
    },
  );

  test.each([
    "",
    " contains-space",
    "with/slash",
    "avião",
    `a${"b".repeat(64)}`,
  ])("rejects noncanonical token %s", (token) => {
    expect(decodeCanonicalToken(token, "/id")).toEqual({
      ok: false,
      issues: [
        {
          code: "invalid-value",
          path: "/id",
          message: "must be a canonical ASCII token of 1 to 64 characters.",
        },
      ],
    });
  });

  test.each(["catalog.json", "nested/catalog.json", `a/${"b".repeat(254)}`])(
    "accepts normalized relative path %s",
    (path) => {
      expect(decodeNormalizedRelativePath(path, "/path")).toEqual({
        ok: true,
        value: path,
      });
    },
  );

  test.each([
    "",
    "/absolute.json",
    "C:/absolute.json",
    "https://example.test/a.json",
    "nested\\file.json",
    "nested//file.json",
    "./file.json",
    "nested/../file.json",
    "file.json?query",
    "file.json#fragment",
    "a".repeat(257),
  ])("rejects unsafe relative path %s", (path) => {
    expect(decodeNormalizedRelativePath(path, "/path")).toMatchObject({
      ok: false,
      issues: [{ code: "invalid-path", path: "/path" }],
    });
  });

  test("copies exact plain records and reports keys in stable order", () => {
    const input = { zUnknown: true, required: "value", aUnknown: true };

    const result = decodeExactObject(input, "", ["required"], ["optional"]);

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: "unknown-key",
          path: "/aUnknown",
          message: "key is not allowed.",
        },
        {
          code: "unknown-key",
          path: "/zUnknown",
          message: "key is not allowed.",
        },
      ],
    });
  });

  test("rejects missing keys, arrays, custom prototypes, symbols, and getters", () => {
    let getterCalls = 0;
    const withGetter = Object.defineProperty({}, "required", {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        return "secret";
      },
    });
    const withSymbol = { required: "ok", [Symbol("hidden")]: true };
    const custom = Object.create({ inherited: true }) as Record<
      string,
      unknown
    >;
    custom.required = "ok";

    expect(decodeExactObject({}, "", ["required"], [])).toMatchObject({
      ok: false,
      issues: [{ code: "missing-key", path: "/required" }],
    });
    expect(decodeExactObject([], "", ["required"], [])).toMatchObject({
      ok: false,
      issues: [{ code: "invalid-type", path: "" }],
    });
    expect(decodeExactObject(custom, "", ["required"], [])).toMatchObject({
      ok: false,
      issues: [{ code: "invalid-type", path: "" }],
    });
    expect(decodeExactObject(withSymbol, "", ["required"], [])).toMatchObject({
      ok: false,
      issues: [{ code: "invalid-value", path: "" }],
    });
    expect(decodeExactObject(withGetter, "", ["required"], [])).toMatchObject({
      ok: false,
      issues: [{ code: "invalid-value", path: "/required" }],
    });
    expect(getterCalls).toBe(0);
  });

  test("returns a detached record for valid input", () => {
    const input = { required: "value", optional: 1 };
    const result = decodeExactObject(
      input,
      "/item",
      ["required"],
      ["optional"],
    );

    expect(result).toEqual({ ok: true, value: input });
    if (!result.ok) throw new Error("Expected valid record.");
    expect(result.value).not.toBe(input);
  });

  test("rejects non-enumerable object fields and array items", () => {
    const object = Object.defineProperty({}, "required", {
      enumerable: false,
      value: "hidden",
    });
    const array = ["visible"];
    Object.defineProperty(array, "0", { enumerable: false });

    expect(decodeExactObject(object, "", ["required"], [])).toMatchObject({
      ok: false,
      issues: [{ code: "invalid-value", path: "/required" }],
    });
    expect(decodeJsonArray(array, "/items", { maxItems: 1 })).toMatchObject({
      ok: false,
      issues: [{ code: "invalid-value", path: "/items/0" }],
    });
  });
});
