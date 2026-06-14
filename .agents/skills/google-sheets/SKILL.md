---
name: google-sheets
description: >
  Expert guide for working with Google Sheets. Use this skill whenever the user
  asks to create, read, write, update, or manage Google Sheets spreadsheets or tabs.
  Covers the full mental model, all available tools, and step-by-step workflows.
---

# Google Sheets Skill

## Core Mental Model — CRITICAL

Google Sheets has two distinct levels. **Always understand which level you're working at.**

```
Spreadsheet (the FILE)
├── Tab 1: "Sheet1"        ← a "sheet" or "tab"
├── Tab 2: "Q1 Data"
└── Tab 3: "Christian Hernandez"
```

| Term | What It Is | Example |
|---|---|---|
| **Spreadsheet** | The file containing everything | "Wholesale Properties" |
| **Tab / Sheet** | A page inside a spreadsheet | "Christian Hernandez", "Sheet1" |

> [!IMPORTANT]
> When the user says "add a sheet", "add a tab", or "add a page" — they mean **add a tab to an existing spreadsheet**. DO NOT create a new spreadsheet file. Use `add_sheet_tab`.

---

## Decision Tree — Which Tool to Use

```
User wants to...
│
├── "Add a sheet/tab to [existing spreadsheet]"
│     → add_sheet_tab (NOT create_spreadsheet)
│
├── "Create a new spreadsheet"
│     → create_spreadsheet
│
├── "Read data from [sheet/tab]"
│     → read_sheet (range = "TabName!A1:Z")
│
├── "Write/update data in [sheet/tab]"
│     → write_sheet (range = "TabName!A1")
│
├── "Add rows to [sheet/tab] without overwriting"
│     → append_to_sheet
│
├── "Rename a tab"
│     → rename_sheet_tab
│
├── "Delete a tab"
│     → delete_sheet_tab
│
├── "Clear a tab's data (keep the tab)"
│     → clear_sheet_tab
│
├── "Copy a tab"
│     → duplicate_sheet_tab
│
└── "What tabs/sheets does this spreadsheet have?"
      → get_spreadsheet_info
```

---

## Available Tools

### `list_spreadsheets`
List recent Google Sheets files in the user's Drive.
```
max_results: number (optional, default 10)
```

### `get_spreadsheet_info`  ⬅ **Use this FIRST when working on an existing sheet**
Returns the spreadsheet title, all tab names, tab IDs, and row/column counts.
```
spreadsheet_id: string (ID or full URL)
```
**Use this before adding tabs, writing data, or reading** to know what tabs already exist.

### `read_sheet`
Read data from a tab. Always include the tab name in the range.
```
spreadsheet_id: string
range: string  — e.g. "Sheet1" (all data), "Q1!A1:D20" (specific range)
```

### `write_sheet`
Overwrite a specific range in a tab. **Warning: this replaces existing data in the range.**
```
spreadsheet_id: string
range: string  — MUST include tab name: "Sheet1!A1" or "TabName!B2:E10"
values: JSON string  — e.g. '[["Name","Email"],["John","john@example.com"]]'
```

### `append_to_sheet`
Add rows AFTER existing data — does not overwrite.
```
spreadsheet_id: string
range: string  — tab name or range: "Sheet1" or "Sheet1!A:Z"
values: JSON string  — rows to add
```

### `add_sheet_tab`  ⬅ **Use to add a new tab to an existing spreadsheet**
Adds a new empty tab. The tab will be blank — use `write_sheet` to populate it.
```
spreadsheet_id: string (the existing spreadsheet to add the tab to)
sheet_title: string   (name for the new tab, e.g. "Christian Hernandez")
index: number         (optional: 0-based position. Omit to add at the end)
```

### `delete_sheet_tab`
Permanently removes a tab and all its data.
```
spreadsheet_id: string
sheet_title: string  (exact tab name)
```

### `rename_sheet_tab`
Renames an existing tab. Data is preserved.
```
spreadsheet_id: string
current_title: string
new_title: string
```

### `clear_sheet_tab`
Clears all cell values from a tab, but keeps the tab itself.
```
spreadsheet_id: string
sheet_title: string
```

### `duplicate_sheet_tab`
Copies a tab (including all data and formatting) to a new tab in the same spreadsheet.
```
spreadsheet_id: string
source_title: string   (tab to copy)
new_title: string      (name for the copy)
insert_index: number   (optional: where to insert. Omit for end)
```

### `create_spreadsheet`
Creates a brand new spreadsheet file.  
**Only use when explicitly asked to create a new spreadsheet.**
```
title: string
sheet_names: string  (optional: comma-separated tab names, e.g. "Sheet1,Sheet2")
```

---

## A1 Notation — Range Format

Always format ranges as: `TabName!CellRef`

| Example | Meaning |
|---|---|
| `Sheet1` | All data in Sheet1 |
| `Sheet1!A1` | Cell A1 in Sheet1 |
| `Sheet1!A1:D10` | Rows 1–10, Columns A–D in Sheet1 |
| `Q1 Data!A:Z` | All columns in "Q1 Data" tab |
| `Christian Hernandez!A1:F50` | Range in tab named "Christian Hernandez" |

> [!TIP]
> If the tab name has spaces, include it exactly as-is in the range string. The API handles it.

---

## Typical Workflows

### Add a new tab and populate it with data

1. `get_spreadsheet_info` → confirm spreadsheet exists, see current tabs
2. `add_sheet_tab` → create the new tab
3. `write_sheet` → write headers and data to `"NewTabName!A1"`

### Update existing data in a tab

1. `get_spreadsheet_info` → verify tab exists and get its name
2. `read_sheet` → optionally read existing data to understand structure
3. `write_sheet` → write to the specific range (e.g. `"Sheet1!A1"`)

### Append new rows without overwriting

1. `append_to_sheet` → pass the tab name as range (e.g. `"Sheet1"`)
2. The API automatically finds the first empty row after existing data

### Reorganize tabs

- **Rename**: `rename_sheet_tab`
- **Delete**: `delete_sheet_tab`
- **Copy/template**: `duplicate_sheet_tab`

---

## Common Mistakes to Avoid

| ❌ Wrong | ✅ Correct |
|---|---|
| Creating a new spreadsheet when asked to "add a sheet" | Use `add_sheet_tab` on the existing spreadsheet |
| Writing to range `"A1"` without tab name | Always use `"Sheet1!A1"` format |
| Overwriting data with `write_sheet` when user wants to append | Use `append_to_sheet` instead |
| Guessing tab names | Use `get_spreadsheet_info` to see actual tab names first |
| Passing values as a plain string | Pass values as valid JSON: `'[["col1","col2"],["val1","val2"]]'` |

---

## Reading Spreadsheet IDs from URLs

The user may share a full Google Sheets URL like:
```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit
```

Extract the ID between `/d/` and the next `/`:
```
1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
```

All tools accept both the full URL and the extracted ID — just pass what the user provides.
