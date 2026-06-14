---
name: google-sheets
description: >
  Expert guide for working with Google Sheets. Use this skill whenever the user
  asks to create, read, write, update, or manage Google Sheets spreadsheets or tabs.
  Covers the full mental model, all available tools, and step-by-step workflows.
---

# Google Sheets Skill

## 1. Mental Model — How the API Works

Google Sheets has TWO separate APIs you must understand:

### Values API (for reading/writing cell DATA only)
- `read_sheet` — read cell values
- `write_sheet` — write to a range
- `append_to_sheet` — add rows at the bottom

### batchUpdate API (for EVERYTHING ELSE — formatting, structure, metadata)
All formatting and structural changes use batchUpdate. These map to these tools:
- `format_cells` / `format_row` → bold, italic, font, color, alignment
- `freeze_rows` / `freeze_columns` → freeze panes
- `set_column_width` / `set_row_height` → resize dimensions
- `auto_resize_columns` → auto-fit to content
- `merge_cells` → merge/unmerge
- `sort_sheet_range` → sort rows

**CRITICAL: Formatting NEVER goes through the values API. If you want to bold a row, you MUST use format_row or format_cells — NOT write_sheet.**

---

## 2. A1 Notation Reference

| Notation | Meaning |
|---|---|
| `A1` | Single cell: column A, row 1 |
| `A1:Z1` | Row 1, columns A through Z |
| `1:1` | Entire row 1 (all columns) |
| `A:A` | Entire column A |
| `A:C` | Columns A, B, C (all rows) |
| `B2:D10` | Block from B2 to D10 |
| `A2:Z100` | Rows 2-100 (data below a header) |

GridRange (batchUpdate) uses 0-indexed row/column numbers:
- `startRowIndex: 0, endRowIndex: 1` = row 1 only
- `startColumnIndex: 0, endColumnIndex: 3` = columns A, B, C

---

## 3. Required Identifiers

Before doing ANYTHING, you need:
1. **Spreadsheet ID or URL** — the full URL or just the ID portion
2. **Exact tab (sheet) name** — case-insensitive. Default is "Sheet1"

ALWAYS call `get_spreadsheet_info` first if you don't know the exact tab names.
Never guess a tab name — a wrong name causes "Tab not found" errors.

---

## 4. All Available Tools

### Discovery
- `list_spreadsheets` — list user's spreadsheets in Google Drive
- `get_spreadsheet_info` — get title, all tab names, row/col counts. **Call this first.**

### Reading Data
- `read_sheet(spreadsheet_id, tab_name, range?)` — returns 2D array of values

### Writing Data  
- `write_sheet(spreadsheet_id, tab_name, range, values)` — overwrite a range
- `append_to_sheet(spreadsheet_id, tab_name, values)` — add rows at bottom

### Tab Management
- `create_spreadsheet(title, sheet_names?)` — create a new file
- `add_sheet_tab(spreadsheet_id, sheet_title, index?)` — add a tab
- `delete_sheet_tab(spreadsheet_id, sheet_title)` — delete a tab
- `rename_sheet_tab(spreadsheet_id, current_title, new_title)` — rename
- `clear_sheet_tab(spreadsheet_id, sheet_title)` — clear all data
- `duplicate_sheet_tab(spreadsheet_id, source_title, new_title)` — copy a tab

### Formatting Tools (batchUpdate)
- `format_cells(spreadsheet_id, tab_name, range, bold?, italic?, underline?, font_size?, font_family?, foreground_color?, background_color?, horizontal_alignment?, vertical_alignment?, wrap_strategy?, number_format_type?, number_format_pattern?)`
- `format_row(spreadsheet_id, tab_name, row_number, bold?, italic?, font_size?, foreground_color?, background_color?, horizontal_alignment?)`
- `freeze_rows(spreadsheet_id, tab_name, row_count)` — row_count=1 freezes header
- `freeze_columns(spreadsheet_id, tab_name, column_count)`
- `set_column_width(spreadsheet_id, tab_name, start_column_index, end_column_index, pixel_size)` — columns 0-indexed, end exclusive
- `set_row_height(spreadsheet_id, tab_name, start_row_index, end_row_index, pixel_size)` — rows 0-indexed
- `auto_resize_columns(spreadsheet_id, tab_name, start_column_index?, end_column_index?)`
- `merge_cells(spreadsheet_id, tab_name, range, merge_type?, unmerge?)`
- `sort_sheet_range(spreadsheet_id, tab_name, range, sort_column, sort_order)`

---

## 5. Named Colors

white, black, red, green, blue, yellow, orange, gray, lightgray,
purple, pink, cyan, navy, darkblue, darkgreen, gold

Or use hex: "#4285F4", "#EA4335", "#FBBC04", "#34A853"

---

## 6. Column 0-Index Reference

A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, J=9, K=10, Z=25

**end_column_index is EXCLUSIVE:**
- Column A only: start=0, end=1
- Columns A-C: start=0, end=3
- Columns A-Z: start=0, end=26

---

## 7. Step-by-Step Workflows

### "Bold the first row on all tabs"
1. get_spreadsheet_info(spreadsheet_id) → get tab names
2. For each tab: format_row(spreadsheet_id, tab_name=tab.title, row_number=1, bold=true)

### "Freeze the header row"
1. get_spreadsheet_info → confirm tab name
2. freeze_rows(spreadsheet_id, tab_name, row_count=1)

### "Format header: bold + blue background + white text"
1. get_spreadsheet_info → confirm tab name
2. format_row(spreadsheet_id, tab_name, row_number=1, bold=true, background_color="#4285F4", foreground_color="white")

### "Write data then format it"
1. get_spreadsheet_info → confirm tab name
2. write_sheet(spreadsheet_id, tab_name, "A1", [["Col1","Col2"],["v1","v2"]])
3. format_row(spreadsheet_id, tab_name, row_number=1, bold=true)
4. auto_resize_columns(spreadsheet_id, tab_name)

### "Add a new tab with data"
1. get_spreadsheet_info → confirm spreadsheet
2. add_sheet_tab(spreadsheet_id, sheet_title="New Tab")
3. write_sheet(spreadsheet_id, "New Tab", "A1", values)
4. format_row(spreadsheet_id, "New Tab", 1, bold=true)

---

## 8. Common Mistakes

| WRONG | RIGHT |
|---|---|
| Using write_sheet to bold | Use format_row or format_cells |
| Guessing tab name | Always call get_spreadsheet_info first |
| row_count=0 to freeze row 1 | row_count=1 freezes row 1 |
| 1-indexed columns for set_column_width | Columns are 0-indexed (A=0) |
| Omitting tab_name from format tools | tab_name is ALWAYS required |
| format_row with row_number=0 for row 1 | row_number=1 is row 1 (1-indexed) |

---

## 9. Number Format Patterns

| type | pattern | Shows as |
|---|---|---|
| CURRENCY | $#,##0.00 | $1,234.56 |
| PERCENT | 0.00% | 12.50% |
| DATE | MM/DD/YYYY | 06/14/2026 |
| NUMBER | #,##0 | 1,234 |
| TEXT | (empty string) | Raw text |

---

## 10. Error Handling

| Error | Cause | Fix |
|---|---|---|
| Tab "X" not found | Wrong tab name | Call get_spreadsheet_info |
| Invalid A1 notation | Bad range string | Check range format |
| Caller does not have permission | Sheets not connected | Ask user to reconnect in Settings > Connections |
| Quota exceeded | Too many API calls | Space out calls |
