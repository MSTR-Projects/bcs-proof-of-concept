# Team Page Design

## Overview

Add a "Team" page to manage the currently selected team — invite members by email and assign/unassign klanten. The team-klanten relationship is many-to-many (a team can have multiple klanten, a klant can belong to multiple teams). All data is mock (frontend-only, no backend changes).

## Navigation

- New sidebar item: **Team** (Lucide `Users` icon)
- Placed directly under the team selector dropdown, above Dashboard
- Route: `/team`
- Contextual to the selected team — switching teams in the dropdown changes what the Team page displays

## Team Page

Route: `/team`

Two tabs: **Leden** and **Klanten**.

### Leden Tab

Manages team members and invitations.

**Layout:**
- Page header: team name + "Lid uitnodigen" button
- Clicking "Lid uitnodigen" opens an inline form or dialog with an email input and "Uitnodigen" button
- Below: member table

**Member table columns:**
| Column | Content |
|--------|---------|
| Naam/Email | Email address of the member |
| Status | Badge — "Actief" (green) or "Uitgenodigd" (yellow) |
| Toegevoegd op | Date string |
| Acties | Remove button (trash icon) |

**Behavior:**
- Submitting an email adds a new entry with status "invited" and current date
- No actual email is sent — purely UI mock
- Removing a member removes them from the list (with confirmation dialog)
- Demo data: 2-3 hardcoded members per team in TaskContext

### Klanten Tab

Manages which klanten are assigned to this team.

**Layout:**
- List/table of klanten currently assigned to this team
- Each row shows klant name + "Ontkoppelen" (unlink) button
- "Klant toevoegen" button at top

**"Klant toevoegen" dialog:**
- Opens a dialog with a searchable list of all existing klanten (fetched from `listKlanten()` API)
- Klanten already assigned to this team are shown as disabled/checked
- Selecting one or more klanten and confirming adds them to the team
- Multi-select with search filter

**Behavior:**
- Unlinking removes the klant-team association (with confirmation)
- The klant itself is not deleted, only the link

## Klanten Page Changes

On the existing Klanten page (`/klanten`), when a klant is selected in the detail panel:

- Add a "Teams" section showing which teams this klant belongs to
- Display as a tag/chip list of team names
- Each tag has an "X" button to remove the association
- A "+" button to add the klant to another team (opens a small team selector)

This provides the "both directions" management of the many-to-many relationship.

## Data Model

Extend existing types in `TaskContext`:

```typescript
interface TeamMember {
  id: string;
  email: string;
  status: "active" | "invited";
  addedAt: string;
}
```

Extend the existing `Team` interface:

```typescript
interface Team {
  // ...existing fields (id, name, etc.)
  members: TeamMember[];
  klantIds: string[];  // IDs of klanten assigned to this team
}
```

## State Management

- All state lives in `TaskContext` (extends existing demo data)
- No backend API changes
- No localStorage persistence — state resets on refresh (acceptable for mock)
- Switching teams via the dropdown changes which members/klantIds are displayed

## Demo Data

Each of the 5 existing teams gets:
- 2-3 hardcoded members with "active" status
- 1-2 klantIds referencing existing klanten (if any exist)

The logged-in user (`admin@bcs-hr.nl`) should appear as an active member in all teams.

## UI Components

Uses existing shadcn/ui components:
- `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` for the two-tab layout
- `Table` for member list and klanten list
- `Dialog` for invite form and klant selector
- `Badge` for status indicators
- `Input` for email and search fields
- `Button` for actions
- `Card` for page sections

## Out of Scope

- Actual email sending
- Backend persistence
- Role-based permissions
- Team creation/deletion (managed via existing team selector)
- User authentication changes
