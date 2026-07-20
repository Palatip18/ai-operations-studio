import { beforeEach, describe, expect, it } from "vitest";

import { runSupportAgent } from "./support-agent";
import {
  endSupportChatSession,
  listSupportChatSessions,
  redactChatHistoryText,
  resetSupportChatHistoryForTests,
  saveSupportChatTurn,
} from "./support-chat-history";

describe("support chat history", () => {
  beforeEach(() => resetSupportChatHistoryForTests());

  it("redacts likely personal and secret values while preserving demo user IDs", () => {
    const text = redactChatHistoryText("ABC123 test@example.com 081-234-5678 123456789012 otp: 998877");
    expect(text).toContain("ABC123");
    expect(text).not.toContain("test@example.com");
    expect(text).not.toContain("081-234-5678");
    expect(text).not.toContain("123456789012");
    expect(text).toContain("otp=[REDACTED]");
  });

  it("groups sequential turns into one reviewable session and can close it", async () => {
    const sessionId = "CHAT-11111111-1111-4111-8111-111111111111";
    const first = await runSupportAgent("What promotions are available?");
    const second = await runSupportAgent("Tell me the Weekend Reward conditions", ["What promotions are available?"]);

    await saveSupportChatTurn({ sessionId, userMessage: "What promotions are available?", result: first, now: 1_000 });
    await saveSupportChatTurn({ sessionId, userMessage: "Tell me the Weekend Reward conditions", result: second, now: 2_000 });

    const sessions = await listSupportChatSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].turnCount).toBe(2);
    expect(sessions[0].turns.map((turn) => turn.userMessage)).toEqual([
      "What promotions are available?",
      "Tell me the Weekend Reward conditions",
    ]);

    const ended = await endSupportChatSession(sessionId, 3_000);
    expect(ended?.status).toBe("ENDED");
    expect(ended?.endedAt).toBe(new Date(3_000).toISOString());
  });
});
