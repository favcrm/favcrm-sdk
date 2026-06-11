---
name: favcrm-graphify
description: >-
  Query and update the FavCRM stack knowledge graph from the SDK sub-repo.
  Use before cross-app contract questions (API types, member portal features,
  modulesToFeatures). Works in Claude, Cursor, and Codex.
---

# FavCRM Graphify — v2/favcrm-sdk

You are in **`v2/favcrm-sdk`**. Attach skill **`favcrm-graphify`** or follow this file.

## Step 0 — orient

```bash
python3 .cursor/skills/favcrm-graphify/fg.py here
python3 .cursor/skills/favcrm-graphify/fg.py check
```

Default scope for this app: **`sdk`**. Cross-app flows: **`architecture`**.

## Quick commands

```bash
python3 .cursor/skills/favcrm-graphify/fg.py query "modulesToFeatures FeatureKey"
python3 .cursor/skills/favcrm-graphify/fg.py build architecture architecture
python3 .cursor/skills/favcrm-graphify/fg.py validate
```

## When to use

| Question type | Scope |
|---------------|-------|
| SDK exports / types only | `sdk` |
| Who consumes this type/API | `architecture` |

## Rules

- SDK is pure TS — graph links SDK ↔ API ↔ portals via docs and imports
- After SDK contract changes: rebuild architecture layer if CLAUDE/README updated

## Full skill

`../../.cursor/skills/favcrm-graphify/SKILL.md`
