"""
AgentForge MCP Server
=====================
Exposes the AgentForge multi-agent planning engine over the Model Context
Protocol (MCP) so any MCP client (Claude Code, Cursor, Claude Desktop) can
invoke the 7-agent orchestrator as a first-class tool.

Run (stdio transport, for Claude Code / Cursor / Claude Desktop):
    python -m app.mcp_server

Register in an MCP client config (e.g. Claude Code .mcp.json):
    {
      "mcpServers": {
        "agentforge": {
          "command": "python",
          "args": ["-m", "app.mcp_server"],
          "cwd": "backend"
        }
      }
    }

Dependency:
    pip install "mcp[cli]"
"""

from __future__ import annotations

import asyncio
from typing import Literal

from mcp.server.fastmcp import FastMCP

# Reuse the SAME orchestrator the FastAPI app uses — no duplicated logic.
from app.agents.orchestrator import run_blueprint_workflow, run_single_agent
from app.agents.board_meeting import run_board_meeting

mcp = FastMCP(
    "agentforge",
    instructions=(
        "AgentForge turns a raw business idea into a strategic startup "
        "blueprint using 7 specialized LLM agents (CEO, Research, Marketing, "
        "Developer, Finance, Analytics, Operations) orchestrated via LangGraph. "
        "Use `generate_blueprint` for the full plan, `run_agent` for a single "
        "domain analysis, or `board_debate` to stress-test assumptions."
    ),
)

AgentName = Literal[
    "ceo", "research", "marketing", "developer",
    "finance", "analytics", "operations",
]


@mcp.tool()
async def generate_blueprint(idea: str, fast_mode: bool = False) -> dict:
    """Generate a full startup blueprint for a business idea.

    Runs all 7 agents through the LangGraph diamond-topology workflow
    (parallel fan-out -> fan-in -> board debate -> report) and returns the
    consolidated blueprint plus per-agent confidence scores.

    Args:
        idea: The raw business idea, e.g. "AI-powered fitness coaching app".
        fast_mode: Skip the 4-round board debate for a quicker draft.
    """
    result = await run_blueprint_workflow(idea=idea, debate=not fast_mode)
    return {
        "idea": idea,
        "blueprint_markdown": result["report"],
        "agent_confidence": result["confidence_scores"],
        "agents_run": result["agents"],
    }


@mcp.tool()
async def run_agent(idea: str, agent: AgentName) -> dict:
    """Run a single AgentForge agent for one domain perspective.

    Each agent executes the 3-step reasoning loop
    (Generate -> Self-Critique -> Refine) and returns a Pydantic-validated
    analysis — useful when the client only needs one lens (e.g. finance).
    """
    result = await run_single_agent(idea=idea, agent=agent)
    return {
        "agent": agent,
        "analysis": result["output"],
        "confidence": result["confidence"],
        "critique_notes": result["critique"],
    }


@mcp.tool()
async def board_debate(idea: str, rounds: int = 4) -> dict:
    """Run the cross-functional board-meeting debate on an idea.

    Agents challenge each other's assumptions over N rounds and converge on
    a consensus + flagged risks — the cross-validation layer of AgentForge.
    """
    result = await run_board_meeting(idea=idea, rounds=rounds)
    return {
        "consensus": result["consensus"],
        "open_risks": result["risks"],
        "transcript": result["statements"],
    }


@mcp.resource("agentforge://agents")
def list_agents() -> str:
    """Expose the agent roster as an MCP resource for client discovery."""
    return (
        "CEO, Research, Marketing, Developer, Finance, Analytics, Operations "
        "— orchestrated via LangGraph (parallel diamond topology)."
    )


def main() -> None:
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
