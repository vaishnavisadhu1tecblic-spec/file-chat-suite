import test from "node:test";
import assert from "node:assert/strict";
import { appendUniqueMessage } from "./chatUtils.js";

test("appendUniqueMessage ignores a duplicate message by _id and text/time", () => {
  const existing = [
    {
      _id: "1",
      text: "hello",
      time: "11:30 AM",
    },
  ];

  const newMessage = {
    _id: "1",
    text: "hello",
    time: "11:30 AM",
  };

  const result = appendUniqueMessage(existing, newMessage);

  assert.equal(result.length, 1);
  assert.equal(result[0]._id, "1");
});
