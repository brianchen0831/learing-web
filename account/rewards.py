"""Tasks and rewards.

Tasks live in .json files in each top-level topic's task folder, such as
<database>/english/task/. Each one has an internal id, a name, the
reward given when it is completed, and a condition checked against the user's results.

Results are stored per topic, as one encrypted file per user:
    <database>/<topic>/results/<account id>.json
for example database/english/quiz/results/<id>.json holds that user's vocabulary tests.
Conditions read these results, so new kinds of tasks only need new condition types.

See account/DESIGN.md for the formats.
"""
import json
import os
import re
import sys
import time

TASK_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
RESULTS_FOLDER = "results"
RESULTS_VERSION = 1
MAX_RUNS = 2000  # oldest runs are dropped after this; finished tasks are kept in the account
MAX_LISTS = 100
QUIZ_TESTS = ("fill-blank", "hangman", "listening")
RESULTS = ("completed", "perfect")


class RewardError(Exception):
    """A problem with a submitted result. The message is an error code."""


# ---------------------------------------------------------------- task definitions

def _text(value):
    """A name: plain text, or {"en": ..., "zh": ...}."""
    if isinstance(value, str) and value.strip():
        return value.strip()
    if isinstance(value, dict) and value and all(isinstance(v, str) and v.strip() for v in value.values()):
        return {k: v.strip() for k, v in value.items()}
    return None


def _count(value, minimum=1):
    return value if isinstance(value, int) and not isinstance(value, bool) and value >= minimum else None


def check_task(task, catalog, owner=None):
    """A cleaned task, or (None, reason) for one that cannot be used. A task in a topic's
    task folder must look at that topic or one of its subtopics: a task in english/task/
    may use english/quiz, not math/quiz."""
    if not isinstance(task, dict):
        return None, "not an object"
    task_id = task.get("id")
    if not isinstance(task_id, str) or not TASK_ID_RE.match(task_id):
        return None, "id must be lowercase letters, numbers and -"
    name = _text(task.get("name"))
    if not name:
        return None, f"{task_id}: needs a name"

    reward = task.get("reward")
    if not isinstance(reward, dict):
        return None, f"{task_id}: needs a reward"
    coins = reward.get("coins", 0)
    items = reward.get("items", [])
    if _count(coins, 0) is None or not isinstance(items, list):
        return None, f"{task_id}: reward coins must be a whole number and items a list"
    for item in items:
        if item not in catalog.parts:
            return None, f"{task_id}: reward item {item!r} is not in the doll catalog"
    if not coins and not items:
        return None, f"{task_id}: the reward is empty"

    cond = task.get("condition")
    if not isinstance(cond, dict) or cond.get("type") != "quiz":
        return None, f"{task_id}: condition type must be \"quiz\""
    topic = cond.get("topic")
    test = cond.get("test", "any")
    result = cond.get("result", "completed")
    count = _count(cond.get("count", 1))
    min_questions = _count(cond.get("min_questions", 1))
    list_id, folder = cond.get("list"), cond.get("folder")
    if not isinstance(topic, str) or not topic.strip("/"):
        return None, f"{task_id}: condition needs a topic"
    topic = topic.strip("/")
    if owner and topic != owner and not topic.startswith(owner + "/"):
        return None, f"{task_id}: a task in {owner}/task must use {owner} or one of its subtopics"
    if test != "any" and test not in QUIZ_TESTS:
        return None, f"{task_id}: test must be any, " + ", ".join(QUIZ_TESTS)
    if result not in RESULTS:
        return None, f"{task_id}: result must be completed or perfect"
    if count is None or min_questions is None:
        return None, f"{task_id}: count and min_questions must be whole numbers from 1"
    if list_id is not None and folder is not None:
        return None, f"{task_id}: use list or folder, not both"
    for value in (list_id, folder):
        if value is not None and (not isinstance(value, str) or not value.strip("/")):
            return None, f"{task_id}: list and folder must be paths"

    return {
        "id": task_id,
        "name": name,
        "description": _text(task.get("description")),
        "reward": {"coins": coins, "items": list(items)},
        "condition": {
            "type": "quiz", "topic": topic, "test": test, "result": result, "count": count,
            "min_questions": min_questions,
            "list": list_id.strip("/") if list_id else None,
            "folder": folder.strip("/") if folder else None,
        },
    }, None


class TaskBook:
    """Tasks from every .json file in each top-level topic's task folder, such as
    <database>/english/task/spelling-bee.json.

    The files are read again whenever one changes, so tasks can be edited without a
    restart. Tasks that cannot be used are skipped and reported on the console."""

    def __init__(self, sources, catalog):
        # sources() -> [(path, top-level topic the file belongs to)]
        self.sources = sources
        self.catalog = catalog
        self.stamp = None
        self.tasks = []

    def all(self):
        found = []
        for path, topic in self.sources():
            try:
                found.append((path, topic, os.path.getmtime(path)))
            except OSError:
                pass
        stamp = tuple(found)
        if stamp != self.stamp:
            self.stamp = stamp
            self.tasks = self._read(found)
        return self.tasks

    def _read(self, files):
        tasks, seen = [], set()
        for path, topic, _ in files:
            try:
                with open(path, encoding="utf-8-sig") as f:
                    data = json.load(f)
            except (OSError, ValueError) as error:
                print(f"rewards: cannot read {path}: {error}", file=sys.stderr)
                continue
            raw = data.get("tasks") if isinstance(data, dict) else None
            if not isinstance(raw, list):
                print(f'rewards: {path} needs a "tasks" list', file=sys.stderr)
                continue
            for item in raw:
                task, problem = check_task(item, self.catalog, topic)
                if task and task["id"] in seen:
                    task, problem = None, f"{task['id']}: id used twice"
                if problem:
                    print(f"rewards: skipped a task in {path}, {problem}", file=sys.stderr)
                    continue
                seen.add(task["id"])
                tasks.append(task)
        return tasks


# ---------------------------------------------------------------- results and conditions

def run_is_completed(run):
    return run["answered"] == run["total"]


def run_is_perfect(run):
    return run_is_completed(run) and run["correct"] == run["total"]


def run_matches(run, cond):
    """Whether one test run counts towards a quiz condition."""
    if run["topic"] != cond["topic"]:
        return False
    if cond["test"] != "any" and run["test"] != cond["test"]:
        return False
    if run["total"] < cond["min_questions"]:
        return False
    if cond["list"] and any(item != cond["list"] for item in run["lists"]):
        return False
    if cond["folder"] and any(not item.startswith(cond["folder"] + "/") for item in run["lists"]):
        return False
    return run_is_perfect(run) if cond["result"] == "perfect" else run_is_completed(run)


def progress(task, runs):
    """(runs that count, runs needed)"""
    cond = task["condition"]
    return sum(1 for run in runs if run_matches(run, cond)), cond["count"]


def clean_run(data, quiz_source, words_in):
    """Check a submitted quiz result. `quiz_source(topic)` gives the subtopic holding the
    topic's word lists, or None; `words_in(source, lists)` gives how many different words
    those lists hold, or None if a list is missing."""
    if not isinstance(data, dict):
        raise RewardError("invalid_result")
    topic, test, lists = data.get("topic"), data.get("test"), data.get("lists")
    source = quiz_source(topic) if isinstance(topic, str) else None
    if not source or test not in QUIZ_TESTS:
        raise RewardError("invalid_result")
    if not isinstance(lists, list) or not 1 <= len(lists) <= MAX_LISTS or not all(isinstance(x, str) for x in lists):
        raise RewardError("invalid_result")
    lists = sorted(set(lists))
    available = words_in(source, lists)
    total, answered, correct = (_count(data.get(k), 0) for k in ("total", "answered", "correct"))
    if available is None or None in (total, answered, correct):
        raise RewardError("invalid_result")
    if not 1 <= total <= available or not correct <= answered <= total:
        raise RewardError("invalid_result")
    return {"at": int(time.time()), "topic": topic, "test": test, "lists": lists,
            "total": total, "answered": answered, "correct": correct}
