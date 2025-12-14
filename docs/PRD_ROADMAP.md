# LuxuryDental v2.0 — PRD + Roadmap (Source of Truth)

> **Last Updated**: 2025-12-14  
> **Status**: Phase 0 - Foundation  
> **Maintainer**: [Luis]

---

## 📌 How to Use This Document

This is the **single source of truth** for the LuxuryDental v2.0 project. Every AI agent, developer, or stakeholder MUST read this before making any changes.

### Update Protocol
- `[ ]` = Not started
- `[/]` = In progress
- `[x]` = Completed
- **After completing any feature**: Update this document FIRST
- **After making significant decisions**: Add to Changelog section
- **If requirements change**: Update relevant section with timestamp

---

## 1. Vision & Philosophy

### 1.1 Mission Statement
> **"A Dental Clinic That Runs Itself."**

LuxuryDental is an **Autonomous Revenue Engine** — not just a management tool, but a 24/7 high-performance digital workforce.

### 1.2 Core Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Passive Revenue | >70% | Revenue booked without human intervention |
| Response Time | <30 seconds | Time to first AI response on WhatsApp |
| No-Show Rate | <5% | Appointments missed without cancellation |
| Lead Conversion | >40% | New leads that become patients |
| Patient Retention | >80% | Patients returning within 12 months |

### 1.3 Philosophy
1. **Inbound First**: The system primarily handles incoming inquiries
2. **Autonomous Execution**: AI makes decisions within defined guardrails
3. **Minimal Human Oversight**: Staff reviews exceptions only
4. **Data-Driven**: Every decision is backed by patient history

---

## 2. Tech Stack

### 2.1 Core Technologies

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Frontend** | Next.js | 16.x | App Router, Server Actions, RSC |
| **Styling** | Tailwind CSS | 3.4.x | Design tokens, JIT compilation |
| **Animation** | Framer Motion | 12.x | Premium micro-interactions |
| **Backend** | Supabase | Latest | PostgreSQL, Auth, Realtime, Storage |
| **AI LLM** | DeepSeek-V3 | - | Cost-effective, high accuracy |
| **AI Voice** | OpenAI Whisper | - | Audio transcription |
| **Messaging** | Meta Cloud API | - | WhatsApp Business |
| **Payments** | Wompi | - | Colombia payment gateway |
| **Hosting** | Vercel | - | Edge functions, auto-deploy |

### 2.2 Key Dependencies
```json
{
  "dependencies": {
    "next": "16.x",
    "@supabase/ssr": "^0.8.x",
    "@supabase/supabase-js": "^2.87.x",
    "ai": "^5.x",
    "@ai-sdk/openai": "^2.x",
    "zod": "^4.x",
    "framer-motion": "^12.x",
    "date-fns": "^4.x",
    "lucide-react": "^0.556.x",
    "recharts": "^3.x"
  }
}
```

### 2.3 Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
DEEPSEEK_API_KEY=
OPENAI_API_KEY=  # For Whisper only

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=

# Payments
WOMPI_PUBLIC_KEY=
WOMPI_PRIVATE_KEY=
WOMPI_EVENTS_SECRET=

# Cron Security
CRON_SECRET=
```

---

## 3. Architecture Blueprint

### 3.1 Project Structure
```
LuxuryDental-v2/
├── src/
│   ├── app/
│   │   ├── (public)/          # Landing, Privacy
│   │   ├── (auth)/            # Login, Register
│   │   ├── admin/             # Protected dashboard
│   │   │   ├── appointments/
│   │   │   ├── patients/
│   │   │   ├── leads/
│   │   │   ├── financials/
│   │   │   ├── inventory/
│   │   │   ├── settings/
│   │   │   └── layout.tsx
│   │   └── api/
│   │       ├── webhooks/
│   │       │   └── whatsapp/
│   │       └── cron/
│   │           ├── smart-monitor/
│   │           └── marketing/
│   ├── components/
│   │   ├── ui/                # Primitives
│   │   ├── features/          # Domain components
│   │   └── layouts/           # Page wrappers
│   ├── lib/
│   │   ├── actions/           # Server actions
│   │   ├── ai/                # AI utilities
│   │   ├── supabase/          # Clients
│   │   ├── validations/       # Zod schemas
│   │   └── utils/             # Helpers
│   ├── hooks/                 # Custom hooks
│   ├── types/                 # TypeScript types
│   └── middleware.ts          # Auth middleware
├── database/
│   ├── 00_extensions.sql
│   ├── 01_types.sql
│   ├── 02_tables.sql
│   ├── 03_indexes.sql
│   ├── 04_security.sql
│   ├── 05_functions.sql
│   └── 06_seed.sql
├── docs/
│   └── PRD_ROADMAP.md         # This file
├── scripts/
│   ├── ai_qa_tool.ts
│   └── seed_services.ts
├── build_db.sh
└── package.json
```

### 3.2 Database Schema

#### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `organizations` | Multi-tenant isolation | `id`, `slug`, `settings` (JSONB) |
| `admin_users` | Staff accounts | `id` (=auth.uid), `organization_id`, `role` |
| `services` | Service catalog | `title`, `price`, `duration_minutes` |
| `patients` | Patient records | `full_name`, `whatsapp_number`, `ai_notes` |
| `leads` | Pre-patient contacts | `phone`, `status`, `ai_tags[]` |
| `appointments` | Calendar entries | `patient_id`, `date`, `time`, `status` |
| `transactions` | Financial records | `amount`, `type`, `patient_id` |
| `patient_documents` | File storage references | `file_path`, `mime_type` |

#### AI & Messaging Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `messages` | Chat history | `role`, `content`, `patient_id` OR `lead_id` |
| `knowledge_docs` | RAG vector store | `embedding` (vector), `content` |
| `conversation_summaries` | Memory compression | `summary`, `key_facts` (JSONB) |

#### Marketing Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `drip_campaigns` | Campaign definitions | `type`, `trigger_condition`, `message_template` |
| `campaign_sends` | Send tracking | `campaign_id`, `patient_id`, `status` |
| `patient_feedback` | NPS collection | `nps_score`, `feedback_text` |

#### System Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `inventory_items` | Stock management | `quantity`, `min_stock_level` |
| `rate_limits` | API protection | `key`, `count`, `last_request_at` |

### 3.3 API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/webhooks/whatsapp` | POST | WhatsApp message handler |
| `/api/cron/smart-monitor` | POST | Auto-cancel, reminders |
| `/api/cron/marketing` | POST | Reactivation campaigns |

---

## 4. Feature Specifications

### 4.1 Authentication & Authorization

**Status**: `[ ]`

#### Requirements
- [ ] Supabase Auth with email/password
- [ ] Role-based access: `owner`, `admin`, `dentist`, `assistant`
- [ ] Middleware protection for `/admin/*` routes
- [ ] Organization context in all authenticated requests

#### Roles Matrix

| Feature | Owner | Admin | Dentist | Assistant |
|---------|-------|-------|---------|-----------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| Manage Patients | ✅ | ✅ | ✅ | Read Only |
| Manage Appointments | ✅ | ✅ | ✅ | ✅ |
| View Financials | ✅ | ✅ | ❌ | ❌ |
| Manage Settings | ✅ | ❌ | ❌ | ❌ |
| Manage Staff | ✅ | ❌ | ❌ | ❌ |

### 4.2 Patient Management

**Status**: `[ ]`

#### Requirements
- [ ] Patient CRUD with search
- [ ] Profile view with tabs: Info, Documents, History, Financial
- [ ] AI Notes & Tags display (read-only for UI, edited by AI)
- [ ] WhatsApp link for quick contact
- [ ] Document upload to Supabase Storage

#### Fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| full_name | varchar(255) | Yes | Auto Camel Case |
| email | varchar(255) | No | Validated format |
| whatsapp_number | varchar(50) | Yes | E.164 format preferred |
| address | text | No | |
| notes | text | No | Staff notes |
| ai_notes | text | No | AI-generated context |
| ai_tags | text[] | No | AI-extracted interests |

### 4.3 Appointment Calendar

**Status**: `[ ]`

#### Requirements
- [ ] Week/Month view with drag-drop
- [ ] Time slot picker (30 min increments)
- [ ] Business hours enforcement: Mon-Sat, 8AM-6PM Bogotá time
- [ ] Conflict detection (DB-level unique constraint)
- [ ] Status management: scheduled → confirmed → completed/cancelled/no_show
- [ ] Visual differentiation by status (color coding)

#### Business Hours (Immutable)
```
Monday:    08:00 - 18:00
Tuesday:   08:00 - 18:00
Wednesday: 08:00 - 18:00
Thursday:  08:00 - 18:00
Friday:    08:00 - 18:00
Saturday:  08:00 - 14:00
Sunday:    CLOSED
```

### 4.4 The AI Brain ("Luxe")

**Status**: `[ ]`

#### Capabilities
- [ ] WhatsApp message ingestion via webhook
- [ ] Audio message transcription (Whisper)
- [ ] Natural language understanding (DeepSeek-V3)
- [ ] Appointment booking/cancellation/rescheduling
- [ ] Lead capture and qualification
- [ ] Medical symptom detection (secondary pass)
- [ ] Handoff to human on critical keywords

#### Tools

| Tool | Function | Parameters |
|------|----------|------------|
| `book_appointment` | Create new appointment | `date`, `time`, `service_name` |
| `cancel_appointment` | Cancel existing | `appointment_id`, `reason` |
| `reschedule_appointment` | Atomic move | `appointment_id`, `new_date`, `new_time` |
| `update_name` | Set patient/lead name | `name` |
| `request_human` | Flag for staff review | `reason` |
| `get_available_slots` | Check calendar | `date` |

#### System Prompt Structure
```
1. Identity (Luxe, Dental Assistant)
2. Clinic Info (Name, Address, Services)
3. Business Hours
4. Services with Prices
5. [MY CONFIRMED APPOINTMENTS] - Dynamic injection
6. [LAST_CANCELLATION_REASON] - Dynamic injection
7. Chain of Thought Instructions
8. Tool Definitions
9. Objection Handling Scripts
10. Safety Guardrails
```

#### Guardrails
- Never book outside business hours
- Never proceed without patient name
- Never provide medical advice
- Always verify date logic (no Feb 30)
- Human handoff on: "emergencia", "dolor intenso", "hablar con humano"

### 4.5 Financial Management

**Status**: `[ ]`

#### Requirements
- [ ] Transaction recording (income/expense/payment/charge)
- [ ] Dashboard with P&L chart
- [ ] Month-over-month comparison
- [ ] Patient financial history
- [ ] Revenue forecast RPC

#### Transaction Types
| Type | Description | Amount Sign |
|------|-------------|-------------|
| income | General revenue | + |
| expense | Business expense | - |
| payment | Patient payment received | + |
| charge | Patient balance due | Record only |

### 4.6 Inventory Management

**Status**: `[ ]`

#### Requirements
- [ ] Item CRUD with SKU
- [ ] Stock level tracking
- [ ] Low stock alerts (below `min_stock_level`)
- [ ] Category filtering

### 4.7 Marketing Automation

**Status**: `[ ]`

#### Cron: smart-monitor (Every 1 min)
- [ ] Auto-cancel no-shows (15 min grace after time + duration)
- [ ] 24h reminder (if not already sent)
- [ ] 1h reminder (if not already sent)
- [ ] High-risk alerts (patients with >70% no-show score)

#### Cron: marketing (Daily at 9 AM)
- [ ] Lost lead reactivation (7+ days inactive)
- [ ] Dormant patient outreach (6+ months since last visit)
- [ ] Post-appointment NPS request (24h after completed)

### 4.8 Settings

**Status**: `[ ]`

#### Requirements
- [ ] Organization profile edit
- [ ] Service catalog management
- [ ] Staff management (invite/remove)
- [ ] AI pause toggle (organization-wide)

### 4.9 Dashboard

**Status**: `[ ]`

#### Widgets
- [ ] Today's appointments (count + list)
- [ ] Pending confirmations
- [ ] Recent activity feed
- [ ] Revenue this month vs last month
- [ ] Upcoming reminders queue
- [ ] Unread WhatsApp messages

---

## 5. Design System

### 5.1 Color Tokens
```css
:root {
  /* Core Luxury Palette */
  --luxury-gold: #D4AF37;
  --luxury-gold-light: #F5E6C8;
  --luxury-dark: #1A1A2E;
  --luxury-darker: #0F0F1A;
  --luxury-card: #16213E;
  
  /* Semantic */
  --luxury-success: #2ECC71;
  --luxury-warning: #F39C12;
  --luxury-danger: #E74C3C;
  --luxury-info: #4A90A4;
  
  /* Text */
  --text-primary: #FFFFFF;
  --text-secondary: #A0AEC0;
  --text-muted: #718096;
}
```

### 5.2 Typography
- **Headers**: System serif, slight letter-spacing (0.5px)
- **Body**: Inter or system sans-serif
- **Data/Numbers**: Mono font for alignment
- **Sizes**: 12px, 14px, 16px, 20px, 24px, 32px, 48px

### 5.3 Component Styles

#### Buttons
- **Primary**: Gold gradient background, dark text
- **Secondary**: Ghost with gold border
- **Danger**: Red background, white text
- **Disabled**: 50% opacity

#### Cards
- Dark background with subtle border
- Gold highlight on hover
- Consistent 16px padding

#### Forms
- Dark inputs with gold focus ring
- Inline validation messages
- Floating labels (optional)

### 5.4 Animation Guidelines
- **Page transitions**: 300ms fade with y-translate
- **Hover effects**: 200ms ease-out
- **Loading states**: Skeleton pulse animation
- **Micro-interactions**: Scale on press (0.98)

---

## 6. Development Roadmap

### Phase 0: Foundation
**Duration**: 2 days  
**Status**: `[x]`

- [x] Initialize Next.js 16 project
- [x] Configure TypeScript strict mode
- [x] Set up Tailwind with design tokens
- [x] Create Supabase project
- [x] Implement Supabase clients (SSR + Browser)
- [x] Build core UI primitives (Button, Input, Card, Modal, Dialog)
- [x] Create this PRD_ROADMAP.md
- [x] Set up database folder structure

### Phase 1: Core Data
**Duration**: 3 days  
**Status**: `[x]`

- [x] Design complete database schema
- [x] Implement all tables with constraints
- [x] Add all indexes
- [x] Write RLS policies
- [x] Create helper functions (update_updated_at, etc.)
- [x] Implement Organizations CRUD
- [x] Implement Admin Users management
- [x] Implement Patients CRUD
- [x] Implement Services catalog
- [x] Write TypeScript types matching DB

### Phase 2: Calendar & Appointments
**Duration**: 3 days  
**Status**: `[x]`

- [x] Build Calendar component (week view)
- [x] Build time slot picker
- [x] Implement appointment creation
- [x] Add conflict detection (DB constraint)
- [x] Implement status transitions
- [x] Add appointment editing
- [x] Add appointment cancellation
- [x] Build appointment list view

### Phase 3: The Brain
**Duration**: 6 days  
**Status**: `[ ]`

- [ ] Create WhatsApp webhook endpoint
- [ ] Verify Meta webhook
- [ ] Implement message ingestion
- [ ] Set up DeepSeek client
- [ ] Implement streaming response
- [ ] Build Whisper transcription
- [ ] Create Lead vs Patient router
- [ ] Implement all AI tools
- [ ] Build Chain of Thought loop
- [ ] Implement self-healing JSON
- [ ] Add context injection system
- [ ] Create conversation summary system
- [ ] Write QA test harness

### Phase 4: Business Intelligence
**Duration**: 3 days  
**Status**: `[ ]`

- [ ] Create transactions table
- [ ] Build transaction recording
- [ ] Create financial dashboard
- [ ] Build revenue charts
- [ ] Implement no-show prediction RPC
- [ ] Implement revenue forecast RPC
- [ ] Add patient financial tab

### Phase 5: Marketing Automation
**Duration**: 3 days  
**Status**: `[ ]`

- [ ] Create drip_campaigns table
- [ ] Create campaign_sends table
- [ ] Create patient_feedback table
- [ ] Implement smart-monitor cron
  - [ ] Auto-cancel logic
  - [ ] Reminder logic
  - [ ] Risk alert logic
- [ ] Implement marketing cron
  - [ ] Reactivation logic
  - [ ] NPS request logic
- [ ] Add campaign tracking

### Phase 6: Polish & Hardening
**Duration**: 5 days  
**Status**: `[ ]`

- [ ] Add Error Boundaries to all routes
- [ ] Create Empty State components
- [ ] Add Skeleton loaders everywhere
- [ ] Implement rate limiting
- [ ] Audit RLS policies
- [ ] Test edge cases
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Mobile responsiveness
- [ ] Documentation review

---

## 7. Security Requirements

### 7.1 Database Security
- [ ] RLS enabled on ALL tables
- [ ] All functions use `SET search_path = 'public'`
- [ ] Extensions in `extensions` schema
- [ ] `auth.uid()` wrapped in subquery for performance

### 7.2 Application Security
- [ ] Zod validation on ALL server action inputs
- [ ] CSRF protection via Server Actions
- [ ] Rate limiting on public endpoints
- [ ] Secure headers (via next.config.ts)

### 7.3 AI Security
- [ ] Medical info extraction via secondary pass only
- [ ] Explicit off-topic deflection
- [ ] Human handoff on critical keywords
- [ ] No medical advice policy

---

## 8. Changelog

| Date | Author | Change |
|------|--------|--------|
| YYYY-MM-DD | [Name] | Initial PRD_ROADMAP.md creation |
| | | |
| | | |

---

## 9. Lessons Learned (From v1.0)

### Architecture
1. **Schema-first, always**: Design complete schema before coding
2. **Modular SQL files**: Never put everything in one file
3. **Single source of truth**: This document prevents drift

### AI Brain
1. **Chain of Thought is essential**: Prevents hallucinations
2. **Self-healing JSON works**: Retry loop catches LLM mistakes
3. **Identity gate first**: Never proceed without name

### Performance
1. **Subquery auth.uid()**: Massive RLS performance gain
2. **Index all FKs**: JOINs need indexes
3. **Unified RLS policies**: Reduces evaluation overhead

### UX
1. **Empty states matter**: Users get confused by blank pages
2. **Skeletons > spinners**: Feels faster
3. **Error boundaries catch failures**: No white screens

---

## 10. Glossary

| Term | Definition |
|------|------------|
| **Luxe** | The AI assistant persona |
| **Lead** | A contact who has messaged but not booked |
| **Organization** | A tenant (dental clinic) in the system |
| **RLS** | Row Level Security (Postgres feature) |
| **CoT** | Chain of Thought (AI reasoning pattern) |
| **NPS** | Net Promoter Score (0-10 satisfaction) |
| **Drip Campaign** | Automated message sequence |
| **Passive Revenue** | Revenue without human intervention |

---

*Document maintained by AI agents. Last human review: Never*
