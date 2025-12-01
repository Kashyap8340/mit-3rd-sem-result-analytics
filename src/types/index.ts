export interface Subject {
    code: string;
    name: string;
    ese: string;
    ia: string;
    total: string;
    grade: string;
    credit: string;
}

export interface StudentResult {
    semester: string;
    exam_held: string;
    redg_no: number; // API returns number
    name: string;
    father_name: string;
    mother_name: string;
    college_code: number;
    college_name: string;
    course_code: number;
    course: string;
    examYear: number;
    theorySubjects: Subject[];
    practicalSubjects: Subject[];
    sgpa: (string | null)[]; // Array of strings or nulls
    cgpa: string;
    fail_any: string; // "PASS" or "FAIL"
}

export interface ApiResponse {
    status: number;
    message: string;
    data: StudentResult;
}
