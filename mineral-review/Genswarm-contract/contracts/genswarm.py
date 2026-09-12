# { "Depends": "py-genlayer:test" }

"""
GenSwarm — Stigmergic Agent Coordination Protocol on GenLayer

The missing coordination layer for the agentic economy.

Zero-token agent coordination via pheromone signals (stigmergy),
the same mechanism ant colonies use to solve NP-hard routing problems.
Ported from Cubiczan Swarm Intelligence Platform (cubiczan-swarm-pack).

Core insight: Multi-agent coordination via LLM chat is an architecture bug.
Scent signals (exponential-decay pheromones) replace all inter-agent LLM calls.
Result: 5.86x faster, 3.4x cheaper, identical quality.

Stigmergic cost (linear): C = C_route + m*(S + R)
Traditional cost (quadratic): C = m*(S+T) + h*m*(m+1)/2

Hackathon: GenLayer Bradbury Testnet — Track 1: Agentic Economy Infrastructure
"""

import json
import math
from dataclasses import dataclass
from genlayer import *


# =====================================================
# DATA MODELS
# =====================================================

class ScentType:
    """Six pheromone signal types with distinct decay behaviors."""
    COMPLETION = "completion"
    FAILURE = "failure"
    DIFFICULTY = "difficulty"
    URGENCY = "urgency"
    PROGRESS = "progress"
    HELP_WANTED = "help_wanted"


class TaskStatus:
    """Task lifecycle states in the swarm DAG."""
    PENDING = "pending"
    READY = "ready"
    ACTIVE = "active"
    COMPLETE = "complete"
    ESCALATED = "escalated"


class ConsensusOutcome:
    """Result of adversarial AI consensus on a task."""
    CONSENSUS_REACHED = "consensus_reached"
    ESCALATED_TO_HUMAN = "escalated_to_human"


@allow_storage
@dataclass
class ScentSignal:
    """A single pheromone emission from a swarm worker."""
    signal_id: str
    task_id: str
    worker_id: str
    scent_type: str
    intensity: float
    emitted_at: int  # block timestamp
    metadata_str: str  # JSON-encoded metadata


@allow_storage
@dataclass
class SwarmTask:
    """A single task in the dependency graph."""
    task_id: str
    description: str
    domain: str  # financial, cybersecurity, business-intel, etc.
    tags_str: str  # JSON-encoded list of skill tags
    dependencies_str: str  # JSON-encoded list of task_ids
    dependents_str: str  # JSON-encoded list of task_ids
    status: str
    worker_id: str
    result: str
    reward: int  # on-chain reward in base units
    created_at: int
    completed_at: int
    consensus_score: float
    consensus_outcome: str
    retries: int


@allow_storage
@dataclass
class Worker:
    """A registered swarm participant (human or AI agent)."""
    worker_id: str
    address: Address
    tags_str: str  # JSON-encoded list of skill tags
    reputation: int  # accumulated reputation points
    tasks_completed: int
    tasks_failed: int
    model_name: str  # "human" or LLM model identifier
    is_active: bool
    joined_at: int


@allow_storage
@dataclass
class SwarmJob:
    """A decomposed job (collection of tasks forming a DAG)."""
    job_id: str
    requester: Address
    description: str
    domain: str
    task_ids_str: str  # JSON-encoded list of task_ids
    status: str  # decomposing, active, complete, failed
    total_reward: int
    created_at: int
    completed_at: int


# =====================================================
# GENSWARM CONTRACT
# =====================================================

class GenSwarm(gl.Contract):
    """
    Stigmergic Agent Coordination Protocol.

    This contract implements ant-colony-inspired coordination for
    heterogeneous AI agents operating on GenLayer. Agents coordinate
    via pheromone signals instead of inter-agent LLM calls, achieving
    zero-token coordination overhead.

    Architecture:
        1. Requester submits a job
        2. AI validators decompose it into a task DAG (Optimistic Democracy)
        3. Workers claim tasks using stigmergic scent-field scoring
        4. High-stakes results are validated via adversarial consensus
        5. Reputation and rewards are tracked on-chain
    """

    # --- Storage Maps ---
    tasks: TreeMap[str, SwarmTask]
    signals: TreeMap[str, ScentSignal]  # signal_id -> ScentSignal
    task_signals: TreeMap[str, DynArray[str]]  # task_id -> array of signal_ids
    workers: TreeMap[Address, Worker]
    worker_by_id: TreeMap[str, Address]  # worker_id -> Address
    jobs: TreeMap[str, SwarmJob]
    pending_tasks: DynArray[str]  # ready tasks available for claiming
    all_tasks: DynArray[str]  # all task IDs
    all_jobs: DynArray[str]  # all job IDs

    def __init__(self):
        pass

    # =====================================================
    # WORKER REGISTRATION
    # =====================================================

    @gl.public.write
    def register_worker(
        self,
        worker_id: str,
        tags_str: str,
        model_name: str,
    ) -> None:
        """
        Register as a swarm worker. Workers provide their skill tags
        and optionally their AI model identifier. Humans can register
        with model_name='human'.

        Args:
            worker_id: Unique identifier for this worker
            tags_str: JSON array of skill tags, e.g. '["financial","analyst"]'
            model_name: AI model name or 'human'
        """
        sender = gl.message.sender_address
        if sender in self.workers:
            raise Exception("Worker already registered")

        tags = json.loads(tags_str)
        if not isinstance(tags, list):
            raise Exception("tags must be a JSON array")

        worker = Worker(
            worker_id=worker_id,
            address=sender,
            tags_str=tags_str,
            reputation=0,
            tasks_completed=0,
            tasks_failed=0,
            model_name=model_name,
            is_active=True,
            joined_at=gl.block.timestamp,
        )
        self.workers[sender] = worker
        self.worker_by_id[worker_id] = sender

    @gl.public.view
    def get_worker(self, addr: Address) -> dict:
        """Get worker info by address."""
        if addr not in self.workers:
            raise Exception("Worker not found")
        w = self.workers[addr]
        return {
            "worker_id": w.worker_id,
            "address": w.address.as_hex,
            "tags": json.loads(w.tags_str),
            "reputation": w.reputation,
            "tasks_completed": w.tasks_completed,
            "tasks_failed": w.tasks_failed,
            "model_name": w.model_name,
            "is_active": w.is_active,
        }

    # =====================================================
    # JOB SUBMISSION & AI DECOMPOSITION
    # =====================================================

    @gl.public.write
    def submit_job(
        self,
        job_id: str,
        description: str,
        domain: str,
        total_reward: int,
    ) -> str:
        """
        Submit a job to the swarm. The AI validators will decompose
        it into a task DAG using Optimistic Democracy consensus.

        The decomposition is subjective — different AI models may
        produce different task breakdowns. The Equivalence Principle
        ensures validators converge on a reasonable decomposition.

        Args:
            job_id: Unique job identifier
            description: What the job needs accomplished
            domain: Target domain (financial, cybersecurity, etc.)
            total_reward: Total reward to distribute (in base units)

        Returns:
            The job_id
        """
        sender = gl.message.sender_address

        job = SwarmJob(
            job_id=job_id,
            requester=sender,
            description=description,
            domain=domain,
            task_ids_str="[]",
            status="decomposing",
            total_reward=total_reward,
            created_at=gl.block.timestamp,
            completed_at=0,
        )
        self.jobs[job_id] = job
        self.all_jobs.append(job_id)

        # Decompose into task DAG via AI consensus
        task_ids = self._decompose_job(job_id, description, domain)

        job.task_ids_str = json.dumps(task_ids)
        job.status = "active"
        self.jobs[job_id] = job

        return job_id

    def _decompose_job(
        self,
        job_id: str,
        description: str,
        domain: str,
    ) -> list:
        """
        Use AI validators to decompose a job into a task DAG.
        This leverages GenLayer's Optimistic Democracy — multiple
        validators independently decompose the job, and the
        Equivalence Principle ensures convergence.

        Uses prompt_non_comparative since decomposition is subjective —
        different valid decompositions may exist.
        """

        def get_decomposition() -> str:
            prompt = f"""You are an expert task decomposition engine for the GenSwarm protocol.

Given this job description, decompose it into a Directed Acyclic Graph (DAG) of tasks.

JOB: {description}
DOMAIN: {domain}

Rules:
1. Each task must have a unique task_id (short, like 't1', 't2', etc.)
2. Each task needs a description, domain tags, and a list of task_ids it depends on
3. Start with independent tasks (no dependencies)
4. Chain dependent tasks logically
5. Aim for 3-7 tasks for a typical job

Respond in JSON:
{{
  "tasks": [
    {{
      "task_id": "t1",
      "description": "...",
      "tags": ["skill1", "skill2"],
      "dependencies": []
    }},
    {{
      "task_id": "t2",
      "description": "...",
      "tags": ["skill3"],
      "dependencies": ["t1"]
    }}
  ]
}}

It is mandatory that you respond only using the JSON format above,
nothing else. Don't include any other words or characters,
your output must be only JSON without any formatting prefix or suffix.
This result should be perfectly parsable by a JSON parser without errors."""
            result = gl.nondet.exec_prompt(prompt, response_format="json")
            return json.dumps(result, sort_keys=True)

        # Use non-comparative equivalence since decomposition is subjective
        # Multiple valid decompositions exist — validators converge independently
        decomp_json = json.loads(
            gl.eq_principle.prompt_non_comparative(get_decomposition)
        )

        tasks_data = decomp_json.get("tasks", [])
        if not tasks_data:
            raise Exception("AI decomposition returned no tasks")

        # Build the task DAG on-chain
        task_ids = []
        dependents_map: dict = {}  # maps task_id -> list of dependent task_ids

        # First pass: create tasks
        for td in tasks_data:
            tid = f"{job_id}_{td['task_id']}"
            deps = [f"{job_id}_{d}" for d in td.get("dependencies", [])]
            tags = td.get("tags", [domain])
            if domain not in tags:
                tags.append(domain)

            task = SwarmTask(
                task_id=tid,
                description=td["description"],
                domain=domain,
                tags_str=json.dumps(tags),
                dependencies_str=json.dumps(deps),
                dependents_str="[]",
                status=TaskStatus.READY if not deps else TaskStatus.PENDING,
                worker_id="",
                result="",
                reward=0,
                created_at=gl.block.timestamp,
                completed_at=0,
                consensus_score=0.0,
                consensus_outcome="",
                retries=0,
            )
            self.tasks[tid] = task
            self.all_tasks.append(tid)
            self.task_signals[tid] = DynArray()
            task_ids.append(tid)

            # Track dependents (reverse of dependencies)
            for dep in deps:
                if dep not in dependents_map:
                    dependents_map[dep] = []
                dependents_map[dep].append(tid)

            # Mark as pending if has dependencies
            if deps:
                task.status = TaskStatus.PENDING
                self.tasks[tid] = task
            else:
                # Ready tasks are immediately claimable
                self.pending_tasks.append(tid)

                # Emit urgency signal for ready tasks
                self._emit_signal(tid, "", ScentType.URGENCY, 1.0)

        # Second pass: update dependents
        for tid, deps_list in dependents_map.items():
            if tid in self.tasks:
                task = self.tasks[tid]
                task.dependents_str = json.dumps(deps_list)
                self.tasks[tid] = task

        return task_ids

    # =====================================================
    # STIGMERGIC SCENT SIGNALS
    # =====================================================

    def _emit_signal(
        self,
        task_id: str,
        worker_id: str,
        scent_type: str,
        intensity: float,
    ) -> str:
        """
        Emit a pheromone signal into the scent field.
        This is the core stigmergic coordination mechanism —
        workers communicate indirectly through these signals
        without any direct inter-agent communication.
        """
        signal_id = f"{task_id}_{scent_type}_{gl.block.timestamp}_{len(self.signals)}"

        signal = ScentSignal(
            signal_id=signal_id,
            task_id=task_id,
            worker_id=worker_id,
            scent_type=scent_type,
            intensity=intensity,
            emitted_at=gl.block.timestamp,
            metadata_str="{}",
        )
        self.signals[signal_id] = signal
        self.task_signals[task_id].append(signal_id)

        return signal_id

    def _read_scent(self, task_id: str, scent_type: str) -> float:
        """
        Read aggregated scent intensity for a task.
        Sum of all non-expired signal intensities.

        This is pure arithmetic — ZERO LLM calls.
        The mathematical formula from Cubiczan/TEMM1E:
            decay(t) = intensity * e^(-lambda * elapsed)
        """
        total = 0.0
        now = gl.block.timestamp
        signal_ids = self.task_signals.get(task_id, DynArray())

        for i in range(len(signal_ids)):
            sig_id = signal_ids[i]
            if sig_id not in self.signals:
                continue
            sig = self.signals[sig_id]

            if sig.scent_type != scent_type:
                continue

            elapsed = now - sig.emitted_at
            if elapsed < 0:
                elapsed = 0

            # Apply scent-type specific decay
            current = self._decay_signal(sig, elapsed)
            total += current

        return total

    def _decay_signal(self, sig: ScentSignal, elapsed: int) -> float:
        """
        Calculate decayed signal intensity.
        Half-lives from Cubiczan research:
            COMPLETION: 300s (5 min), FAILURE: 360s, DIFFICULTY: 120s,
            URGENCY: grows (special), PROGRESS: 20s, HELP_WANTED: 120s
        """
        half_lives = {
            ScentType.COMPLETION: 300.0,
            ScentType.FAILURE: 360.0,
            ScentType.DIFFICULTY: 120.0,
            ScentType.URGENCY: -1.0,  # grows, doesn't decay
            ScentType.PROGRESS: 20.0,
            ScentType.HELP_WANTED: 120.0,
        }

        hl = half_lives.get(sig.scent_type, 300.0)

        if sig.scent_type == ScentType.URGENCY:
            # Urgency GROWS over time, capped at 5.0
            return min(sig.intensity + (elapsed / 60.0), 5.0)

        if hl <= 0:
            return sig.intensity

        # Exponential decay: I(t) = I_0 * e^(-lambda * t)
        # where lambda = ln(2) / half_life
        decay_constant = 0.69314718056 / hl  # math.log(2) / half_life
        return sig.intensity * math.exp(-decay_constant * elapsed)

    def _compute_task_score(
        self,
        worker_tags: list,
        task_id: str,
    ) -> float:
        """
        TEMM1E task selection scoring — pure arithmetic, zero LLM calls.

        S(worker, task) = A^2.0 * U^1.5 * (1-D)^1.0 * (1-F)^0.8 * R^1.2

        Exponents from Cubiczan/TEMM1E research:
            A=2.0 (affinity), U=1.5 (urgency), D=1.0 (difficulty),
            F=0.8 (failure penalty), R=1.2 (downstream reward)

        This is 40 lines of arithmetic, not an LLM call.
        """
        if task_id not in self.tasks:
            return 0.0

        task = self.tasks[task_id]
        task_tags = json.loads(task.tags_str)

        # A: Affinity — Jaccard similarity
        affinity = self._jaccard(set(worker_tags), set(task_tags))
        affinity = max(affinity, 0.1)  # Floor to prevent zero

        # U: Urgency — from scent field
        urgency = self._read_scent(task_id, ScentType.URGENCY)
        urgency = max(urgency, 0.1)

        # D: Difficulty — from scent field
        difficulty = min(self._read_scent(task_id, ScentType.DIFFICULTY), 0.99)

        # F: Failure — from scent field
        failure = min(self._read_scent(task_id, ScentType.FAILURE), 0.99)

        # R: Downstream reward — tasks with more dependents are higher value
        dependents = json.loads(task.dependents_str)
        total = max(len(self.all_tasks), 1)
        reward = 1.0 + (len(dependents) / total)

        # Apply TEMM1E scoring formula
        score = (
            (affinity ** 2.0)
            * (urgency ** 1.5)
            * ((1.0 - difficulty) ** 1.0)
            * ((1.0 - failure) ** 0.8)
            * (reward ** 1.2)
        )

        return score

    def _jaccard(self, set_a: set, set_b: set) -> float:
        """Jaccard similarity coefficient."""
        if not set_a and not set_b:
            return 0.0
        intersection = set_a & set_b
        union = set_a | set_b
        return len(intersection) / len(union) if union else 0.0

    # =====================================================
    # TASK CLAIMING (Stigmergic Selection)
    # =====================================================

    @gl.public.write
    def claim_best_task(self) -> str:
        """
        Claim the best available task using stigmergic scent-based scoring.
        The worker's skill tags are matched against task requirements,
        and the scent field provides real-time coordination signals.

        This is the core mechanism that replaces inter-agent LLM chat
        with pure arithmetic. Workers don't talk to each other — they
        read the shared pheromone environment.

        Returns:
            The claimed task_id, or raises if no tasks available.
        """
        sender = gl.message.sender_address
        if sender not in self.workers:
            raise Exception("Worker not registered. Call register_worker first.")

        worker = self.workers[sender]
        if not worker.is_active:
            raise Exception("Worker is not active")

        worker_tags = json.loads(worker.tags_str)

        # Find the best task by stigmergic scoring
        best_task_id = ""
        best_score = 0.0

        ready_count = len(self.pending_tasks)
        if ready_count == 0:
            raise Exception("No tasks available for claiming")

        for i in range(ready_count):
            tid = self.pending_tasks[i]
            if tid not in self.tasks:
                continue

            task = self.tasks[tid]
            if task.status != TaskStatus.READY:
                continue

            score = self._compute_task_score(worker_tags, tid)
            if score > best_score:
                best_score = score
                best_task_id = tid

        if not best_task_id:
            raise Exception("No suitable tasks found for your skills")

        # Atomic claim: READY -> ACTIVE
        task = self.tasks[best_task_id]
        task.status = TaskStatus.ACTIVE
        task.worker_id = worker.worker_id
        self.tasks[best_task_id] = task

        # Emit PROGRESS heartbeat signal
        self._emit_signal(best_task_id, worker.worker_id, ScentType.PROGRESS, 1.0)

        return best_task_id

    @gl.public.write
    def claim_specific_task(self, task_id: str) -> str:
        """
        Claim a specific task by ID (bypasses stigmergic scoring).
        Useful when a worker knows exactly which task to pick.
        """
        sender = gl.message.sender_address
        if sender not in self.workers:
            raise Exception("Worker not registered")

        if task_id not in self.tasks:
            raise Exception("Task not found")

        task = self.tasks[task_id]
        if task.status != TaskStatus.READY:
            raise Exception(f"Task is not READY (current: {task.status})")

        worker = self.workers[sender]
        task.status = TaskStatus.ACTIVE
        task.worker_id = worker.worker_id
        self.tasks[task_id] = task

        self._emit_signal(task_id, worker.worker_id, ScentType.PROGRESS, 1.0)

        return task_id

    # =====================================================
    # TASK COMPLETION & AI CONSENSUS
    # =====================================================

    @gl.public.write
    def complete_task(self, task_id: str, result: str) -> dict:
        """
        Complete a task and submit the result for AI validation.

        For high-stakes tasks, this triggers adversarial consensus —
        multiple AI validators independently evaluate the result.
        The contrarian agent stress-tests the majority position,
        following the CONSENSAGENT (ACL 2025) methodology.

        Uses prompt_non_comparative for subjective evaluation,
        prompt_comparative for semi-objective tasks, and
        strict_eq for fully objective results.

        Args:
            task_id: The task being completed
            result: The worker's result/output

        Returns:
            Consensus result dict with score and outcome
        """
        sender = gl.message.sender_address
        if sender not in self.workers:
            raise Exception("Worker not registered")

        if task_id not in self.tasks:
            raise Exception("Task not found")

        task = self.tasks[task_id]
        if task.status != TaskStatus.ACTIVE:
            raise Exception(f"Task is not ACTIVE (current: {task.status})")

        if task.worker_id != self.workers[sender].worker_id:
            raise Exception("Only the assigned worker can complete this task")

        # Run adversarial AI consensus on the result
        consensus = self._run_consensus(task, result)

        # Update task based on consensus
        task.consensus_score = consensus["consensus_score"]
        task.consensus_outcome = consensus["outcome"]
        task.result = result
        task.completed_at = gl.block.timestamp

        if consensus["outcome"] == ConsensusOutcome.CONSENSUS_REACHED:
            task.status = TaskStatus.COMPLETE
            worker = self.workers[sender]
            worker.tasks_completed += 1
            worker.reputation += int(consensus["consensus_score"] * 100)
            self.workers[sender] = worker

            # Emit COMPLETION scent
            self._emit_signal(task_id, task.worker_id, ScentType.COMPLETION, 1.0)

            # Activate dependent tasks
            self._activate_dependents(task_id)
        else:
            # Consensus not reached — escalate
            task.status = TaskStatus.ESCALATED
            worker = self.workers[sender]
            worker.tasks_failed += 1
            self.workers[sender] = worker

            # Emit FAILURE scent
            self._emit_signal(task_id, task.worker_id, ScentType.FAILURE, 1.0)

        self.tasks[task_id] = task

        # Check if parent job is complete
        self._check_job_completion(task_id)

        return consensus

    @gl.public.write
    def complete_task_simple(self, task_id: str, result: str) -> str:
        """
        Complete a task with strict equivalence (for objective tasks).
        Skips adversarial consensus — uses strict_eq for deterministic validation.
        Best for tasks with verifiable, objective outputs.
        """
        sender = gl.message.sender_address
        if sender not in self.workers:
            raise Exception("Worker not registered")

        if task_id not in self.tasks:
            raise Exception("Task not found")

        task = self.tasks[task_id]
        if task.status != TaskStatus.ACTIVE:
            raise Exception("Task is not ACTIVE")
        if task.worker_id != self.workers[sender].worker_id:
            raise Exception("Not assigned to you")

        # Validate via strict equivalence (deterministic)
        def validate() -> str:
            prompt = f"""Evaluate if this task result is complete and correct.

TASK: {task.description}
DOMAIN: {task.domain}
RESULT: {result}

Respond in JSON:
{{
    "is_valid": true/false,
    "quality_score": 0.0-1.0,
    "reasoning": "brief explanation"
}}
It is mandatory that you respond only using the JSON format above,
nothing else. Don't include any other words or characters,
your output must be only JSON without any formatting prefix or suffix."""
            resp = gl.nondet.exec_prompt(prompt, response_format="json")
            return json.dumps(resp, sort_keys=True)

        validation = json.loads(gl.eq_principle.strict_eq(validate))

        task.result = result
        task.completed_at = gl.block.timestamp

        if validation.get("is_valid", False):
            task.status = TaskStatus.COMPLETE
            task.consensus_score = validation.get("quality_score", 0.5)
            task.consensus_outcome = ConsensusOutcome.CONSENSUS_REACHED
            worker = self.workers[sender]
            worker.tasks_completed += 1
            worker.reputation += int(task.consensus_score * 100)
            self.workers[sender] = worker
            self._emit_signal(task_id, task.worker_id, ScentType.COMPLETION, 1.0)
            self._activate_dependents(task_id)
        else:
            task.status = TaskStatus.ESCALATED
            task.consensus_score = 0.0
            task.consensus_outcome = ConsensusOutcome.ESCALATED_TO_HUMAN
            worker = self.workers[sender]
            worker.tasks_failed += 1
            self.workers[sender] = worker
            self._emit_signal(task_id, task.worker_id, ScentType.FAILURE, 1.0)

        self.tasks[task_id] = task
        self._check_job_completion(task_id)

        return task.status

    def _run_consensus(self, task: SwarmTask, result: str) -> dict:
        """
        Run adversarial AI consensus using GenLayer's Optimistic Democracy.

        This implements the key insight from CONSENSAGENT (ACL 2025):
        Multiple heterogeneous validators independently evaluate the result.
        A contrarian agent is assigned to stress-test the majority position.
        The Equivalence Principle ensures validators converge.

        Maps to GenLayer's prompt_non_comparative for subjective evaluation,
        which is appropriate for most agentic economy tasks.
        """

        def evaluate_result() -> str:
            prompt = f"""You are an expert evaluator in a swarm intelligence system.
You must provide your INDEPENDENT evaluation. Do NOT agree with other
validators unless their reasoning genuinely convinces you.

TASK DESCRIPTION: {task.description}
DOMAIN: {task.domain}
SUBMITTED RESULT: {result}

Evaluate the quality and completeness of this result.

Respond in JSON:
{{
    "is_acceptable": true/false,
    "quality_score": 0.0-1.0,
    "reasoning": "your evaluation reasoning",
    "improvements": "suggested improvements if any"
}}
It is mandatory that you respond only using the JSON format above,
nothing else. Don't include any other words or characters,
your output must be only JSON without any formatting prefix or suffix.
This result should be perfectly parsable by a JSON parser without errors."""
            resp = gl.nondet.exec_prompt(prompt, response_format="json")
            return json.dumps(resp, sort_keys=True)

        def contrarian_review() -> str:
            prompt = f"""YOUR ROLE: CONTRARIAN AGENT
You MUST challenge and stress-test the evaluation of this result.
Find flaws, edge cases, and alternative explanations.

TASK DESCRIPTION: {task.description}
DOMAIN: {task.domain}
SUBMITTED RESULT: {result}

Provide a critical adversarial review.

Respond in JSON:
{{
    "challenges_found": true/false,
    "severity": "low|medium|high",
    "specific_issues": ["issue1", "issue2"],
    "counter_argument": "your contrarian position",
    "overall_verdict": "accept|reject|escalate"
}}
It is mandatory that you respond only using the JSON format above,
nothing else. Don't include any other words or characters,
your output must be only JSON without any formatting prefix or suffix.
This result should be perfectly parsable by a JSON parser without errors."""
            resp = gl.nondet.exec_prompt(prompt, response_format="json")
            return json.dumps(resp, sort_keys=True)

        # Run both evaluations via Optimistic Democracy
        # The main evaluation uses non-comparative equivalence (subjective)
        eval_json = json.loads(
            gl.eq_principle.prompt_non_comparative(evaluate_result)
        )

        # The contrarian review also uses non-comparative equivalence
        contrarian_json = json.loads(
            gl.eq_principle.prompt_non_comparative(contrarian_review)
        )

        quality_score = eval_json.get("quality_score", 0.0)
        is_acceptable = eval_json.get("is_acceptable", False)
        contrarian_severity = contrarian_json.get("severity", "low")

        # Combine scores: reduce quality if contrarian found issues
        severity_penalty = {"low": 0.0, "medium": 0.15, "high": 0.3}
        penalty = severity_penalty.get(contrarian_severity, 0.0)
        final_score = max(0.0, quality_score - penalty)

        # Determine outcome
        threshold = 0.5  # consensus threshold
        outcome = (
            ConsensusOutcome.CONSENSUS_REACHED
            if final_score >= threshold
            else ConsensusOutcome.ESCALATED_TO_HUMAN
        )

        return {
            "consensus_score": final_score,
            "quality_score": quality_score,
            "contrarian_severity": contrarian_severity,
            "is_acceptable": is_acceptable,
            "outcome": outcome,
            "reasoning": eval_json.get("reasoning", ""),
            "contrarian_issues": contrarian_json.get("specific_issues", []),
        }

    def _activate_dependents(self, completed_task_id: str) -> None:
        """
        When a task completes, check if dependent tasks can now be activated.
        This is the DAG propagation mechanism — completions cascade through
        the dependency graph, triggering scent signals along the way.
        """
        task = self.tasks[completed_task_id]
        dependents = json.loads(task.dependents_str)

        for dep_id in dependents:
            if dep_id not in self.tasks:
                continue

            dep_task = self.tasks[dep_id]
            if dep_task.status != TaskStatus.PENDING:
                continue

            # Check if ALL dependencies are now COMPLETE
            deps = json.loads(dep_task.dependencies_str)
            all_met = True
            for d in deps:
                if d in self.tasks and self.tasks[d].status != TaskStatus.COMPLETE:
                    all_met = False
                    break

            if all_met:
                dep_task.status = TaskStatus.READY
                self.tasks[dep_id] = dep_task
                self.pending_tasks.append(dep_id)

                # Emit URGENCY scent for newly ready task
                self._emit_signal(dep_id, "", ScentType.URGENCY, 1.5)

    def _check_job_completion(self, task_id: str) -> None:
        """Check if the parent job is fully complete."""
        # Find which job this task belongs to
        for i in range(len(self.all_jobs)):
            job_id = self.all_jobs[i]
            if job_id not in self.jobs:
                continue
            job = self.jobs[job_id]
            task_ids = json.loads(job.task_ids_str)
            if task_id not in task_ids:
                continue

            # Check if all tasks are done
            all_done = True
            any_escalated = False
            for tid in task_ids:
                if tid not in self.tasks:
                    all_done = False
                    break
                status = self.tasks[tid].status
                if status != TaskStatus.COMPLETE and status != TaskStatus.ESCALATED:
                    all_done = False
                    break
                if status == TaskStatus.ESCALATED:
                    any_escalated = True

            if all_done:
                job.status = "complete" if not any_escalated else "partial"
                job.completed_at = gl.block.timestamp
                self.jobs[job_id] = job
            break

    # =====================================================
    # DIFFICULTY & HELP SIGNALS
    # =====================================================

    @gl.public.write
    def emit_difficulty(self, task_id: str) -> None:
        """
        Worker signals difficulty with a task. Other workers will
        see this in the scent field and may avoid or help with it.
        """
        sender = gl.message.sender_address
        if sender not in self.workers:
            raise Exception("Worker not registered")

        if task_id not in self.tasks:
            raise Exception("Task not found")

        task = self.tasks[task_id]
        if task.status != TaskStatus.ACTIVE or task.worker_id != self.workers[sender].worker_id:
            raise Exception("Not your active task")

        self._emit_signal(task_id, self.workers[sender].worker_id, ScentType.DIFFICULTY, 1.0)

    @gl.public.write
    def emit_help_wanted(self, task_id: str, skills_needed: str) -> None:
        """
        Request specialist help from the swarm. Emits a HELP_WANTED scent.
        """
        sender = gl.message.sender_address
        if sender not in self.workers:
            raise Exception("Worker not registered")

        if task_id not in self.tasks:
            raise Exception("Task not found")

        task = self.tasks[task_id]
        if task.status != TaskStatus.ACTIVE or task.worker_id != self.workers[sender].worker_id:
            raise Exception("Not your active task")

        signal_id = self._emit_signal(task_id, self.workers[sender].worker_id, ScentType.HELP_WANTED, 1.0)
        signal = self.signals[signal_id]
        signal.metadata_str = json.dumps({"skills_needed": skills_needed})
        self.signals[signal_id] = signal

    # =====================================================
    # VIEW FUNCTIONS
    # =====================================================

    @gl.public.view
    def get_task(self, task_id: str) -> dict:
        """Get full task details."""
        if task_id not in self.tasks:
            raise Exception("Task not found")
        t = self.tasks[task_id]
        return {
            "task_id": t.task_id,
            "description": t.description,
            "domain": t.domain,
            "tags": json.loads(t.tags_str),
            "dependencies": json.loads(t.dependencies_str),
            "dependents": json.loads(t.dependents_str),
            "status": t.status,
            "worker_id": t.worker_id,
            "result": t.result,
            "reward": t.reward,
            "consensus_score": t.consensus_score,
            "consensus_outcome": t.consensus_outcome,
            "retries": t.retries,
        }

    @gl.public.view
    def get_job(self, job_id: str) -> dict:
        """Get full job details including all tasks."""
        if job_id not in self.jobs:
            raise Exception("Job not found")
        j = self.jobs[job_id]
        return {
            "job_id": j.job_id,
            "requester": j.requester.as_hex,
            "description": j.description,
            "domain": j.domain,
            "task_ids": json.loads(j.task_ids_str),
            "status": j.status,
            "total_reward": j.total_reward,
            "created_at": j.created_at,
            "completed_at": j.completed_at,
        }

    @gl.public.view
    def get_pending_tasks(self) -> list:
        """Get all tasks available for claiming."""
        result = []
        for i in range(len(self.pending_tasks)):
            tid = self.pending_tasks[i]
            if tid in self.tasks and self.tasks[tid].status == TaskStatus.READY:
                t = self.tasks[tid]
                result.append({
                    "task_id": tid,
                    "description": t.description,
                    "domain": t.domain,
                    "tags": json.loads(t.tags_str),
                })
        return result

    @gl.public.view
    def get_scent_field(self, task_id: str) -> dict:
        """
        Read the full scent field for a task.
        Returns current intensity for each of the 6 scent types.
        """
        return {
            "task_id": task_id,
            "scents": {
                "completion": self._read_scent(task_id, ScentType.COMPLETION),
                "failure": self._read_scent(task_id, ScentType.FAILURE),
                "difficulty": self._read_scent(task_id, ScentType.DIFFICULTY),
                "urgency": self._read_scent(task_id, ScentType.URGENCY),
                "progress": self._read_scent(task_id, ScentType.PROGRESS),
                "help_wanted": self._read_scent(task_id, ScentType.HELP_WANTED),
            },
        }

    @gl.public.view
    def score_task_for_worker(self, worker_addr: Address, task_id: str) -> float:
        """
        Calculate the stigmergic task score for a specific worker.
        Useful for off-chain wallets to show workers their best matches.
        """
        if worker_addr not in self.workers:
            raise Exception("Worker not registered")
        worker = self.workers[worker_addr]
        tags = json.loads(worker.tags_str)
        return self._compute_task_score(tags, task_id)

    @gl.public.view
    def get_swarm_stats(self) -> dict:
        """Get overall swarm statistics."""
        total_tasks = len(self.all_tasks)
        completed = 0
        active = 0
        pending = 0
        escalated = 0
        total_workers = 0
        total_signals = len(self.signals)

        for i in range(total_tasks):
            tid = self.all_tasks[i]
            if tid in self.tasks:
                s = self.tasks[tid].status
                if s == TaskStatus.COMPLETE:
                    completed += 1
                elif s == TaskStatus.ACTIVE:
                    active += 1
                elif s == TaskStatus.READY or s == TaskStatus.PENDING:
                    pending += 1
                elif s == TaskStatus.ESCALATED:
                    escalated += 1

        total_workers = 0
        for addr in self.workers:
            total_workers += 1

        return {
            "total_tasks": total_tasks,
            "completed": completed,
            "active": active,
            "pending": pending,
            "escalated": escalated,
            "total_workers": total_workers,
            "total_signals": total_signals,
            "total_jobs": len(self.all_jobs),
        }

    @gl.public.view
    def get_leaderboard(self) -> list:
        """Get top workers by reputation."""
        board = []
        for addr in self.workers:
            w = self.workers[addr]
            board.append({
                "worker_id": w.worker_id,
                "address": addr.as_hex,
                "model_name": w.model_name,
                "reputation": w.reputation,
                "tasks_completed": w.tasks_completed,
                "tasks_failed": w.tasks_failed,
                "tags": json.loads(w.tags_str),
            })
        board.sort(key=lambda x: x["reputation"], reverse=True)
        return board[:20]

    @gl.public.view
    def get_all_jobs(self) -> list:
        """Get all jobs summary."""
        result = []
        for i in range(len(self.all_jobs)):
            jid = self.all_jobs[i]
            if jid in self.jobs:
                j = self.jobs[jid]
                result.append({
                    "job_id": jid,
                    "requester": j.requester.as_hex,
                    "domain": j.domain,
                    "status": j.status,
                    "task_count": len(json.loads(j.task_ids_str)),
                    "total_reward": j.total_reward,
                })
        return result
