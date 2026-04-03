import { query } from "@anthropic-ai/claude-agent-sdk";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";

export const SUBAGENTS: Record<string, AgentDefinition> = {
  researcher: {
    description:
      "Expert researcher that finds, summarizes and explains information on any topic.",
    prompt: `You are a focused research assistant. Given a task:
1. Search the web for relevant information
2. Fetch and read key sources
3. Produce a concise, factual summary (3-5 bullet points max)
4. Include the most important facts and any useful links

Be thorough but concise. No fluff.`,
    tools: ["WebSearch", "WebFetch"],
  },
  writer: {
    description:
      "Expert writer that produces well-structured written content — docs, emails, posts, etc.",
    prompt: `You are a skilled writer. Given a task:
1. Understand the goal and target audience
2. Produce clear, well-structured written content
3. Use appropriate tone (formal, casual, technical, etc.)
4. Keep it concise and to the point

Return only the final written piece, no meta-commentary.`,
    tools: [],
  },
  coder: {
    description:
      "Expert software engineer that writes, reviews, and explains code.",
    prompt: `You are an expert software engineer. Given a coding task:
1. Understand the requirements clearly
2. Write clean, correct, well-commented code
3. Briefly explain key design decisions
4. Flag any edge cases or limitations

Return the code first, then a short explanation.`,
    tools: [],
  },
  planner: {
    description:
      "Expert project planner that breaks down complex tasks into actionable subtasks.",
    prompt: `You are a strategic planner. Given a task:
1. Analyze the goal and scope
2. Break it down into 3-7 concrete, actionable subtasks
3. Order them logically (dependencies first)
4. Estimate effort for each (small / medium / large)

Return the subtasks as a numbered list, one per line. No preamble.`,
    tools: [],
  },
};

export async function orchestrate(markDoneId: string, title: string): Promise<{
  category: string;
  result: string;
  subtasks: string[];
}> {
  let category = "general";
  let result = "";
  const subtasks: string[] = [];

  const systemPrompt = `You are a task orchestration agent for MarkDone.
Your job is to:
1. Classify the task into one of: research, writing, coding, planning, general
2. Delegate to the appropriate specialist subagent
3. If it's a large task, also use the planner subagent to break it into subtasks
4. Collect and synthesize the results

Item ID: ${markDoneId}
Task: "${title}"

After completing the work, end your response with:
CATEGORY: <category>
SUBTASKS: <comma-separated list of subtasks, or "none">`;

  for await (const message of query({
    prompt: `Work on this MarkDone task: "${title}"

Steps:
1. Determine the best subagent for this task (researcher/writer/coder/planner)
2. Use that subagent to complete the task
3. If the task is complex, also use the planner to break it into subtasks
4. Summarize the outcome

End your response with:
CATEGORY: <research|writing|coding|planning|general>
SUBTASKS: <subtask1, subtask2, ... OR "none">`,
    options: {
      allowedTools: ["Agent"],
      systemPrompt,
      agents: SUBAGENTS,
      maxTurns: 10,
    },
  })) {
    if ("result" in message && message.result) {
      const text = message.result;

      // Extract category
      const catMatch = text.match(/CATEGORY:\s*(\w+)/i);
      if (catMatch) category = catMatch[1].toLowerCase();

      // Extract subtasks
      const subMatch = text.match(/SUBTASKS:\s*(.+)/i);
      if (subMatch && subMatch[1].trim().toLowerCase() !== "none") {
        subtasks.push(
          ...subMatch[1]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        );
      }

      // The result is everything before the CATEGORY line
      result = text.replace(/\nCATEGORY:.*$/ms, "").trim();
    }
  }

  return { category, result, subtasks };
}
