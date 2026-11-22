"""Assign messages to the dev or test split.

- Existing assignments in split.json never change, so the test set stays sealed.
- New messages are assigned with a fixed seed, about 1 in 3 to dev,
  stratified by class and type.
- Messages from the same chat or thread (same `thread` field) share a split,
  so nothing leaks from dev into test.
- Non-verbatim messages are left out of both splits.

Run: python3 data/make_split.py
"""

import json
import random
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).parent
rows = [json.loads(l) for l in (HERE / "messages.jsonl").read_text().splitlines() if l.strip()]
split_path = HERE / "split.json"
split = json.loads(split_path.read_text()) if split_path.exists() else {"dev": [], "test": []}
assigned = {i: s for s, ids in split.items() for i in ids}

# Known threads (same conversation)
THREADS = {"S001": "T-wa-ban", "S002": "T-wa-ban", "S012": "T-sambal", "S028": "T-sambal"}

groups = defaultdict(list)
# Synthetic (written) test cases are reported separately and never used for tuning.
split["synth"] = sorted(r["id"] for r in rows if r.get("synthetic"))
for r in rows:
    if r.get("verbatim") is False or r.get("synthetic"):
        continue
    key = r.get("thread") or THREADS.get(r["id"]) or r["id"]
    groups[key].append(r)

rng = random.Random(2026_11_21)
by_stratum = defaultdict(list)
for key, members in sorted(groups.items()):
    already = {assigned[m["id"]] for m in members if m["id"] in assigned}
    if already:
        target = already.pop()
        for m in members:
            if m["id"] not in assigned:
                split[target].append(m["id"])
                assigned[m["id"]] = target
        continue
    first = members[0]
    by_stratum[(first["class"], first.get("type", ""))].append(members)

for stratum, gs in sorted(by_stratum.items()):
    rng.shuffle(gs)
    for i, members in enumerate(gs):
        # every third group goes to dev, starting with the second, so a
        # stratum with a single message lands in test
        target = "dev" if i % 3 == 1 else "test"
        for m in members:
            split[target].append(m["id"])

split = {k: sorted(v) for k, v in split.items()}
split_path.write_text(json.dumps(split, indent=2) + "\n")
counts = {k: len(v) for k, v in split.items()}
print(counts)
for k, ids in split.items():
    cls = defaultdict(int)
    for r in rows:
        if r["id"] in ids:
            cls[r["class"]] += 1
    print(k, dict(cls))
