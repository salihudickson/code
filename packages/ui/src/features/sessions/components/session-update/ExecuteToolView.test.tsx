import type { ToolCall } from "@posthog/ui/features/sessions/types";
import { Theme } from "@radix-ui/themes";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExecuteToolView } from "./ExecuteToolView";

vi.mock("./CommitFailureActions", () => ({
  CommitFailureActions: ({
    command,
    output,
  }: {
    command: string;
    output: string;
  }) => (
    <div
      data-testid="commit-failure-actions"
      data-command={command}
      data-output={output}
    />
  ),
}));

function makeToolCall(overrides: Partial<ToolCall> = {}): ToolCall {
  return {
    toolCallId: "tc-1",
    title: "bash",
    kind: "execute",
    status: "completed",
    rawInput: {
      command: 'git commit -m "test"',
      description: "run commit",
    },
    content: [],
    ...overrides,
  };
}

function textContent(text: string): NonNullable<ToolCall["content"]> {
  return [{ type: "content", content: { type: "text", text } }];
}

function renderView(toolCall: ToolCall) {
  return render(
    <Theme>
      <ExecuteToolView toolCall={toolCall} expanded />
    </Theme>,
  );
}

describe("ExecuteToolView", () => {
  it("shows commit failure actions for a git commit failure with hook output", () => {
    renderView(
      makeToolCall({
        status: "failed",
        rawInput: { command: 'git commit -m "test"' },
        content: textContent(`Exit code 1\n╭───╮\n│ hook: pre-commit │\n╰───╯`),
      }),
    );

    const actions = screen.getByTestId("commit-failure-actions");
    expect(actions).toHaveAttribute("data-command", 'git commit -m "test"');
    expect(actions).toHaveAttribute(
      "data-output",
      expect.stringContaining("hook: pre-commit"),
    );
  });

  it("still shows commit failure actions when the tool status is completed but the output has a non-zero exit signal", () => {
    renderView(
      makeToolCall({
        status: "completed",
        rawInput: { command: "pre-commit run --all-files" },
        content: textContent("exit status 1\npre-commit failed"),
      }),
    );

    expect(screen.getByTestId("commit-failure-actions")).toBeInTheDocument();
  });

  it("does not show commit failure actions for unrelated failed bash output", () => {
    renderView(
      makeToolCall({
        status: "failed",
        rawInput: { command: "git push origin main" },
        content: textContent("exit status 1\nnetwork error"),
      }),
    );

    expect(
      screen.queryByTestId("commit-failure-actions"),
    ).not.toBeInTheDocument();
  });
});
