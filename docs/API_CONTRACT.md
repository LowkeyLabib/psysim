# PsySim — API Contract

**Base URL:** `/api`

All requests and responses use `application/json; charset=utf-8`.
Authentication uses `Authorization: Bearer <token>` or session cookies.
In local development mock mode, passing header `x-user-role: student | supervisor` or `x-user-id: <uuid>` simulates authenticated personas.

---

## 1. Authentication & User

### `GET /api/me`
Retrieve currently authenticated user profile.
- **Response 200 OK**:
```json
{
  "id": "usr_99812",
  "name": "Dr. Sarah Khan",
  "email": "sarah.khan@example.com",
  "role": "student",
  "created_at": "2026-11-01T10:00:00Z"
}
```

### `GET /api/me/sessions`
List recent consultation sessions for current user.
- **Response 200 OK**:
```json
{
  "sessions": [
    {
      "id": "ses_4412",
      "mode": "CLINICAL_CHALLENGE",
      "difficulty": "INTERMEDIATE",
      "status": "EVALUATED",
      "patient_name": "Rahim Ahmed",
      "patient_age": 28,
      "outcome": "CORRECT",
      "created_at": "2026-11-13T20:15:00Z",
      "completed_at": "2026-11-13T20:35:00Z"
    }
  ]
}
```

---

## 2. Scenarios & Categories

### `GET /api/scenarios/categories`
List available diagnostic categories for Custom Case mode.
- **Response 200 OK**:
```json
{
  "categories": [
    { "id": "depressive_disorders", "name": "Depressive Disorders", "code": "DSM5_DEP", "case_count": 3 },
    { "id": "bipolar_disorders", "name": "Bipolar and Related Disorders", "code": "DSM5_BIP", "case_count": 3 },
    { "id": "psychotic_disorders", "name": "Schizophrenia Spectrum and Other Psychotic Disorders", "code": "DSM5_PSY", "case_count": 3 },
    { "id": "anxiety_disorders", "name": "Anxiety Disorders", "code": "DSM5_ANX", "case_count": 3 },
    { "id": "obsessive_compulsive", "name": "Obsessive-Compulsive and Related Disorders", "code": "DSM5_OCD", "case_count": 3 },
    { "id": "trauma_stressor", "name": "Trauma- and Stressor-Related Disorders", "code": "DSM5_PTSD", "case_count": 3 },
    { "id": "substance_related", "name": "Substance-Related and Addictive Disorders", "code": "DSM5_SUD", "case_count": 3 }
  ]
}
```

---

## 3. Consultation Sessions

### `POST /api/sessions`
Create a new consultation session.
- **Request Body**:
```json
{
  "mode": "CLINICAL_CHALLENGE",
  "difficulty": "BEGINNER",
  "category_id": null,
  "language": "bn"
}
```
- Valid `mode`: `CLINICAL_CHALLENGE`, `CUSTOM_CASE`
- Valid `difficulty`: `BEGINNER`, `INTERMEDIATE`, `ADVANCED`
- Valid `language`: `en`, `bn`, `auto`

- **Response 201 Created**:
```json
{
  "session": {
    "id": "ses_91203",
    "mode": "CLINICAL_CHALLENGE",
    "difficulty": "BEGINNER",
    "status": "CREATED",
    "patient": {
      "name": "Rahim Ahmed",
      "age": 27,
      "gender": "male",
      "occupation": "Bank Officer",
      "personality": "Quiet, cooperative, visibly fatigued",
      "language": "bn"
    },
    "opening_message": "আসসালামু আলাইকুম ডাক্তার সাহেব। আসলে কয়েক সপ্তাহ ধরে শরীরটা একদম ভালো লাগছে না, কিছু ভালো লাগে না...",
    "created_at": "2026-11-13T23:00:00Z"
  }
}
```
*(CRITICAL SECURITY: Does NOT contain diagnosis, internal code, or answer keys.)*

---

### `GET /api/sessions/:id`
Fetch session status, metadata, and patient demographics.
- **Response 200 OK**:
```json
{
  "id": "ses_91203",
  "status": "IN_PROGRESS",
  "mode": "CLINICAL_CHALLENGE",
  "difficulty": "BEGINNER",
  "patient": {
    "name": "Rahim Ahmed",
    "age": 27,
    "gender": "male",
    "occupation": "Bank Officer",
    "personality": "Quiet, cooperative, visibly fatigued",
    "language": "bn"
  },
  "created_at": "2026-11-13T23:00:00Z"
}
```

---

### `GET /api/sessions/:id/messages`
Retrieve all messages in the consultation.
- **Response 200 OK**:
```json
{
  "messages": [
    {
      "id": "msg_001",
      "sender": "patient",
      "content": "আসসালামু আলাইকুম ডাক্তার সাহেব...",
      "timestamp": "2026-11-13T23:00:00Z"
    },
    {
      "id": "msg_002",
      "sender": "student",
      "content": "ওয়ালাইকুম আসসালাম। বলুন, কি সমস্যা হচ্ছে?",
      "timestamp": "2026-11-13T23:00:30Z"
    }
  ]
}
```

---

### `POST /api/sessions/:id/messages`
Send student message to the patient simulator.
- **Request Body**:
```json
{
  "content": "আপনার ঘুম কেমন হচ্ছে? রাতে কোনো সমস্যা হয়?"
}
```
- **Response 200 OK**:
```json
{
  "patient_message": {
    "id": "msg_003",
    "sender": "patient",
    "content": "ঘুমাতে পারি না বললেই চলে। গভীর রাতে ঘুম ভেঙে যায়, তারপর আর কোনোভাবেই ঘুমাতে পারি না।",
    "timestamp": "2026-11-13T23:01:05Z"
  },
  "progress": {
    "interview_complete": false,
    "completed_mandatory_count": 2,
    "total_mandatory_count": 5
  }
}
```

---

### `GET /api/sessions/:id/progress`
Retrieve live clinical interview completion objectives.
- **Response 200 OK**:
```json
{
  "interview_complete": false,
  "can_submit_diagnosis": false,
  "objectives": [
    {
      "id": "obj_presenting_complaint",
      "title": "Presenting Complaint",
      "description": "Elicit chief complaint and reason for consultation",
      "is_mandatory": true,
      "status": "COMPLETED",
      "evidence_quote": "আসলে কয়েক সপ্তাহ ধরে শরীরটা একদম ভালো লাগছে না...",
      "confidence": 0.95
    },
    {
      "id": "obj_symptom_chronology",
      "title": "Symptom Timeline & Progression",
      "description": "Explore onset, duration, and fluctuations",
      "is_mandatory": true,
      "status": "COMPLETED",
      "evidence_quote": "ঘুমাতে পারি না বললেই চলে...",
      "confidence": 0.90
    },
    {
      "id": "obj_functional_impairment",
      "title": "Functional Impairment",
      "description": "Assess occupational and social impact",
      "is_mandatory": true,
      "status": "NOT_STARTED"
    },
    {
      "id": "obj_past_history",
      "title": "Psychiatric & Medical History",
      "description": "Inquire about past episodes, medical illnesses, and medications",
      "is_mandatory": true,
      "status": "NOT_STARTED"
    },
    {
      "id": "obj_risk_assessment",
      "title": "Safety & Risk Assessment",
      "description": "Screen for self-harm, suicidality, and safety risks",
      "is_mandatory": true,
      "status": "NOT_STARTED"
    }
  ]
}
```

---

### `POST /api/sessions/:id/diagnosis`
Submit student's final diagnostic impression.
- **Request Body**:
```json
{
  "diagnosis": "Major Depressive Disorder",
  "clinical_reasoning": "Patient presents with a 2-month history of pervasive low mood, terminal insomnia, anhedonia, and functional impairment without manic episodes."
}
```
- **Response 200 OK** (when `can_submit_diagnosis` is true):
```json
{
  "status": "EVALUATED",
  "evaluation_id": "eval_8812"
}
```
- **Error 403 Forbidden** (if mandatory objectives incomplete):
```json
{
  "error": "SUBMISSION_LOCKED",
  "message": "Mandatory clinical interview objectives have not been completed. Missing: Functional Impairment, Safety & Risk Assessment.",
  "missing_objectives": ["obj_functional_impairment", "obj_risk_assessment"]
}
```
- **Error 400 Bad Request** (if session already submitted):
```json
{
  "error": "SESSION_ALREADY_EVALUATED",
  "message": "Diagnosis has already been submitted for this session."
}
```

---

### `GET /api/sessions/:id/results`
Retrieve final evaluation, actual diagnosis, and educational feedback.
- Available only after `EVALUATED` state.
- **Response 200 OK**:
```json
{
  "session_id": "ses_91203",
  "outcome": "CORRECT",
  "actual_diagnosis": {
    "name": "Major Depressive Disorder, Single Episode, Moderate",
    "icd11_code": "6A70.1",
    "dsm5_code": "296.22",
    "category": "Depressive Disorders"
  },
  "submitted_diagnosis": "Major Depressive Disorder",
  "outcome_explanation": "Your submitted diagnosis accurately identified the approved condition. The clinical presentation aligns with DSM-5 criteria for Major Depressive Disorder.",
  "key_positive_findings": [
    "Depressed mood persistent for >2 months",
    "Terminal insomnia and pronounced fatigue",
    "Occupational impairment with difficulty concentrating"
  ],
  "relevant_negative_findings": [
    "No history of elevated mood, hyperactivity, or decreased need for sleep (rules out Bipolar Affective Disorder)",
    "No auditory hallucinations or persecutory delusions"
  ],
  "educational_rubric": {
    "overall_score": 88,
    "domains": [
      { "name": "Rapport & Empathy", "score": 4, "max_score": 5, "feedback": "Maintained professional and validating tone." },
      { "name": "History Taking", "score": 5, "max_score": 5, "feedback": "Thorough investigation of sleep disruption and onset." },
      { "name": "Psychiatric Assessment", "score": 4, "max_score": 5, "feedback": "Adequately screened for past depressive episodes." },
      { "name": "Risk & Safety", "score": 5, "max_score": 5, "feedback": "Compassionately screened for passive and active suicidal ideation." },
      { "name": "Clinical Reasoning", "score": 4, "max_score": 5, "feedback": "Sound rationale linking vegetative symptoms to MDD." }
    ]
  },
  "learning_points": [
    "In moderate MDD, distinguishing unipolar depression from bipolar depression requires diligent screening for hypomanic history.",
    "Early assessment of sleep architecture (early morning awakening) provides strong neurovegetative corroboration."
  ]
}
```

---

## 4. Supervisor Portal

### `GET /api/supervisor/scenarios`
List all scenarios with approval status filter.

### `POST /api/supervisor/scenarios`
Author new scenario template.

### `POST /api/supervisor/scenarios/:id/approve`
Clinician review approval endpoint.
- **Request Body**:
```json
{
  "status": "APPROVED",
  "reviewer_notes": "Clinically reviewed and verified against DSM-5 criteria."
}
```

---

## 5. Standard Error Responses

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable description",
  "details": []
}
```
Common codes:
- `400`: `INVALID_INPUT`, `SESSION_ALREADY_EVALUATED`
- `401`: `UNAUTHORIZED`
- `403`: `SUBMISSION_LOCKED`, `FORBIDDEN`
- `404`: `SESSION_NOT_FOUND`, `SCENARIO_NOT_FOUND`
- `429`: `RATE_LIMIT_EXCEEDED`
- `500`: `INTERNAL_SERVER_ERROR`
