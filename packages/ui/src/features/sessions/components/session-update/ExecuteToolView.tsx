import { Terminal } from "@phosphor-icons/react";
import { compactHomePath } from "@posthog/shared";
import { CommitFailureActions } from "./CommitFailureActions";
import { ToolRow } from "./ToolRow";
import {
  ContentPre,
  getContentText,
  stripCodeFences,
  ToolTitle,
  type ToolViewProps,
  truncateText,
  useToolCallStatus,
} from "./toolCallUtils";

const ANSI_REGEX = new RegExp(`${String.fromCharCode(0x1b)}\\[[0-9;]*m`, "g");
const MAX_COMMAND_LENGTH = 120;
// git commit — allow flags / -c k=v / env-prefix between `git` and `commit`
const GIT_COMMIT_COMMAND_REGEX =
  /(?:^|[\s;&|(])git(?:\s+-\S+|\s+-[cC]\s+\S+)*\s+commit(?:\s|$)/;

// hook managers + direct hook execution + common hook bodies
const PRE_COMMIT_COMMAND_REGEX =
  /\blefthook\b[\s\S]*?\bpre-commit\b|\bpre-commit\b(?:[\s\S]*?\brun\b|\s+run\b|$)|\bhusky\b|\bovercommit\b|\blint-staged\b|[./]*\.(?:git\/hooks|husky)\/pre-commit\b/i;

const PRE_COMMIT_OUTPUT_REGEX =
  /hook:\s*pre-commit\b|\blefthook\b.*\b(hook|run)\b|\bRunning hooks?\b.*\bpre-commit\b|\[pre-commit\]/i;

const EXIT_STATUS_SIGNAL_REGEX =
  /\b(?:exit status|exit code|exited with code)\s+(\d+)\b/gi;

function hasNonZeroExitStatusSignal(text: string): boolean {
  for (const match of text.matchAll(EXIT_STATUS_SIGNAL_REGEX)) {
    const exitCode = Number(match[1]);
    if (Number.isFinite(exitCode) && exitCode > 0) {
      return true;
    }
  }
  return false;
}

interface ExecuteRawInput {
  command?: string;
  description?: string;
}

export function ExecuteToolView({
  toolCall,
  turnCancelled,
  turnComplete,
  expanded = false,
}: ToolViewProps) {
  const { status, rawInput, content, title } = toolCall;
  const { isLoading, isFailed, wasCancelled } = useToolCallStatus(
    status,
    turnCancelled,
    turnComplete,
  );

  const executeInput = rawInput as ExecuteRawInput | undefined;
  const command = executeInput?.command ?? "";
  const description =
    executeInput?.description ?? (command ? undefined : title);

  const output = stripCodeFences(getContentText(content) ?? "").replace(
    ANSI_REGEX,
    "",
  );
  const hasOutput = output.trim().length > 0;
  const isGitCommitCommand = GIT_COMMIT_COMMAND_REGEX.test(command);
  const isPreCommitRunCommand = PRE_COMMIT_COMMAND_REGEX.test(command);
  const hasPreCommitSignal = PRE_COMMIT_OUTPUT_REGEX.test(output);
  const hasNonZeroExitSignal = hasNonZeroExitStatusSignal(output);
  const hasFailureSignal = isFailed || hasNonZeroExitSignal;
  const showCommitFailureActions =
    hasFailureSignal &&
    hasOutput &&
    ((isGitCommitCommand && hasPreCommitSignal) || isPreCommitRunCommand);

  return (
    <ToolRow
      icon={Terminal}
      isLoading={isLoading}
      isFailed={isFailed}
      wasCancelled={wasCancelled}
      defaultOpen={expanded}
      content={
        hasOutput ? (
          <>
            <ContentPre>{output}</ContentPre>
            {showCommitFailureActions && (
              <CommitFailureActions command={command} output={output} />
            )}
          </>
        ) : undefined
      }
    >
      {description && <ToolTitle>{description}</ToolTitle>}
      {command && (
        <ToolTitle className="min-w-0 truncate">
          <span
            className="block truncate border border-border bg-gray-5 font-mono"
            title={command}
          >
            {truncateText(compactHomePath(command), MAX_COMMAND_LENGTH)}
          </span>
        </ToolTitle>
      )}
    </ToolRow>
  );
}
