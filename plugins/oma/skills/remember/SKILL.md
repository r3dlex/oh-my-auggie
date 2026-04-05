---
name: remember
description: Memory triage workflow — capture, organize, and retrieve persistent context
argument-hint: "<thing to remember or recall>"
trigger: /oma:remember
level: 2
---

<Purpose>
Memory management for session-persistent context that survives context compaction. Triage entries into Priority (permanent), Working (7-day auto-prune), or Manual (never pruned) sections. Also search and retrieve stored memories.
</Purpose>

<Use_When>
- User says "remember", "memorize", "don't forget", "save this"
- User wants to recall something stored from a previous session
- Context about a decision or convention needs to persist across sessions
</Use_When>

<Do_Not_Use_When>
- User wants to store temporary notes during a session (use `note` or `writer-memory` instead)
- The information is already in the codebase or git history (just look it up)
- The memory is about a specific file or code section (that lives in the code)
</Do_Not_Use_When>

<Why_This_Exists>
Context gets compacted. Memories prevent important decisions, conventions, and user preferences from being lost when context windows reset.
</Why_This_Exists>

<Execution_Policy>
- Prompt for memory type: Priority (permanent), Working (7-day prune), Manual (never prune)
- Use clear, specific titles so future-you can find the memory
- When retrieving, search all sections and surface relevant matches
- Do NOT store secrets, credentials, or sensitive data in memories
</Execution_Policy>

<Steps>

## Save a Memory

1. **Parse the content** from arguments
2. **Suggest a section** based on persistence needs:
   - **Priority**: permanently remembered (user preferences, critical conventions)
   - **Working**: auto-pruned after 7 days (session learnings, in-progress context)
   - **Manual**: never auto-pruned (project-specific rules, architecture decisions)
3. **Suggest a title** (brief, searchable)
4. **Confirm with user** via `AskUserQuestion`:
   - "Save to Priority (permanent)"
   - "Save to Working (7-day auto-prune)"
   - "Save to Manual (never pruned)"
   - "Cancel"
5. **Write** the memory entry to the notepad

## Recall a Memory

1. **Parse the search query** from arguments
2. **Search all sections** via `notepad_read(section="all")`
3. **Surface relevant matches** with timestamps
4. **Present results** ranked by relevance

<Tool_Usage>
- Use `notepad_write_priority`, `notepad_write_working`, `notepad_write_manual` to save
- Use `notepad_read(section="all")` to search memories
- Use `notepad_stats` to check memory size and entry count
- Use `notepad_prune` to manually prune old entries
</Tool_Usage>

<Examples>
<Good>
User: "remember that this project uses Python 3.11 minimum"
→ Save to Priority with title: "Python minimum version: 3.11"
</Good>

<Bad>
User: "remember all the things"
→ Too vague — ask for specifics on what to remember
</Bad>
</Examples>

<Final_Checklist>
- [ ] Memory has a clear, searchable title
- [ ] Memory is placed in the appropriate section
- [ ] Section choice is confirmed with user
- [ ] Recall searches all sections and surfaces relevant matches
</Final_Checklist>
