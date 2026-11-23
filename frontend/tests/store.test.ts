import { describe, expect, it } from "vitest";

import { store } from "../src/app/store";

describe("store", () => {
  it("initializes auth state without circular import errors", () => {
    expect(store.getState().auth.phase).toBe("credentials");
    expect(store.getState().auth.status).toBe("idle");
    expect(store.getState().accounts.accounts).toEqual([]);
  });
});
