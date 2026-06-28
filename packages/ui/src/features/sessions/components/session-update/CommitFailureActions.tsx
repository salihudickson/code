import { Check, Copy, Sparkle } from "@phosphor-icons/react";
import { buildCommitHookErrorPrompt } from "@posthog/core/git-interaction/errorPrompts";
import { useFixWithAgent } from "@posthog/ui/features/git-interaction/useFixWithAgent";
import { Button, Flex } from "@radix-ui/themes";
import { useState } from "react";

const ICON_SIZE = 12;

/**
 * Action footer shown under a failed `git commit` Bash tool call (e.g. a
 * pre-commit hook rejected the commit). Lets the user hand the failure output
 * to the agent to resolve, or copy it to paste into a new message.
 */
export function CommitFailureActions({
  command,
  output,
}: {
  command: string;
  output: string;
}) {
  const { canFixWithAgent, fixWithAgent } = useFixWithAgent(() =>
    buildCommitHookErrorPrompt(command),
  );
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard writes can reject when the document isn't focused; ignore.
    }
  };

  return (
    <Flex gap="2" justify="end" align="center">
      {canFixWithAgent && (
        <Button
          size="1"
          variant="soft"
          color="gray"
          onClick={() => {
            void fixWithAgent(output);
          }}
        >
          <Sparkle size={ICON_SIZE} />
          Fix with agent
        </Button>
      )}
      <Button size="1" variant="soft" color="gray" onClick={handleCopy}>
        {copied ? <Check size={ICON_SIZE} /> : <Copy size={ICON_SIZE} />}
        {copied ? "Copied" : "Copy error"}
      </Button>
    </Flex>
  );
}
