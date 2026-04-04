---
name: trace
description: Evidence-driven tracing and execution tracking. Use for "trace this", "execution trace", and "track progress".
trigger: /oma:trace
---

## Skill: trace

Track and document execution flow with evidence.

## When to Use

- Complex execution paths
- Debugging multi-step processes
- Understanding code flow
- Performance analysis
- Compliance auditing

## Trace Elements

### Entry Point
Where execution begins.
- File and line
- Function name
- Arguments
- Timestamp

### Execution Steps
Individual operations.
- Operation performed
- Input/output
- Duration
- Success/failure

### Handoffs
Transfers between components.
- From component
- To component
- Data passed
- Context preserved

### Decisions
Branching points.
- Condition evaluated
- Options considered
- Path chosen
- Rationale

### Exit Point
Where execution ends.
- Final result
- Duration
- Side effects

## Trace Levels

### DEBUG
Full detail, all operations.
- Every function call
- All variable values
- Complete timing

### INFO
Key operations only.
- Major steps
- Handoffs
- Decisions

### WARN
Warnings and errors.
- Problem detection
- Recovery attempts
- Failures

### ERROR
Failures only.
- Exception details
- Stack traces
- Impact assessment

## Trace Storage

### In-Memory
Fast, temporary.
- Current session only
- Limited history
- Quick access

### File-Based
Persistent.
- `traces/` directory
- JSON format
- Searchable

### External
For distributed systems.
- Jaeger
- Zipkin
- Custom collector

## Commands

### Start Trace
```
/oma:trace start {name}
```

### Add Event
```
/oma:trace event {type} {description}
```

### Add Span
```
/oma:trace span {name} {duration}
```

### End Trace
```
/oma:trace end
```

### List Traces
```
/oma:trace list
```

### View Trace
```
/oma:trace view {trace-id}
```

## Output Format

```
## Trace: {name}

### Summary
**Started:** {timestamp}
**Duration:** {duration}
**Status:** {running|complete|error}

### Timeline
```
{time}  Entry: {component}::{function}()
{time}  ├── Event: {event}
{time}  ├── Span: {span} ({duration})
{time}  └── Exit: {result}
```

### Spans
| Name | Duration | Start | End |
|------|----------|-------|-----|
| {span} | {dur} | {time} | {time} |

### Events
| Time | Type | Description |
|------|------|-------------|
| {time} | {type} | {desc} |

### Handoffs
| From | To | Data |
|------|----|------|
| {src} | {dst} | {data} |

### Errors
- **{error}** at {location}

### Attachments
- {file/link}
```

## Constraints

- Don't over-trace
- Use appropriate levels
- Secure sensitive data
- Clean old traces
- Make traces queryable
