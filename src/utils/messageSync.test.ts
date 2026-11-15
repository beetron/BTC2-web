import { describe, expect, it } from "vitest";
import type { ConversationMessage } from "../services/conversationService";
import {
  applyMessageChanges,
  findDeletedMessageIds,
  newestChangeTime,
} from "./messageSync";

// Message n is sent at minute n, so ids and times line up in examples
const at = (minute: number) =>
  new Date(Date.UTC(2026, 10, 15, 10, minute)).toISOString();

const msg = (
  n: number,
  extra: Partial<ConversationMessage> = {},
): ConversationMessage => ({
  _id: `m${n}`,
  senderId: "bob",
  message: `message ${n}`,
  createdAt: at(n),
  updatedAt: at(n),
  ...extra,
});

const ids = (messages: { _id: string }[]) => messages.map((m) => m._id);

describe("findDeletedMessageIds", () => {
  it("drops a local message missing from a page that holds all history", () => {
    expect(findDeletedMessageIds([msg(1), msg(2)], [msg(2)], false)).toEqual(["m1"]);
  });

  it("only judges messages newer than the page when older pages exist", () => {
    // m1 is older than the page, so it may just be on the next page back
    expect(findDeletedMessageIds([msg(1), msg(3)], [msg(2), msg(4)], true)).toEqual([
      "m3",
    ]);
  });

  it("keeps everything that is still on the page", () => {
    expect(findDeletedMessageIds([msg(1)], [msg(1)], false)).toEqual([]);
  });
});

describe("applyMessageChanges", () => {
  it("replaces a message held locally (an edit)", () => {
    const edited = msg(2, { message: "fixed typo", editedAt: at(9) });
    const { messages, applied } = applyMessageChanges([msg(1), msg(2)], [edited]);

    expect(messages[1].message).toBe("fixed typo");
    expect(ids(applied)).toEqual(["m2"]);
  });

  it("replaces a message with its tombstone (a delete for everyone)", () => {
    const tombstone = msg(2, { message: null, deletedAt: at(9) });
    const { messages } = applyMessageChanges([msg(1), msg(2)], [tombstone]);

    expect(messages[1].deletedAt).toBe(at(9));
    expect(messages[1].message).toBeNull();
  });

  it("adds a new message and keeps the list in send order", () => {
    const { messages } = applyMessageChanges([msg(1), msg(5)], [msg(3)]);
    expect(ids(messages)).toEqual(["m1", "m3", "m5"]);
  });

  it("skips a change older than everything loaded", () => {
    // m1 is on a page that is not loaded; adding it would leave a gap
    const current = [msg(5), msg(6)];
    const { messages, applied } = applyMessageChanges(current, [
      msg(1, { message: "edited" }),
    ]);

    expect(messages).toBe(current);
    expect(applied).toEqual([]);
  });

  it("accepts any change when nothing is loaded yet", () => {
    const { messages } = applyMessageChanges([], [msg(1)]);
    expect(ids(messages)).toEqual(["m1"]);
  });

  it("refreshes the quote in replies to an edited message", () => {
    const reply = msg(3, {
      replyToId: "m2",
      replyTo: {
        _id: "m2",
        senderId: "bob",
        message: "message 2",
        hasImages: false,
        deleted: false,
        unavailable: false,
      },
    });
    const { messages, applied } = applyMessageChanges(
      [msg(2), reply],
      [msg(2, { message: "message 2, edited" })],
    );

    expect(messages[1].replyTo?.message).toBe("message 2, edited");
    // The reply changed too, so it is cached again
    expect(ids(applied).sort()).toEqual(["m2", "m3"]);
  });

  it("marks the quote deleted when the quoted message is deleted", () => {
    const reply = msg(3, {
      replyTo: {
        _id: "m2",
        senderId: "bob",
        message: "message 2",
        hasImages: true,
        deleted: false,
        unavailable: false,
      },
    });
    const { messages } = applyMessageChanges(
      [msg(2), reply],
      [msg(2, { message: null, imageFiles: [], deletedAt: at(9) })],
    );

    expect(messages[1].replyTo).toMatchObject({
      deleted: true,
      message: null,
      hasImages: false,
    });
  });

  it("cuts a refreshed quote to 200 characters like the API", () => {
    const reply = msg(3, {
      replyTo: {
        _id: "m2",
        senderId: "bob",
        message: "short",
        hasImages: false,
        deleted: false,
        unavailable: false,
      },
    });
    const { messages } = applyMessageChanges(
      [msg(2), reply],
      [msg(2, { message: "x".repeat(300) })],
    );

    expect(messages[1].replyTo?.message).toHaveLength(200);
  });

  it("gives a refreshed quote of a photo the first photo as its thumbnail", () => {
    const reply = msg(3, {
      replyTo: {
        _id: "m2",
        senderId: "bob",
        message: "",
        hasImages: true,
        imageFile: "a.jpg",
        imagesExpired: false,
        deleted: false,
        unavailable: false,
      },
    });
    const { messages } = applyMessageChanges(
      [msg(2), reply],
      [msg(2, { message: "caption", imageFiles: ["a.jpg", "b.jpg"] })],
    );

    expect(messages[1].replyTo).toMatchObject({
      message: "caption",
      hasImages: true,
      imageFile: "a.jpg",
      imagesExpired: false,
    });
  });

  it("drops the thumbnail when the quoted photos expire", () => {
    const reply = msg(3, {
      replyTo: {
        _id: "m2",
        senderId: "bob",
        message: "",
        hasImages: true,
        imageFile: "a.jpg",
        imagesExpired: false,
        deleted: false,
        unavailable: false,
      },
    });
    const { messages } = applyMessageChanges(
      [msg(2), reply],
      [msg(2, { message: "", imageFiles: ["a.jpg"], imagesExpiredAt: at(40) })],
    );

    expect(messages[1].replyTo).toMatchObject({
      hasImages: true,
      imageFile: null,
      imagesExpired: true,
    });
  });
});

describe("newestChangeTime", () => {
  it("uses the latest updatedAt, so edits count", () => {
    expect(newestChangeTime([msg(1, { updatedAt: at(30) }), msg(2)])).toBe(at(30));
  });

  it("falls back to createdAt when updatedAt is missing", () => {
    expect(newestChangeTime([msg(4, { updatedAt: undefined })])).toBe(at(4));
  });

  it("returns null for no messages", () => {
    expect(newestChangeTime([])).toBeNull();
  });
});
