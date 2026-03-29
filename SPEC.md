# Reimbursement Management System - Technical Specification

## 1. Project Overview

**Project Name:** Reimbursor - Reimbursement Management System
**Project Type:** Full-stack web application
**Core Functionality:** Employee expense submission and multi-level approval workflow management system
**Target Users:** Companies of all sizes managing employee expense reimbursements

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js | 14 (App Router) |
| Language | TypeScript | Latest |
| UI Library | React | 18+ |
| Styling | Tailwind CSS | 3.4+ |
| Component Library | shadcn/ui | Latest |
| ORM | Prisma | 5+ |
| Database | PostgreSQL | 15+ |
| Authentication | NextAuth.js | 4.x (Credentials Provider only) |
| Password Hashing | bcryptjs | 2.x |
| OCR | Tesseract.js | 5.x |
| Validation | Zod | Latest |
| Date Handling | date-fns | Latest |

---

## 3. Database Schema

### 3.1 Enum Definitions

```prisma
enum Role {
  ADMIN
  MANAGER
  EMPLOYEE
}

enum ExpenseStatus {
  DRAFT
  PENDING
  APPROVED
  REJECTED
}

enum RuleType {
  SEQUENTIAL
  PERCENTAGE
  SPECIFIC_APPROVER
  HYBRID
}

enum ApprovalActionType {
  PENDING
  APPROVED
  REJECTED
}
```

### 3.2 Model Definitions

#### Company
| Field | Type | Constraints |
|-------|------|-------------|
| id | String (cuid) | Primary Key |
| name | String | Required |
| country | String | Required |
| currency | String | Required (ISO 4217) |
| createdAt | DateTime | Default: now() |

#### User
| Field | Type | Constraints |
|-------|------|-------------|
| id | String (cuid) | Primary Key |
| name | String | Required |
| email | String | Unique, Required |
| passwordHash | String | Required |
| role | Role | Required |
| companyId | String | FK → Company |
| managerId | String? | FK → User (self-relation, nullable) |
| isManagerApprover | Boolean | Default: false |
| resetPasswordToken | String? | Nullable |
| resetPasswordExpiry | DateTime? | Nullable |
| createdAt | DateTime | Default: now() |

#### Expense
| Field | Type | Constraints |
|-------|------|-------------|
| id | String (cuid) | Primary Key |
| employeeId | String | FK → User |
| companyId | String | FK → Company |
| description | String | Required |
| category | String | Required |
| date | DateTime | Required |
| remarks | String? | Nullable |
| submittedAmount | Decimal | Required |
| submittedCurrency | String | Required (ISO 4217) |
| convertedAmount | Decimal | Required |
| conversionRate | Decimal | Required |
| status | ExpenseStatus | Default: PENDING |
| currentApprovalStep | Int | Default: 0 |
| receiptId | String? | FK → Receipt, nullable |
| createdAt | DateTime | Default: now() |
| updatedAt | DateTime | Updated on save |

#### Receipt
| Field | Type | Constraints |
|-------|------|-------------|
| id | String (cuid) | Primary Key |
| expenseId | String? | FK → Expense, nullable |
| fileData | Bytes | Required (binary storage) |
| mimeType | String | Required |
| createdAt | DateTime | Default: now() |

#### ApprovalRule
| Field | Type | Constraints |
|-------|------|-------------|
| id | String (cuid) | Primary Key |
| companyId | String | FK → Company |
| name | String | Required |
| description | String? | Nullable |
| isManagerApprover | Boolean | Default: false |
| approveThreshold | Decimal? | Nullable |
| ruleType | RuleType | Required |
| percentageRequired | Int? | Nullable (1-100) |
| specificApproverId | String? | FK → User, nullable |
| createdAt | DateTime | Default: now() |
| updatedAt | DateTime | Updated on save |

#### ApprovalStep
| Field | Type | Constraints |
|-------|------|-------------|
| id | String (cuid) | Primary Key |
| ruleId | String | FK → ApprovalRule |
| approverId | String | FK → User |
| stepOrder | Int | Required (1-based) |
| isRequired | Boolean | Default: true |

#### ApprovalAction
| Field | Type | Constraints |
|-------|------|-------------|
| id | String (cuid) | Primary Key |
| expenseId | String | FK → Expense |
| approverId | String | FK → User |
| stepOrder | Int | Required |
| action | ApprovalActionType | Default: PENDING |
| comment | String? | Nullable |
| actedAt | DateTime? | Nullable |
| createdAt | DateTime | Default: now() |

#### Notification
| Field | Type | Constraints |
|-------|------|-------------|
| id | String (cuid) | Primary Key |
| userId | String | FK → User |
| message | String | Required |
| isRead | Boolean | Default: false |
| expenseId | String? | FK → Expense, nullable |
| createdAt | DateTime | Default: now() |

---

## 4. External API Integrations

### 4.1 Country & Currency API
- **Endpoint:** `GET https://restcountries.com/v3.1/all?fields=name,currencies`
- **Purpose:** Populate country dropdown on signup, map country to currency
- **Caching:** Results cached server-side, not called on every page load

### 4.2 Exchange Rate API
- **Endpoint:** `GET https://api.exchangerate-api.com/v4/latest/{BASE_CURRENCY}`
- **Purpose:** Convert submitted expense amounts to company base currency
- **Usage:** Called at expense submission time only, rate snapshotted

---

## 5. Page & Route Specifications

### 5.1 Public Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | LoginPage | User authentication |
| `/signup` | SignupPage | Admin signup + company creation |

### 5.2 Protected Routes (All Roles)

| Route | Roles | Description |
|-------|-------|-------------|
| `/dashboard` | All | Role-aware dashboard redirect |
| `/expenses` | All | List user's expenses |
| `/expenses/new` | All | Submit new expense (OCR or manual) |
| `/expenses/[id]` | All | View expense detail + approval log |
| `/notifications` | All | View all notifications |

### 5.3 Manager Routes

| Route | Roles | Description |
|-------|-------|-------------|
| `/approvals` | Manager, Admin | List pending approvals |
| `/approvals/[id]` | Manager, Admin | Review and act on expense |

### 5.4 Admin Routes

| Route | Roles | Description |
|-------|-------|-------------|
| `/admin/users` | Admin | User management |
| `/admin/approval-rules` | Admin | Approval rules list |
| `/admin/approval-rules/new` | Admin | Create approval rule |
| `/admin/approval-rules/[id]` | Admin | Edit approval rule |

### 5.5 API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handler |
| `/api/ocr` | POST | Tesseract.js OCR processing |
| `/api/exchange-rate` | GET | Proxy for exchange rate API |

---

## 6. Approval Engine Logic

### 6.1 Rule Matching Algorithm
1. Query all `ApprovalRule` records for the company
2. Filter rules where `approveThreshold` is null OR `convertedAmount > approveThreshold`
3. If multiple rules match, select the one with the highest threshold
4. If no rule matches, use default: direct manager approval (if employee has manager)

### 6.2 Approver Sequence Building
1. Start with empty sequence
2. If rule's `isManagerApprover = true` OR employee's `isManagerApprover = true`:
   - Prepend employee's manager as step 0
3. Append all `ApprovalStep` records for the rule, ordered by `stepOrder`

### 6.3 Action Evaluation

**SEQUENTIAL:**
- Approver can only act if their stepOrder equals `currentApprovalStep`
- On APPROVE: increment `currentApprovalStep`
- If last step approved: set `status = APPROVED`
- On REJECT: set `status = REJECTED`

**PERCENTAGE:**
- Any assigned approver can act at any time
- Count APPROVED actions: `(approved / total) * 100`
- If >= `percentageRequired`: set `status = APPROVED`
- If REJECTED makes threshold mathematically impossible: set `status = REJECTED`

**SPECIFIC_APPROVER:**
- Only the `specificApproverId` user can finalize approval
- Their APPROVE action immediately sets `status = APPROVED`

**HYBRID:**
- Apply PERCENTAGE check first
- If not met, apply SPECIFIC_APPROVER check
- First condition met wins

---

## 7. UI/UX Specifications

### 7.1 Layout Structure
- Sidebar navigation (collapsible on mobile)
- Top navbar with notification bell and user menu
- Main content area with consistent padding

### 7.2 Color Palette (Tailwind)
- Primary: `blue-600` (actions, links)
- Success: `green-600` (approved status)
- Warning: `yellow-500` (pending status)
- Danger: `red-600` (rejected, errors)
- Background: `slate-50` (light mode)
- Surface: `white` (cards, modals)

### 7.3 Component Library (shadcn/ui)
- Button (variants: default, outline, ghost, destructive)
- Input (text, email, password, number)
- Select (dropdowns)
- Dialog (modals)
- Table (data display)
- Badge (status indicators)
- Card (content containers)
- Tabs (navigation)
- Progress (step indicators)
- Avatar (user display)
- DropdownMenu (actions)
- Form components with Zod validation

---

## 8. Security Specifications

### 8.1 Authentication
- Passwords hashed with bcrypt (salt rounds: 12)
- Session-based auth via NextAuth.js
- CSRF protection enabled
- Secure cookies (httpOnly, sameSite)

### 8.2 Authorization
- Role-based middleware on all protected routes
- Admin-only routes protected at middleware level
- Manager routes accessible to MANAGER and ADMIN roles
- Employee data isolation (users see only their own expenses)

### 8.3 Input Validation
- All inputs validated with Zod schemas
- Currency codes validated against ISO 4217
- File uploads validated for type and size (max 10MB)
- SQL injection prevented via Prisma parameterized queries

---

## 9. Data Integrity Rules

1. **Expense immutability:** `convertedAmount` and `conversionRate` cannot be modified after creation
2. **User deletion:** Blocked if user has pending `ApprovalAction` rows
3. **Approval sequence:** Only current step approver can act in SEQUENTIAL mode
4. **Admin override:** Admin can set any expense to APPROVED or REJECTED directly
5. **Currency validation:** All currency codes must be valid ISO 4217

---

## 10. File Storage Strategy

- Receipt images stored as binary (`Bytes`) in PostgreSQL
- No external storage service used
- Maximum file size: 10MB
- Supported formats: image/jpeg, image/png, image/webp
- Receipt linked to expense via `receiptId` foreign key

---

## 11. Environment Variables

```
DATABASE_URL=postgresql://user:password@localhost:5432/reimbursor
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

---

## 12. Development Workflow

### 12.1 Setup Commands
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### 12.2 Seed Data
```bash
npx prisma db seed
```

### 12.3 Available Scripts
| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build production bundle |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript check |
| `npx prisma studio` | Open Prisma database GUI |

---

## 13. Acceptance Criteria

1. Admin can sign up and create company
2. Admin can create users and assign managers
3. Admin can configure approval rules with multiple approvers
4. Employees can submit expenses with or without OCR
5. Expenses are converted to company currency using live rates
6. Managers can approve/reject expenses following configured rules
7. Percentage-based approvals work correctly
8. Notifications appear in real-time
9. All status transitions work as specified
10. Session-based auth works correctly
11. Password reset flow displays generated password
12. All pages follow shadcn/ui design patterns
