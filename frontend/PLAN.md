# Revised Implementation Plan: Dynamic Question Loading

This document outlines the revised steps to implement dynamic question loading from a TSV file, supporting a 30-question board and optional `category` and `pointValue` fields.

## Phase 1: Enhance Data Model and Parsing

- [ ] **Update `Question` Interface:** In [`src/context/QuestionsContext.tsx`](src/context/QuestionsContext.tsx), extend the `Question` interface to include optional `category?: string` and `pointValue?: number` fields.

- [ ] **Expand TSV Parsing Logic:** In [`src/components/Menu.tsx`](src/components/Menu.tsx), modify the `handleFileUpload` function:
    - [ ] Read the header row of the uploaded TSV file to detect if "Category" and "Point Value" columns are present.
    - [ ] Map the TSV rows to `Question` objects. If the optional columns are present, populate `category` and `pointValue` accordingly.
    - [ ] If the data includes categories and point values, re-sort the questions array. The primary sort key should be `pointValue` (ascending), and the secondary key should be `category` (ascending). This will arrange the questions in the desired order for the board (e.g., `C1 100`, `C2 100`, ..., `C1 200`, `C2 200`, ...).
    - [ ] Ensure the logic correctly handles files with exactly 30 questions for a 6x5 grid.

## Phase 2: Adapt Board for New Data Structure

- [ ] **Adjust Board to 6x5 Grid:** In [`src/components/Board.tsx`](src/components/Board.tsx), update the component to handle a 30-question grid (6 categories x 5 questions).
    - [ ] Modify the `categories` state to initialize with 6 categories instead of 5.
    - [ ] Update the `normalizedQuestions` array to handle a length of 30.
    - [ ] Adjust the point value calculation to work for a 6-column layout (e.g., `Math.floor(index / 6 + 1) * 100`).

- [ ] **Display Data-Driven Values:**
    - [ ] If the incoming `questions` prop contains `category` data, use it to populate the category headers dynamically. The categories can be extracted from the first 6 items in the sorted questions array.
    - [ ] Update the button text to display the `pointValue` from each question object if it's available. If not, fall back to the calculated point value.
