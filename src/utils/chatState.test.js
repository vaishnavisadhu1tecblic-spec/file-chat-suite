import test from "node:test";
import assert from "node:assert/strict";
import {
  appendUniqueMessage,
  formatMessageClockTime,
  formatMessageDateLabel,
  getLocalDateKey,
  getMessageTimestamp,
  shouldShowDateSeparator,
} from "./chatUtils.js";

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

test("formatMessageDateLabel uses local calendar dates", () => {
  const now = new Date(2026, 9, 16, 15, 0, 0);

  assert.equal(formatMessageDateLabel(new Date(2026, 9, 16, 1, 0, 0), now), "Today");
  assert.equal(formatMessageDateLabel(new Date(2026, 9, 15, 23, 59, 0), now), "Yesterday");
  assert.equal(
    formatMessageDateLabel(new Date(2026, 9, 10, 12, 0, 0), now),
    new Date(2026, 9, 10, 12, 0, 0).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  );
});

test("shouldShowDateSeparator groups by local date and skips missing timestamps", () => {
  const messages = [
    { createdAt: "2026-10-15T23:00:00.000Z" },
    { createdAt: "2026-10-15T23:30:00.000Z" },
    { createdAt: "2026-10-16T01:00:00.000Z" },
    { time: "3:00 PM" },
  ];

  assert.equal(shouldShowDateSeparator(messages, 0), true);
  assert.equal(
    shouldShowDateSeparator(messages, 1),
    getLocalDateKey(getMessageTimestamp(messages[0])) !==
      getLocalDateKey(getMessageTimestamp(messages[1]))
      ? true
      : false,
  );
  assert.equal(
    shouldShowDateSeparator(messages, 2),
    getLocalDateKey(getMessageTimestamp(messages[1])) !==
      getLocalDateKey(getMessageTimestamp(messages[2])),
  );
  assert.equal(shouldShowDateSeparator(messages, 3), false);
});

test("formatMessageClockTime uses createdAt instead of the current clock", () => {
  const message = {
    createdAt: "2026-01-02T08:05:00.000Z",
    time: "wrong",
  };

  const label = formatMessageClockTime(message);
  const expected = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  assert.equal(label, expected);
});
