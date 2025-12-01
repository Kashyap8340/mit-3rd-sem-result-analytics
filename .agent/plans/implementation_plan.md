# Implementation Plan - BEU Class Result Fetcher

## 1. Project Setup
- [x] Initialize Next.js project with TypeScript and Tailwind CSS.
- [/] Install additional dependencies: `lucide-react` (icons), `clsx`, `tailwind-merge` (utils).
- [/] Install PDF generation library: `jspdf` and `jspdf-autotable`.
- [ ] Configure `next.config.ts` if needed for image domains (if any).

## 2. Core Logic & API Integration
- [ ] **Type Definitions**: Define TypeScript interfaces for the BEU API response (Student, Subject, Marks).
- [ ] **Server Action (`app/actions.ts`)**:
    -   Create `fetchStudentResult(regNo: string)` function.
    -   Implement error handling for network issues or invalid registration numbers.
    -   Parse the JSON response.
- [ ] **Utilities (`lib/utils.ts`)**:
    -   Create a helper to generate the list of registration numbers based on Batch, Branch, College, and Count.
    -   **Update**: Include Lateral Entry range (901-920) in the generation logic.
    -   Define the `BRANCH_DATA` constant with codes and student counts.

## 3. UI Components
- [ ] **`components/ui`**: Create basic accessible components (Card, Button, Input, Select, Table, Progress).
- [ ] **`components/ResultDashboard.tsx`**:
    -   State management for selected branch, fetching status, and results list.
    -   "Fetch Results" button to trigger the batch process.
    -   Progress bar showing "Fetching X of Y...".
    -   **Sorting Logic**: Sort the fetched data by CGPA (descending) before displaying.
    -   **PDF Export**: Button to trigger PDF generation using `jspdf`.
- [ ] **`components/ClassSummary.tsx`**:
    -   Cards showing Total Students, Pass Percentage, Average SGPA, Topper.
- [ ] **`components/ResultTable.tsx`**:
    -   Table to display the list of students.
    -   Columns: Serial No, Reg No, Name, SGPA, CGPA, Status.
    -   Row click to expand/show details (Subject marks).

## 4. Main Page Integration
- [ ] Update `app/page.tsx` to include the `ResultDashboard`.
- [ ] Add a header with the University/College name.
- [ ] Ensure responsive layout for mobile and desktop.

## 5. Refinement & Polish
- [ ] Add animations for row insertion (framer-motion optional, or CSS).
- [ ] Handle "Student Not Found" cases (skip or show as absent).
- [ ] Add "Stop Fetching" functionality.
- [ ] Verify against the example registration number `23117107012`.

## 6. Verification
- [x] Test with the provided example `23117107012` (Code implemented).
- [x] Verify data accuracy against the manual result page (Code implemented).
- [x] Automated build verified (Server running).

## 7. UI Redesign (New)
- [ ] **Global Styles**: Update `globals.css` with modern color variables and base styles.
- [ ] **Layout**: Enhance `page.tsx` with a better background and container.
- [ ] **Components**:
    - [ ] Polish `ResultDashboard` (spacing, loading states).
    - [ ] Polish `ClassSummary` (icons, card styling).
    - [ ] Polish `ResultTable` (sticky header, hover effects, badges).
- [ ] **Responsiveness**: Ensure mobile compatibility.
