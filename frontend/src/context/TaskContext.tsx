import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Template, ControlRun, Team, TaskResult, Deviation, TaskType, TranslationRule } from '@/types/task';
import {
  defaultTeams,
  controleurs,
  sampleTemplates,
  sampleControlRuns,
  translationRules,
} from '@/data/demo-data';

interface TaskContextType {
  // Team state
  teams: Team[];
  currentTeamId: string;
  setCurrentTeamId: (teamId: string) => void;
  currentTeam: Team | undefined;

  // Team member management
  addTeamMember: (email: string) => void;
  removeTeamMember: (memberId: string) => void;

  // Team-klant management
  addKlantToTeam: (klantId: string) => void;
  removeKlantFromTeam: (klantId: string) => void;
  getTeamsForKlant: (klantId: string) => Team[];
  
  // Templates
  templates: Template[];
  addTemplate: (template: Omit<Template, 'id' | 'createdAt' | 'teamId'>) => Template;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;
  getTeamTemplates: () => Template[];
  getSharedTemplates: () => Template[];
  getAllTemplates: () => Template[];
  
  // Control runs
  controlRuns: ControlRun[];
  runControl: (templateId: string, clientId: string) => Promise<TaskResult>;
  getTeamControlRuns: () => ControlRun[];
  getAllControlRuns: () => ControlRun[];
  getControlRunById: (id: string) => ControlRun | undefined;
  
  // Translation rules
  translationRules: TranslationRule[];

  // Current user
  currentUser: string;
  
  // Current result
  currentResult: TaskResult | null;
  setCurrentResult: (result: TaskResult | null) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState<Team[]>(defaultTeams);
  const [currentTeamId, setCurrentTeamId] = useState<string>('polaris');
  const [templates, setTemplates] = useState<Template[]>(sampleTemplates);
  const [controlRuns, setControlRuns] = useState<ControlRun[]>(sampleControlRuns);
  const [rules] = useState<TranslationRule[]>(translationRules);
  const [currentResult, setCurrentResult] = useState<TaskResult | null>(null);
  const currentUser = 'Nikki';

  const currentTeam = teams.find(t => t.id === currentTeamId);

  // Team member management
  const addTeamMember = (email: string) => {
    setTeams(prev => prev.map(t =>
      t.id === currentTeamId
        ? {
            ...t,
            members: [
              ...t.members,
              {
                id: `mem-${Date.now()}`,
                email,
                status: 'invited' as const,
                addedAt: new Date().toISOString().split('T')[0],
              },
            ],
          }
        : t
    ));
  };

  const removeTeamMember = (memberId: string) => {
    setTeams(prev => prev.map(t =>
      t.id === currentTeamId
        ? { ...t, members: t.members.filter(m => m.id !== memberId) }
        : t
    ));
  };

  // Team-klant management
  const addKlantToTeam = (klantId: string) => {
    setTeams(prev => prev.map(t =>
      t.id === currentTeamId && !t.klantIds.includes(klantId)
        ? { ...t, klantIds: [...t.klantIds, klantId] }
        : t
    ));
  };

  const removeKlantFromTeam = (klantId: string) => {
    setTeams(prev => prev.map(t =>
      t.id === currentTeamId
        ? { ...t, klantIds: t.klantIds.filter(id => id !== klantId) }
        : t
    ));
  };

  const getTeamsForKlant = (klantId: string) => {
    return teams.filter(t => t.klantIds.includes(klantId));
  };

  // Templates
  const getTeamTemplates = () => templates.filter(t => t.teamId === currentTeamId);
  const getSharedTemplates = () => templates.filter(t => t.isShared && t.teamId !== currentTeamId);
  const getAllTemplates = () => templates;

  const addTemplate = (templateData: Omit<Template, 'id' | 'createdAt' | 'teamId'>): Template => {
    const newTemplate: Template = {
      ...templateData,
      id: `template-${Date.now()}`,
      createdAt: new Date(),
      teamId: currentTeamId,
    };
    setTemplates(prev => [...prev, newTemplate]);
    return newTemplate;
  };

  const updateTemplate = (id: string, updates: Partial<Template>) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  // Control runs
  const getTeamControlRuns = () => controlRuns
    .filter(r => r.teamId === currentTeamId)
    .sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime());
  const getAllControlRuns = () => controlRuns
    .sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime());
  const getControlRunById = (id: string) => controlRuns.find(r => r.id === id);

  const runControl = async (templateId: string, clientId: string): Promise<TaskResult> => {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const template = templates.find(t => t.id === templateId);

    if (!template) throw new Error('Template not found');

    const totalRows = Math.floor(Math.random() * 100) + 30;
    const deviationCount = Math.floor(Math.random() * 5);
    
    const sampleDeviations: Deviation[] = [];
    const names = ['M. Bakker', 'P. Jansen', 'K. de Vries', 'A. Smit', 'L. Pietersen'];
    const fields = ['Uren per week', 'Bruto salaris', 'Startdatum', 'Afdeling', 'Functie'];

    for (let i = 0; i < deviationCount; i++) {
      sampleDeviations.push({
        id: `dev-${Date.now()}-${i}`,
        identifier: names[i % names.length],
        fieldName: fields[i % fields.length],
        leftValue: `€${(Math.random() * 5000 + 2000).toFixed(2)}`,
        rightValue: `€${(Math.random() * 5000 + 2000).toFixed(2)}`,
        rule: 'exact',
      });
    }

    const teamControleur = controleurs.find(c => c.teamId === currentTeamId);

    const newRun: ControlRun = {
      id: `run-${Date.now()}`,
      templateId,
      templateName: template.name,
      clientId,
      clientName: '',
      controleurId: teamControleur?.id,
      controleurName: teamControleur?.name || currentUser,
      runAt: new Date(),
      totalRows,
      deviations: sampleDeviations,
      status: deviationCount === 0 ? 'success' : deviationCount > 3 ? 'error' : 'warning',
      teamId: currentTeamId,
      bevindingen: deviationCount,
    };

    setControlRuns(prev => [newRun, ...prev]);
    updateTemplate(templateId, { lastUsed: new Date() });

    const result: TaskResult = {
      taskId: newRun.id,
      taskName: template.name,
      clientName: '',
      runAt: newRun.runAt,
      totalRows: newRun.totalRows,
      deviations: newRun.deviations,
      status: newRun.status,
    };

    setCurrentResult(result);
    return result;
  };

  return (
    <TaskContext.Provider value={{
      teams,
      currentTeamId,
      setCurrentTeamId,
      addTeamMember,
      removeTeamMember,
      addKlantToTeam,
      removeKlantFromTeam,
      getTeamsForKlant,
      currentTeam,
      templates,
      addTemplate,
      updateTemplate,
      deleteTemplate,
      getTeamTemplates,
      getSharedTemplates,
      getAllTemplates,
      controlRuns,
      runControl,
      getTeamControlRuns,
      getAllControlRuns,
      getControlRunById,
      translationRules: rules,
      currentUser,
      currentResult,
      setCurrentResult,
    }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
}
