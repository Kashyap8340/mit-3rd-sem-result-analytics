# BEU Class Result Fetcher

## Goal
Develop a web application that allows users to fetch and display examination results for an entire class of students from Bihar Engineering University (BEU), specifically for the 3rd Semester (Batch 2023).

## Context
The university provides results individually via a registration number. The registration number follows a specific pattern: `YYBBCCCSSS` (Year, Branch, College, Serial). The user wants to automate the fetching of these results for all students in a specific branch to view the class performance at a glance.

## Progress Checklist

### Core Functionality
- [x] **Project Setup**: Next.js with TypeScript and Tailwind CSS.
- [x] **API Integration**: Server Action to fetch results from `beu-bih.ac.in`.
- [x] **Registration Number Logic**:
    - [x] Regular students (Serial 001-065).
    - [x] Lateral Entry students (Serial 901-920, Batch Year + 1).
- [x] **Result Processing**:
    - [x] Handle missing/invalid data.
    - [x] Fallback to SGPA if CGPA is missing (for LE students).

### UI/UX
- [x] **Dashboard**: Branch selection and progress bar.
- [x] **Class Summary**:
    - [x] Total Students, Pass Percentage.
    - [x] Average SGPA & Average CGPA.
    - [x] Status Indicator.
- [x] **Result Table**:
    - [x] Sort by CGPA (descending).
    - [x] Display Serial, Reg No, Name, SGPA, CGPA, Status.
    - [x] **Failed Papers**: Display paper codes for Backlog/Fail students.
    - [x] **PDF Export**: Generate downloadable PDF (including failed papers).
- [x] **Visual Polish**:
    - [x] Modern color theme (Indigo/Purple).
    - [x] Animated gradient background.
    - [x] Responsive design with glassmorphism effects.

### Logic Refinements
- [x] **Status Logic**:
    - [x] FAIL: CGPA < 5.
    - [x] PROMOTED (Paper Back): CGPA >= 5 but not PASS.
    - [x] PASS: All clear.

## Technical Constraints
-   **API Endpoint**: `https://beu-bih.ac.in/backend/v1/result/get-result?year=2024&redg_no={REG_NO}&semester=III&exam_held=July/2025`
-   **CORS**: Requests proxied via Next.js Server Actions.
