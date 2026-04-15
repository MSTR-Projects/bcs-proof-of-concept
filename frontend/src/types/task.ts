export type TaskType = 'comparison' | 'pattern' | 'validation';
export type BuildingBlock = 'vergelijking' | 'validatie' | 'vertaling';

export type ComparisonRule = 'exact' | 'percentage' | 'fuzzy' | 'exists';

export interface Field {
  id: string;
  name: string;
  source: 'left' | 'right' | 'single';
  type?: string;
}

export interface FieldMapping {
  id: string;
  leftFieldId: string;
  rightFieldId: string;
  rule: ComparisonRule;
  tolerance?: number;
}

export interface TaskRun {
  id: string;
  runAt: Date;
  totalRows: number;
  deviations: number;
  status: 'success' | 'warning' | 'error';
}

export interface Deviation {
  id: string;
  identifier: string;
  fieldName: string;
  leftValue: string;
  rightValue: string;
  rule: ComparisonRule;
}

// Rapport definitie voor multi-rapport templates
export interface ReportSlot {
  id: string;
  name: string;
  isRequired: boolean;
}

// Preset configuraties
export interface TemplatePreset {
  id: string;
  name: string;
  reports: ReportSlot[];
}

// Template
export interface Template {
  id: string;
  name: string;
  description?: string;
  type: TaskType;
  buildingBlock?: BuildingBlock;
  fields: Field[];
  mappings: FieldMapping[];
  createdAt: Date;
  lastUsed?: Date;
  isShared: boolean;
  createdBy?: string;
  teamId: string;
  estimatedMinutes?: number;
  reports?: ReportSlot[];
  leftDocumentLabel?: string;
  rightDocumentLabel?: string;
  singleDocumentLabel?: string;
}

// Klant
export interface Client {
  id: string;
  name: string;
  createdAt: Date;
  teamId: string;
  medewerkerCount?: number;
}

// Controleur
export interface Controleur {
  id: string;
  name: string;
  teamId: string;
}

// Controle run
export interface ControlRun {
  id: string;
  templateId: string;
  templateName: string;
  clientId: string;
  clientName: string;
  controleurId?: string;
  controleurName?: string;
  runAt: Date;
  totalRows: number;
  deviations: Deviation[];
  status: 'success' | 'warning' | 'error' | 'review';
  teamId: string;
  bevindingen?: number; // Number of generated remarks
}

// Vertaalregel
export interface TranslationRule {
  id: string;
  code: string;
  rapport: string;
  teamId: string;
  teamName: string;
  translation: string;
  lastModified: Date;
}

// Team
export interface TeamMember {
  id: string;
  email: string;
  status: "active" | "invited";
  addedAt: string;
}

export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  klantIds: string[];
}

export interface TaskResult {
  taskId: string;
  taskName: string;
  clientName: string;
  runAt: Date;
  totalRows: number;
  deviations: Deviation[];
  status: 'success' | 'warning' | 'error' | 'review';
}

// Legacy
export interface Task {
  id: string;
  name: string;
  description?: string;
  type: TaskType;
  fields: Field[];
  mappings: FieldMapping[];
  createdAt: Date;
  lastRun?: TaskRun;
  isShared: boolean;
  createdBy?: string;
  team?: string;
}
