"""Basic import tests for closed-loop-finance.

Validates that core modules can be imported without errors.
"""

def test_import_state_schema():
    """Test that the GraphState schema module imports."""
    from agents.src.state.schema import GraphState, FileEvidence, Evidence
    assert GraphState is not None
    assert FileEvidence is not None
    assert Evidence is not None


def test_import_tools_module():
    """Test that the tools package is importable."""
    import agents.src.tools
    assert agents.src.tools is not None


def test_import_memory_module():
    """Test that the memory package is importable."""
    import agents.src.memory
    assert agents.src.memory is not None


def test_import_agents_module():
    """Test that the agents package is importable."""
    import agents.src.agents
    assert agents.src.agents is not None


def test_graphstate_typeddict_structure():
    """Test that GraphState has expected keys."""
    from agents.src.state.schema import GraphState
    expected_keys = {"period", "repo_root", "evidence", "findings", "cfo_brief", "human_approved"}
    # TypedDict __annotations__ contains the fields
    assert expected_keys.issubset(set(GraphState.__annotations__))
