# Member Module API Guide (Phases 1-4)

This guide documents implemented member APIs for Phases 1-4, including validation, authorization, sample payloads, Postman usage, and manual testing steps.

## Base URL

- `http://localhost:5000/api`

## Authentication

- Type: `Bearer <JWT>`
- Required for all `/api/member/*` endpoints.
- Role required: `member`

---

## Phase 1: Member Authentication & Profile

### 1) Login

- Method: `POST`
- Path: `/auth/member/login`
- Auth: Public

Sample request:

```json
{
  "identifier": "member1@example.com",
  "password": "member123"
}
```

Sample success response:

```json
{
  "success": true,
  "message": "Member logged in successfully",
  "data": {
    "token": "<jwt>",
    "user": {
      "id": "6869ea4f20f88ea92764694a",
      "name": "Member One",
      "email": "member1@example.com",
      "role": "member",
      "mobile": "9876543210",
      "joiningDate": "2026-01-15T00:00:00.000Z",
      "status": "Active",
      "mustChangePassword": false
    }
  }
}
```

Sample validation error response:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "identifier",
      "message": "Mobile or email is required"
    }
  ]
}
```

### 2) Get Profile

- Method: `GET`
- Path: `/member/profile`
- Auth: Member

Sample success response:

```json
{
  "success": true,
  "data": {
    "member": {
      "id": "6869ea4f20f88ea92764694a",
      "name": "Member One",
      "email": "member1@example.com",
      "role": "member",
      "mobile": "9876543210",
      "joiningDate": "2026-01-15T00:00:00.000Z",
      "status": "Active",
      "mustChangePassword": false
    }
  }
}
```

### 3) Change Password

- Method: `PUT`
- Path: `/member/profile/password`
- Auth: Member

Sample request:

```json
{
  "currentPassword": "member123",
  "newPassword": "member1234",
  "confirmNewPassword": "member1234"
}
```

Sample success response:

```json
{
  "success": true,
  "message": "Password updated successfully",
  "data": {
    "member": {
      "id": "6869ea4f20f88ea92764694a",
      "name": "Member One",
      "email": "member1@example.com",
      "role": "member",
      "mobile": "9876543210",
      "joiningDate": "2026-01-15T00:00:00.000Z",
      "status": "Active",
      "mustChangePassword": false
    }
  }
}
```

---

## Phase 2: Contribution Summary

### 1) List Contributions

- Method: `GET`
- Path: `/member/contributions?page=1&limit=10&status=paid&sort=-month`
- Auth: Member

Sample success response:

```json
{
  "success": true,
  "data": {
    "contributions": [
      {
        "id": "6869f2db3db35431f9375aea",
        "month": "2026-06",
        "label": "Jun 2026",
        "amount": 1000,
        "status": "paid",
        "paymentDate": "2026-06-05T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 12,
      "totalPages": 2
    }
  }
}
```

### 2) Contribution Summary

- Method: `GET`
- Path: `/member/contributions/summary`
- Auth: Member

Sample success response:

```json
{
  "success": true,
  "data": {
    "totalContribution": 12000,
    "totalMonths": 12,
    "latestPaymentDate": "2026-06-05T00:00:00.000Z",
    "paidMonths": 12,
    "unpaidMonths": 0,
    "averageMonthlyContribution": 1000
  }
}
```

---

## Phase 3: Contribution Details & Reports

### 1) Contribution by ID

- Method: `GET`
- Path: `/member/contributions/:id`
- Auth: Member

Sample success response:

```json
{
  "success": true,
  "data": {
    "id": "6869f2db3db35431f9375aea",
    "month": "2026-06",
    "label": "Jun 2026",
    "amount": 1000,
    "status": "paid",
    "paymentDate": "2026-06-05T00:00:00.000Z",
    "createdAt": "2026-06-05T10:00:00.000Z",
    "updatedAt": "2026-06-05T10:00:00.000Z"
  }
}
```

### 2) Contributions by Year

- Method: `GET`
- Path: `/member/contributions/year/2026`
- Auth: Member

Sample success response:

```json
{
  "success": true,
  "data": {
    "year": 2026,
    "contributions": [
      {
        "id": "6869f2db3db35431f9375aea",
        "month": "2026-06",
        "label": "Jun 2026",
        "amount": 1000,
        "status": "paid",
        "paymentDate": "2026-06-05T00:00:00.000Z"
      }
    ],
    "statistics": {
      "totalContribution": 12000,
      "totalMonths": 12,
      "paidMonths": 12,
      "unpaidMonths": 0,
      "averageMonthlyContribution": 1000
    }
  }
}
```

---

## Phase 4: Loan Summary

### 1) List Loans

- Method: `GET`
- Path: `/member/loans?page=1&limit=10&status=closed`
- Auth: Member
- Supported status filter values: `active`, `paid`, `defaulted`, `closed`
- Note: `closed` maps to `paid` + `defaulted`.

Sample success response:

```json
{
  "success": true,
  "data": {
    "loans": [
      {
        "id": "6869f8f4cfa9442e3e4b9d55",
        "amount": 50000,
        "remaining": 15000,
        "status": "active",
        "issueDate": "2026-01-01T00:00:00.000Z",
        "dueDate": "2026-12-31T00:00:00.000Z",
        "memberName": "Member One"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### 2) Loan by ID

- Method: `GET`
- Path: `/member/loans/:loanId`
- Auth: Member

Sample success response:

```json
{
  "success": true,
  "data": {
    "id": "6869f8f4cfa9442e3e4b9d55",
    "amount": 50000,
    "remaining": 15000,
    "status": "active",
    "issueDate": "2026-01-01T00:00:00.000Z",
    "dueDate": "2026-12-31T00:00:00.000Z",
    "memberName": "Member One"
  }
}
```

Sample not found response (ownership-safe):

```json
{
  "success": false,
  "message": "Loan not found"
}
```

### 3) Loan Summary

- Method: `GET`
- Path: `/member/loans/summary`
- Auth: Member

Sample success response:

```json
{
  "success": true,
  "data": {
    "totalBorrowed": 90000,
    "totalRemaining": 30000,
    "activeLoans": 1,
    "closedLoans": 1,
    "totalLoans": 2
  }
}
```

---

## Postman Collection

Import this file in Postman:

- `backend/postman/member-phases-1-4.postman_collection.json`

Before running member endpoints:

1. Run `Member Login` request.
2. Copy `data.token` from response.
3. Set collection variable `token` with that value.
4. Run protected requests.

---

## Manual Testing Steps

1. Login with valid member credentials and verify token/user fields.
2. Try login with invalid password and confirm `401`.
3. Call profile endpoint with member token and verify own profile only.
4. Call profile endpoint without token and confirm `401`.
5. Change password using wrong current password and confirm `400`.
6. Change password with mismatched confirm password and confirm `422`.
7. Call contributions list with pagination and verify page metadata.
8. Call contributions summary and verify totals against known records.
9. Call contribution by ID using another member's ID and confirm `404`.
10. Call contributions by year with invalid year and confirm `422`.
11. Call loans list with `status=active`, `status=paid`, `status=defaulted`, and `status=closed` and verify results.
12. Call loan by ID using another member's loan ID and confirm `404`.
13. Call loans summary and verify `closedLoans = paid + defaulted`.
14. Verify no endpoint returns another member's contribution or loan data.
