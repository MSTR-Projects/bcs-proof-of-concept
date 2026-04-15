import { Template, Client, ControlRun, Team, TeamMember, Controleur, TranslationRule } from '@/types/task';

// Teams
export const defaultTeams: Team[] = [
  {
    id: 'polaris',
    name: 'Polaris',
    members: [
      { id: 'mem-1', email: 'admin@bcs-hr.nl', status: 'active', addedAt: '2025-06-01' },
      { id: 'mem-2', email: 'nikki@bcs-hr.nl', status: 'active', addedAt: '2025-06-01' },
      { id: 'mem-3', email: 'sanne@bcs-hr.nl', status: 'active', addedAt: '2025-08-12' },
    ],
    klantIds: [],
  },
  {
    id: 'delta',
    name: 'Delta',
    members: [
      { id: 'mem-4', email: 'admin@bcs-hr.nl', status: 'active', addedAt: '2025-06-01' },
      { id: 'mem-5', email: 'wouter@bcs-hr.nl', status: 'active', addedAt: '2025-07-10' },
    ],
    klantIds: [],
  },
  {
    id: 'hr-essentials',
    name: 'HR Essentials',
    members: [
      { id: 'mem-6', email: 'admin@bcs-hr.nl', status: 'active', addedAt: '2025-06-01' },
      { id: 'mem-7', email: 'mirella@bcs-hr.nl', status: 'active', addedAt: '2025-06-15' },
    ],
    klantIds: [],
  },
  {
    id: 'hr-enterprise',
    name: 'Enterprise',
    members: [
      { id: 'mem-8', email: 'admin@bcs-hr.nl', status: 'active', addedAt: '2025-06-01' },
      { id: 'mem-9', email: 'esther@bcs-hr.nl', status: 'active', addedAt: '2025-09-01' },
    ],
    klantIds: [],
  },
  {
    id: 'cloudpay',
    name: 'CloudPay',
    members: [
      { id: 'mem-10', email: 'admin@bcs-hr.nl', status: 'active', addedAt: '2025-06-01' },
      { id: 'mem-11', email: 'jan@bcs-hr.nl', status: 'invited', addedAt: '2026-04-10' },
    ],
    klantIds: [],
  },
];

// Controleurs
export const controleurs: Controleur[] = [
  { id: 'ctrl-1', name: 'Nikki van der Heijden', teamId: 'polaris' },
  { id: 'ctrl-2', name: 'Sanne de Vries', teamId: 'polaris' },
  { id: 'ctrl-3', name: 'Wouter Bakker', teamId: 'delta' },
  { id: 'ctrl-4', name: 'Mirella Koster', teamId: 'hr-essentials' },
  { id: 'ctrl-5', name: 'Esther Pot', teamId: 'hr-enterprise' },
];

// Templates
export const sampleTemplates: Template[] = [
  // === Polaris ===
  {
    id: 'pol-maand',
    name: 'Polaris Maandcontrole',
    description: 'Maandelijkse looncontrole voor Polaris-klanten. Controleert 7 rapporten en genereert een terugkoppelbestand.',
    type: 'pattern',
    buildingBlock: 'vertaling',
    fields: [],
    mappings: [],
    createdAt: new Date('2025-06-01'),
    lastUsed: new Date('2026-02-14'),
    isShared: true,
    createdBy: 'Team Polaris',
    teamId: 'polaris',
    estimatedMinutes: 15,
    reports: [
      { id: 'r1', name: 'Verwerkingssignalen', isRequired: true },
      { id: 'r2', name: 'Loonaangifte', isRequired: true },
      { id: 'r3', name: 'TWK', isRequired: true },
      { id: 'r4', name: 'In-dienst', isRequired: true },
      { id: 'r5', name: 'Uit-dienst', isRequired: true },
      { id: 'r6', name: 'Betalingen', isRequired: true },
      { id: 'r7', name: 'Reserveringen', isRequired: true },
    ],
  },
  {
    id: 'pol-kwartaal',
    name: 'Polaris Kwartaalcheck',
    description: 'Kwartaalcontrole met 3 rapporten voor periodieke review.',
    type: 'pattern',
    buildingBlock: 'vertaling',
    fields: [],
    mappings: [],
    createdAt: new Date('2025-06-15'),
    lastUsed: new Date('2026-01-15'),
    isShared: true,
    createdBy: 'Team Polaris',
    teamId: 'polaris',
    estimatedMinutes: 8,
    reports: [
      { id: 'r1', name: 'Kwartaaloverzicht', isRequired: true },
      { id: 'r2', name: 'Cumulatieven', isRequired: true },
      { id: 'r3', name: 'Jaaropgave', isRequired: false },
    ],
  },

  // === Delta ===
  {
    id: 'delta-impl',
    name: 'Delta Implementatiecheck',
    description: 'Vergelijkt het implementatieplan met de systeeminrichting bij nieuwe klanten.',
    type: 'comparison',
    buildingBlock: 'vergelijking',
    fields: [
      { id: 'l1', name: 'Bedrijfsnaam', source: 'left', type: 'text' },
      { id: 'l2', name: 'Loonheffingsnummer', source: 'left', type: 'text' },
      { id: 'l3', name: 'Sector', source: 'left', type: 'text' },
      { id: 'l4', name: 'Risicopremie Whk', source: 'left', type: 'text' },
      { id: 'l5', name: 'CAO', source: 'left', type: 'text' },
      { id: 'l6', name: 'Loontijdvak', source: 'left', type: 'text' },
      { id: 'l7', name: 'Pensioenfonds', source: 'left', type: 'text' },
      { id: 'l8', name: 'Franchise pensioen', source: 'left', type: 'text' },
      { id: 'l9', name: 'WG bijdrage pensioen', source: 'left', type: 'text' },
      { id: 'l10', name: 'Eindheffing WKR', source: 'left', type: 'text' },
      { id: 'r1', name: 'Bedrijfsnaam', source: 'right', type: 'text' },
      { id: 'r2', name: 'Loonheffingsnummer', source: 'right', type: 'text' },
      { id: 'r3', name: 'Sector', source: 'right', type: 'text' },
      { id: 'r4', name: 'Risicopremie Whk', source: 'right', type: 'text' },
      { id: 'r5', name: 'CAO', source: 'right', type: 'text' },
      { id: 'r6', name: 'Loontijdvak', source: 'right', type: 'text' },
      { id: 'r7', name: 'Pensioenfonds', source: 'right', type: 'text' },
      { id: 'r8', name: 'Franchise pensioen', source: 'right', type: 'text' },
      { id: 'r9', name: 'WG bijdrage pensioen', source: 'right', type: 'text' },
      { id: 'r10', name: 'Eindheffing WKR', source: 'right', type: 'text' },
    ],
    mappings: [],
    createdAt: new Date('2025-01-15'),
    lastUsed: new Date('2026-02-13'),
    isShared: true,
    createdBy: 'Team Delta',
    teamId: 'delta',
    estimatedMinutes: 10,
    leftDocumentLabel: 'Implementatieplan',
    rightDocumentLabel: 'Systeeminrichting HRP',
  },
  {
    id: 'delta-maand',
    name: 'Delta Maandcontrole',
    description: 'Maandelijkse controle met vergelijking en vertaling.',
    type: 'comparison',
    buildingBlock: 'vergelijking',
    fields: [],
    mappings: [],
    createdAt: new Date('2025-03-01'),
    lastUsed: new Date('2026-02-10'),
    isShared: true,
    createdBy: 'Team Delta',
    teamId: 'delta',
    estimatedMinutes: 12,
    reports: [
      { id: 'r1', name: 'Mutatielijst', isRequired: true },
      { id: 'r2', name: 'Systeemexport', isRequired: true },
      { id: 'r3', name: 'Signaleringen', isRequired: false },
    ],
    leftDocumentLabel: 'Mutatielijst',
    rightDocumentLabel: 'Systeemexport',
  },

  // === HR Essentials ===
  {
    id: 'hre-pensioen',
    name: 'Pensioencheck',
    description: 'Controleert of pensioenberekeningen correct zijn doorgevoerd op basis van fondscijfers en rekenregels.',
    type: 'validation',
    buildingBlock: 'validatie',
    fields: [
      { id: 'p1', name: 'Pensioenfonds', source: 'single', type: 'text' },
      { id: 'p2', name: 'Franchise', source: 'single', type: 'currency' },
      { id: 'p3', name: 'WN percentage', source: 'single', type: 'number' },
      { id: 'p4', name: 'Grondslag', source: 'single', type: 'text' },
      { id: 'p5', name: 'Max pensioengevend loon', source: 'single', type: 'currency' },
    ],
    mappings: [],
    createdAt: new Date('2025-09-01'),
    lastUsed: new Date('2026-02-12'),
    isShared: true,
    createdBy: 'Team HR Essentials',
    teamId: 'hr-essentials',
    estimatedMinutes: 8,
    singleDocumentLabel: 'Loonstroken + Parameters',
  },
  {
    id: 'hre-maand',
    name: 'HR Essentials Maandcontrole',
    description: 'Maandelijkse controle met validatie en vertaling.',
    type: 'validation',
    buildingBlock: 'validatie',
    fields: [],
    mappings: [],
    createdAt: new Date('2025-09-15'),
    lastUsed: new Date('2026-02-10'),
    isShared: true,
    createdBy: 'Team HR Essentials',
    teamId: 'hr-essentials',
    estimatedMinutes: 10,
    reports: [
      { id: 'r1', name: 'Loonstroken', isRequired: true },
      { id: 'r2', name: 'Signaleringen', isRequired: true },
    ],
  },

  // === Enterprise ===
  {
    id: 'ent-loonstrook',
    name: 'Loonstrookcheck',
    description: 'Vergelijkt loonstroken met het salarissysteem.',
    type: 'comparison',
    buildingBlock: 'vergelijking',
    fields: [],
    mappings: [],
    createdAt: new Date('2025-01-05'),
    lastUsed: new Date('2026-02-11'),
    isShared: true,
    createdBy: 'Team Enterprise',
    teamId: 'hr-enterprise',
    estimatedMinutes: 5,
    leftDocumentLabel: 'Loonstroken',
    rightDocumentLabel: 'Salarissysteem export',
  },
];

// Klanten (8 uit mega-prompt)
export const sampleClients: Client[] = [
  { id: 'cl-1', name: 'Bakkerij de Gouden Korst', createdAt: new Date('2024-01-10'), teamId: 'polaris', medewerkerCount: 34 },
  { id: 'cl-2', name: 'Sportschool FitFlex', createdAt: new Date('2024-02-15'), teamId: 'polaris', medewerkerCount: 22 },
  { id: 'cl-3', name: 'Installatiebedrijf Jansen & Zn.', createdAt: new Date('2024-03-20'), teamId: 'delta', medewerkerCount: 87 },
  { id: 'cl-4', name: 'Advocatenkantoor Vermeer', createdAt: new Date('2024-04-05'), teamId: 'hr-essentials', medewerkerCount: 12 },
  { id: 'cl-5', name: 'Transportbedrijf Van Dijk', createdAt: new Date('2024-05-12'), teamId: 'hr-enterprise', medewerkerCount: 156 },
  { id: 'cl-6', name: 'Supermarkt Groot & Vers', createdAt: new Date('2024-06-01'), teamId: 'polaris', medewerkerCount: 48 },
  { id: 'cl-7', name: 'Horecabedrijf De Brug', createdAt: new Date('2024-07-15'), teamId: 'hr-essentials', medewerkerCount: 28 },
  { id: 'cl-8', name: 'Bouwbedrijf Sterk B.V.', createdAt: new Date('2024-08-20'), teamId: 'delta', medewerkerCount: 65 },
];

// Controle runs
export const sampleControlRuns: ControlRun[] = [
  // Polaris - Bakkerij de Gouden Korst
  {
    id: 'run-gk-maand-0214',
    templateId: 'pol-maand',
    templateName: 'Polaris Maandcontrole',
    clientId: 'cl-1',
    clientName: 'Bakkerij de Gouden Korst',
    controleurId: 'ctrl-1',
    controleurName: 'Nikki van der Heijden',
    runAt: new Date('2026-02-14T09:30:00'),
    totalRows: 34,
    deviations: [],
    status: 'success',
    teamId: 'polaris',
    bevindingen: 12,
  },
  {
    id: 'run-gk-maand-0114',
    templateId: 'pol-maand',
    templateName: 'Polaris Maandcontrole',
    clientId: 'cl-1',
    clientName: 'Bakkerij de Gouden Korst',
    controleurId: 'ctrl-1',
    controleurName: 'Nikki van der Heijden',
    runAt: new Date('2026-01-14T10:00:00'),
    totalRows: 34,
    deviations: [],
    status: 'success',
    teamId: 'polaris',
    bevindingen: 8,
  },

  // Polaris - Sportschool FitFlex
  {
    id: 'run-ff-maand-0214',
    templateId: 'pol-maand',
    templateName: 'Polaris Maandcontrole',
    clientId: 'cl-2',
    clientName: 'Sportschool FitFlex',
    controleurId: 'ctrl-2',
    controleurName: 'Sanne de Vries',
    runAt: new Date('2026-02-14T10:15:00'),
    totalRows: 22,
    deviations: [
      { id: 'd1', identifier: '20301', fieldName: 'BSN', leftValue: 'Ontbreekt', rightValue: 'Verplicht', rule: 'exact' },
    ],
    status: 'warning',
    teamId: 'polaris',
    bevindingen: 8,
  },

  // Polaris - Supermarkt Groot & Vers
  {
    id: 'run-gv-maand-0210',
    templateId: 'pol-maand',
    templateName: 'Polaris Maandcontrole',
    clientId: 'cl-6',
    clientName: 'Supermarkt Groot & Vers',
    controleurId: 'ctrl-1',
    controleurName: 'Nikki van der Heijden',
    runAt: new Date('2026-02-10T08:45:00'),
    totalRows: 48,
    deviations: [
      { id: 'd2', identifier: '30102', fieldName: 'Rooster', leftValue: '24u', rightValue: '32u contract', rule: 'exact' },
      { id: 'd3', identifier: '30118', fieldName: 'Adres', leftValue: 'Ontbreekt', rightValue: 'Verplicht', rule: 'exact' },
    ],
    status: 'warning',
    teamId: 'polaris',
    bevindingen: 7,
  },

  // Delta - Installatiebedrijf Jansen & Zn.
  {
    id: 'run-jz-impl',
    templateId: 'delta-impl',
    templateName: 'Delta Implementatiecheck',
    clientId: 'cl-3',
    clientName: 'Installatiebedrijf Jansen & Zn.',
    controleurId: 'ctrl-3',
    controleurName: 'Wouter Bakker',
    runAt: new Date('2026-02-13T14:00:00'),
    totalRows: 10,
    deviations: [
      { id: 'd4', identifier: 'Risicopremie Whk', fieldName: 'Risicopremie Whk', leftValue: '1,36%', rightValue: '1,52%', rule: 'exact' },
      { id: 'd5', identifier: 'Franchise pensioen', fieldName: 'Franchise pensioen', leftValue: '€16.322', rightValue: '€15.891', rule: 'exact' },
      { id: 'd6', identifier: 'Eindheffing WKR', fieldName: 'Eindheffing WKR', leftValue: '1,5% over €400.000', rightValue: 'Niet ingesteld', rule: 'exact' },
    ],
    status: 'success',
    teamId: 'delta',
    bevindingen: 3,
  },

  // Delta - Bouwbedrijf Sterk
  {
    id: 'run-bs-impl',
    templateId: 'delta-impl',
    templateName: 'Delta Implementatiecheck',
    clientId: 'cl-8',
    clientName: 'Bouwbedrijf Sterk B.V.',
    controleurId: 'ctrl-3',
    controleurName: 'Wouter Bakker',
    runAt: new Date('2026-02-05T10:30:00'),
    totalRows: 10,
    deviations: [
      { id: 'd7', identifier: 'CAO', fieldName: 'CAO', leftValue: 'Bouw & Infra', rightValue: 'Bouw & Infra 2025', rule: 'exact' },
    ],
    status: 'warning',
    teamId: 'delta',
    bevindingen: 1,
  },

  // HR Essentials - Advocatenkantoor Vermeer
  {
    id: 'run-av-pensioen',
    templateId: 'hre-pensioen',
    templateName: 'Pensioencheck',
    clientId: 'cl-4',
    clientName: 'Advocatenkantoor Vermeer',
    controleurId: 'ctrl-4',
    controleurName: 'Mirella Koster',
    runAt: new Date('2026-02-12T11:00:00'),
    totalRows: 5,
    deviations: [
      { id: 'd8', identifier: '1003 - S.M. Bakker-Li', fieldName: 'Pensioenbijdrage', leftValue: '€201,74', rightValue: '€186,40', rule: 'exact' },
      { id: 'd9', identifier: '1005 - A.F. Yilmaz', fieldName: 'Pensioenbijdrage', leftValue: '€294,14', rightValue: '€258,06', rule: 'exact' },
    ],
    status: 'review',
    teamId: 'hr-essentials',
    bevindingen: 2,
  },

  // HR Essentials - Horecabedrijf De Brug
  {
    id: 'run-db-maand',
    templateId: 'hre-maand',
    templateName: 'HR Essentials Maandcontrole',
    clientId: 'cl-7',
    clientName: 'Horecabedrijf De Brug',
    controleurId: 'ctrl-4',
    controleurName: 'Mirella Koster',
    runAt: new Date('2026-02-08T09:15:00'),
    totalRows: 28,
    deviations: [],
    status: 'success',
    teamId: 'hr-essentials',
    bevindingen: 0,
  },

  // Enterprise - Transportbedrijf Van Dijk
  {
    id: 'run-vd-loonstrook',
    templateId: 'ent-loonstrook',
    templateName: 'Loonstrookcheck',
    clientId: 'cl-5',
    clientName: 'Transportbedrijf Van Dijk',
    controleurId: 'ctrl-5',
    controleurName: 'Esther Pot',
    runAt: new Date('2026-02-11T09:00:00'),
    totalRows: 156,
    deviations: [],
    status: 'success',
    teamId: 'hr-enterprise',
    bevindingen: 0,
  },
];

// Vertaalregels voor de Regelbibliotheek — 42 regels: 28 Polaris, 8 Delta, 6 HR Essentials
export const translationRules: TranslationRule[] = [
  // === Polaris — Verwerkingssignalen (12) ===
  { id: 'rule-1', code: 'P0003', rapport: 'Verwerkingssignalen', teamId: 'polaris', teamName: 'Polaris', translation: 'Ingangsdatum functie ligt voor aanvang dienstverband. Graag corrigeren naar de juiste datum of bevestigen dat dit correct is.', lastModified: new Date('2026-02-03') },
  { id: 'rule-2', code: 'P0012', rapport: 'Verwerkingssignalen', teamId: 'polaris', teamName: 'Polaris', translation: 'Adresgegevens ontbreken. Graag het woonadres invoeren — dit is verplicht voor de loonaangifte.', lastModified: new Date('2026-02-03') },
  { id: 'rule-3', code: 'P0047', rapport: 'Verwerkingssignalen', teamId: 'polaris', teamName: 'Polaris', translation: 'Geboortedatum is niet ingevuld. Dit is een verplicht veld voor de Belastingdienst. Graag aanvullen.', lastModified: new Date('2026-02-03') },
  { id: 'rule-4', code: 'P0089', rapport: 'Verwerkingssignalen', teamId: 'polaris', teamName: 'Polaris', translation: 'Parttime percentage is gewijzigd maar contracturen zijn niet aangepast. Graag de contracturen bijwerken naar het nieuwe percentage, of bevestigen dat het huidige rooster klopt.', lastModified: new Date('2026-02-03') },
  { id: 'rule-5', code: 'P0102', rapport: 'Verwerkingssignalen', teamId: 'polaris', teamName: 'Polaris', translation: 'Loonheffingskorting is bij meerdere werkgevers actief. Graag controleren of dit correct is.', lastModified: new Date('2026-02-03') },
  { id: 'rule-6', code: 'P0118', rapport: 'Verwerkingssignalen', teamId: 'polaris', teamName: 'Polaris', translation: 'Bankrekeningnummer is gewijzigd. Graag bevestigen dat de wijziging geautoriseerd is.', lastModified: new Date('2026-02-03') },
  { id: 'rule-7', code: 'P0134', rapport: 'Verwerkingssignalen', teamId: 'polaris', teamName: 'Polaris', translation: 'Inhoudingsbedrag overschrijdt nettoloon. Controleer of alle inhoudingen correct zijn en of de medewerker akkoord is.', lastModified: new Date('2026-02-05') },
  { id: 'rule-8', code: 'P0156', rapport: 'Verwerkingssignalen', teamId: 'polaris', teamName: 'Polaris', translation: 'Bruto-netto traject bevat negatieve netto. Controleer of dit door nabetaling of correctie komt.', lastModified: new Date('2026-02-05') },
  { id: 'rule-9', code: 'P0201', rapport: 'Verwerkingssignalen', teamId: 'polaris', teamName: 'Polaris', translation: 'Wachtgeldregeling actief zonder einddatum. Graag einddatum invullen of bevestigen dat dit correct is.', lastModified: new Date('2026-02-05') },
  { id: 'rule-10', code: 'P0215', rapport: 'Verwerkingssignalen', teamId: 'polaris', teamName: 'Polaris', translation: 'Looncomponent zonder grondslag gekoppeld. Graag de grondslag controleren en aanvullen.', lastModified: new Date('2026-02-05') },
  { id: 'rule-11', code: 'P0278', rapport: 'Verwerkingssignalen', teamId: 'polaris', teamName: 'Polaris', translation: 'Eindejaarsuitkering wijkt af van CAO-tabel. Graag het percentage controleren.', lastModified: new Date('2026-02-08') },
  { id: 'rule-12', code: 'P0312', rapport: 'Verwerkingssignalen', teamId: 'polaris', teamName: 'Polaris', translation: 'Verlofregistratie is niet bijgewerkt na contractwijziging. Graag het verlofsaldo herberekenen.', lastModified: new Date('2026-02-08') },

  // === Polaris — Loonaangifte (4) ===
  { id: 'rule-13', code: 'BSN ontbreekt', rapport: 'Loonaangifte', teamId: 'polaris', teamName: 'Polaris', translation: 'BSN ontbreekt. Verplicht voor loonaangifte Belastingdienst. Graag aanvullen.', lastModified: new Date('2026-02-05') },
  { id: 'rule-14', code: 'Anoniementarief actief', rapport: 'Loonaangifte', teamId: 'polaris', teamName: 'Polaris', translation: 'Anoniementarief (52%) wordt toegepast. Controleer of identiteitsbewijs en BSN correct zijn geregistreerd.', lastModified: new Date('2026-02-05') },
  { id: 'rule-15', code: 'SV-loon negatief', rapport: 'Loonaangifte', teamId: 'polaris', teamName: 'Polaris', translation: 'SV-loon is negatief in deze periode. Controleer of dit door een correctie komt en of de aangifte juist is.', lastModified: new Date('2026-02-08') },
  { id: 'rule-16', code: 'Tabel bijz. beloning', rapport: 'Loonaangifte', teamId: 'polaris', teamName: 'Polaris', translation: 'Tabel bijzondere beloningen is toegepast. Graag controleren of dit correct is voor deze uitbetaling.', lastModified: new Date('2026-02-08') },

  // === Polaris — Reserveringen (2) ===
  { id: 'rule-17', code: 'Saldo ≠ 0 + UitDienst', rapport: 'Reserveringen', teamId: 'polaris', teamName: 'Polaris', translation: 'Medewerker is uit dienst per {DatumUitDienst} maar heeft nog een openstaand saldo van {Saldo} voor {Reservering}. Graag uitbetalen of bevestigen dat verrekening loopt.', lastModified: new Date('2026-02-05') },
  { id: 'rule-18', code: 'Reservering < 0', rapport: 'Reserveringen', teamId: 'polaris', teamName: 'Polaris', translation: 'Reserveringssaldo is negatief ({Saldo}). Controleer of dit door een nabetaling of correctie komt.', lastModified: new Date('2026-02-08') },

  // === Polaris — Betalingen (2) ===
  { id: 'rule-19', code: 'Kasbetaling', rapport: 'Betalingen', teamId: 'polaris', teamName: 'Polaris', translation: 'Kasbetaling gedetecteerd. Graag bevestigen dat dit correct en gewenst is.', lastModified: new Date('2026-02-05') },
  { id: 'rule-20', code: 'Dubbele betaling', rapport: 'Betalingen', teamId: 'polaris', teamName: 'Polaris', translation: 'Dubbele betaling gedetecteerd voor zelfde bedrag en periode. Graag controleren of dit bewust is.', lastModified: new Date('2026-02-10') },

  // === Polaris — In-dienst (4) ===
  { id: 'rule-21', code: 'Rooster ≠ Contract', rapport: 'In-dienst', teamId: 'polaris', teamName: 'Polaris', translation: 'Rooster ({rooster}u) wijkt af van contract ({contract}u). Graag aanpassen.', lastModified: new Date('2026-02-08') },
  { id: 'rule-22', code: 'Adrestype afwijking', rapport: 'In-dienst', teamId: 'polaris', teamName: 'Polaris', translation: 'Correspondentieadres wijkt af van woonadres. Graag controleren welk adres correct is.', lastModified: new Date('2026-02-08') },
  { id: 'rule-23', code: 'VG reservering ontbreekt', rapport: 'In-dienst', teamId: 'polaris', teamName: 'Polaris', translation: 'Vakantiegeldreservering is niet ingesteld. Dit is verplicht. Graag instellen.', lastModified: new Date('2026-02-08') },
  { id: 'rule-24', code: 'Proeftijd > 2 maanden', rapport: 'In-dienst', teamId: 'polaris', teamName: 'Polaris', translation: 'Proeftijd is langer dan 2 maanden ingesteld. Dit is niet toegestaan bij een contract voor bepaalde tijd. Graag aanpassen.', lastModified: new Date('2026-02-10') },

  // === Polaris — Uit-dienst (2) ===
  { id: 'rule-25', code: 'Openstaande VD', rapport: 'Uit-dienst', teamId: 'polaris', teamName: 'Polaris', translation: 'Medewerker heeft nog {aantal} openstaande vakantiedagen. Graag uitbetalen of bevestigen.', lastModified: new Date('2026-02-10') },
  { id: 'rule-26', code: 'Einddatum ontbreekt', rapport: 'Uit-dienst', teamId: 'polaris', teamName: 'Polaris', translation: 'Uit-dienst is gemeld maar einddatum ontbreekt in het systeem. Graag invullen.', lastModified: new Date('2026-02-10') },

  // === Polaris — TWK (2) ===
  { id: 'rule-27', code: 'TWK salaris', rapport: 'TWK', teamId: 'polaris', teamName: 'Polaris', translation: 'Salaris is met terugwerkende kracht gewijzigd. Graag bevestigen dat nabetaling correct is verwerkt.', lastModified: new Date('2026-02-10') },
  { id: 'rule-28', code: 'TWK parttime%', rapport: 'TWK', teamId: 'polaris', teamName: 'Polaris', translation: 'Parttime percentage is met terugwerkende kracht gewijzigd. Graag bevestigen dat herberekening correct is.', lastModified: new Date('2026-02-10') },

  // === Delta — Implementatie (8) ===
  { id: 'rule-29', code: 'Risicopremie ≠ match', rapport: 'Implementatie', teamId: 'delta', teamName: 'Delta', translation: 'Risicopremie wijkt af: plan {plan}%, systeem {systeem}%. Graag controleren en corrigeren.', lastModified: new Date('2026-02-08') },
  { id: 'rule-30', code: 'Franchise ≠ match', rapport: 'Implementatie', teamId: 'delta', teamName: 'Delta', translation: 'Franchise wijkt af: plan €{plan}, systeem €{systeem}. Graag controleren.', lastModified: new Date('2026-02-08') },
  { id: 'rule-31', code: 'CAO ≠ match', rapport: 'Implementatie', teamId: 'delta', teamName: 'Delta', translation: 'CAO-code in het systeem ({systeem}) komt niet overeen met de afgesproken CAO ({plan}). Graag corrigeren.', lastModified: new Date('2026-02-08') },
  { id: 'rule-32', code: 'Loontijdvak ≠ match', rapport: 'Implementatie', teamId: 'delta', teamName: 'Delta', translation: 'Loontijdvak wijkt af: plan {plan}, systeem {systeem}. Graag controleren en aanpassen.', lastModified: new Date('2026-02-10') },
  { id: 'rule-33', code: 'Sector ≠ match', rapport: 'Implementatie', teamId: 'delta', teamName: 'Delta', translation: 'Sectorcode wijkt af: plan {plan}, systeem {systeem}. Dit heeft gevolgen voor de premies. Graag corrigeren.', lastModified: new Date('2026-02-10') },
  { id: 'rule-34', code: 'WKR niet ingesteld', rapport: 'Implementatie', teamId: 'delta', teamName: 'Delta', translation: 'Eindheffing WKR is niet ingesteld in het systeem. Graag de werkkostenregeling configureren.', lastModified: new Date('2026-02-10') },
  { id: 'rule-35', code: 'Pensioenfonds ≠ match', rapport: 'Implementatie', teamId: 'delta', teamName: 'Delta', translation: 'Pensioenfonds wijkt af: plan {plan}, systeem {systeem}. Graag controleren.', lastModified: new Date('2026-02-12') },
  { id: 'rule-36', code: 'Werkgeversbijdrage ≠ match', rapport: 'Implementatie', teamId: 'delta', teamName: 'Delta', translation: 'Verdeling werkgeversbijdrage klopt niet: plan {plan}, systeem {systeem}. Graag corrigeren.', lastModified: new Date('2026-02-12') },

  // === HR Essentials — Pensioencheck (4) ===
  { id: 'rule-37', code: 'Pensioenbijdrage verschil > €1', rapport: 'Pensioencheck', teamId: 'hr-essentials', teamName: 'HR Ess.', translation: 'Pensioenbijdrage wijkt af: verwacht €{verwacht}, loonstrook €{werkelijk}. Mogelijke oorzaak: parttimefactor of franchise niet correct toegepast.', lastModified: new Date('2026-02-10') },
  { id: 'rule-38', code: 'Max pensioengrondslag', rapport: 'Pensioencheck', teamId: 'hr-essentials', teamName: 'HR Ess.', translation: 'Pensioengrondslag overschrijdt het fiscaal maximum van €{max}. Graag controleren of aftoppingsregeling correct is toegepast.', lastModified: new Date('2026-02-10') },
  { id: 'rule-39', code: 'PT-factor franchise', rapport: 'Pensioencheck', teamId: 'hr-essentials', teamName: 'HR Ess.', translation: 'Parttimefactor is niet toegepast op de franchise. Herbereken de pensioenbijdrage op basis van pro-rata franchise.', lastModified: new Date('2026-02-12') },
  { id: 'rule-40', code: 'Pensioen bij 0-uren', rapport: 'Pensioencheck', teamId: 'hr-essentials', teamName: 'HR Ess.', translation: 'Pensioenbijdrage is berekend terwijl medewerker 0 uren heeft gewerkt. Graag controleren of dit correct is.', lastModified: new Date('2026-02-12') },

  // === HR Essentials — Verlofcontrole (2) ===
  { id: 'rule-41', code: 'Wettelijk verlof > max', rapport: 'Verlofcontrole', teamId: 'hr-essentials', teamName: 'HR Ess.', translation: 'Wettelijk verlof overschrijdt het maximum op basis van contracturen. Graag het verlofsaldo controleren.', lastModified: new Date('2026-02-12') },
  { id: 'rule-42', code: 'Verlof niet opgebouwd', rapport: 'Verlofcontrole', teamId: 'hr-essentials', teamName: 'HR Ess.', translation: 'Verlofopbouw staat op 0 terwijl medewerker actief in dienst is. Graag de verlofregeling controleren.', lastModified: new Date('2026-02-12') },
];

// Demo resultaten voor specifieke controles

// Vergelijking data (Delta Implementatiecheck - Jansen & Zn.)
export const vergelijkingResultData = {
  clientName: 'Installatiebedrijf Jansen & Zn.',
  templateName: 'Delta Implementatiecheck',
  date: '13 februari 2026',
  controleur: 'Wouter Bakker',
  fields: [
    { veld: 'Bedrijfsnaam', plan: 'Jansen & Zn. Installaties B.V.', systeem: 'Jansen & Zn. Installaties B.V.', match: true },
    { veld: 'Loonheffingsnummer', plan: 'L0012345678', systeem: 'L0012345678', match: true },
    { veld: 'Sector', plan: '44 - Zakelijke dienstverlening', systeem: '44 - Zakelijke dienstverlening', match: true },
    { veld: 'Risicopremie Whk', plan: '1,36%', systeem: '1,52%', match: false },
    { veld: 'CAO', plan: 'Metaal & Techniek', systeem: 'Metaal & Techniek', match: true },
    { veld: 'Loontijdvak', plan: 'Maand', systeem: 'Maand', match: true },
    { veld: 'Pensioenfonds', plan: 'PMT', systeem: 'PMT', match: true },
    { veld: 'Franchise pensioen', plan: '€16.322', systeem: '€15.891', match: false },
    { veld: 'Werkgeversbijdrage pensioen', plan: '50% / 50%', systeem: '50% / 50%', match: true },
    { veld: 'Eindheffing WKR', plan: '1,5% over €400.000', systeem: 'Niet ingesteld', match: false },
  ],
};

// Validatie data (Pensioencheck - Advocatenkantoor Vermeer)
export const validatieResultData = {
  clientName: 'Advocatenkantoor Vermeer',
  templateName: 'Pensioencheck',
  date: '12 februari 2026',
  controleur: 'Mirella Koster',
  parameters: [
    { label: 'Pensioenfonds', value: 'ABP' },
    { label: 'Franchise', value: '€16.322' },
    { label: 'Werknemersbijdrage', value: '5,5%' },
    { label: 'Grondslag', value: 'SV-loon + Vakantiegeld' },
    { label: 'Max pensioengevend loon', value: '€128.810' },
  ],
  formule: 'Pensioenbijdrage = (Pensioengrondslag − €16.322) × 5,5%',
  medewerkers: [
    { nr: '1001', naam: 'mr. R. Vermeer', bruto: '€8.500', grondslag: '€8.925', verwacht: '€693,17', werkelijk: '€693,17', verschil: '€0,00', correct: true },
    { nr: '1002', naam: 'J.A. de Groot', bruto: '€4.200', grondslag: '€4.410', verwacht: '€224,84', werkelijk: '€224,84', verschil: '€0,00', correct: true },
    { nr: '1003', naam: 'S.M. Bakker-Li', bruto: '€3.800', grondslag: '€3.990', verwacht: '€201,74', werkelijk: '€186,40', verschil: '-€15,34', correct: false },
    { nr: '1004', naam: 'P.K. Hendriks', bruto: '€6.100', grondslag: '€6.405', verwacht: '€335,57', werkelijk: '€335,57', verschil: '€0,00', correct: true },
    { nr: '1005', naam: 'A.F. Yilmaz', bruto: '€5.400', grondslag: '€5.670', verwacht: '€294,14', werkelijk: '€258,06', verschil: '-€36,08', correct: false },
  ],
  detailExpand: {
    nr: '1003',
    naam: 'S.M. Bakker-Li',
    lines: [
      'Pensioengrondslag:  €3.990,00 (SV-loon €3.800 + VG 5%)',
      'Min franchise:      €16.322 / 12 = €1.360,17',
      'Grondslag:          €3.990,00 - €1.360,17 = €2.629,83',
      '× 5,5%:             €144,64',
      '',
      'Maar: parttimepercentage 60% → grondslag moet pro rata',
      'Herberekening:      (€3.990,00 - (€1.360,17 × 60%)) × 5,5% = €174,78',
      '',
      '⚠️ Op loonstrook staat: €186,40',
      'Mogelijke oorzaak: parttimefactor niet correct toegepast op franchise',
    ],
  },
};

// Vertaling data (Polaris Maandcontrole - Bakkerij de Gouden Korst)
export const vertalingResultData = {
  clientName: 'Bakkerij de Gouden Korst',
  templateName: 'Polaris Maandcontrole',
  date: '14 februari 2026',
  controleur: 'Nikki van der Heijden',
  tabs: [
    {
      name: 'Verwerkingssignalen',
      count: 3,
      bronData: [
        { fout: 's', controle: 'P0003', omschrijving: 'Ingang functie voor begin dienstverband', persNr: '20401', persNaam: 'Bakker, J.P.' },
        { fout: 'f', controle: 'P0012', omschrijving: 'Ontbrekend adres/woonplaats', persNr: '20415', persNaam: 'De Vries, M.A.' },
        { fout: 's', controle: 'P0003', omschrijving: 'Ingang functie voor begin dienstverband', persNr: '20418', persNaam: 'Yilmaz, A.' },
      ],
      vertalingen: [
        { id: 'v1', persNr: '20401', naam: 'Bakker, J.P.', opmerking: 'Ingangsdatum functie ligt voor aanvang dienstverband. Graag corrigeren naar de juiste datum of bevestigen dat dit correct is.', bron: 'P0003' },
        { id: 'v2', persNr: '20415', naam: 'De Vries, M.A.', opmerking: 'Adresgegevens ontbreken. Graag het woonadres invoeren — dit is verplicht voor de loonaangifte.', bron: 'P0012' },
        { id: 'v3', persNr: '20418', naam: 'Yilmaz, A.', opmerking: 'Ingangsdatum functie ligt voor aanvang dienstverband. Graag corrigeren naar de juiste datum of bevestigen dat dit correct is.', bron: 'P0003' },
      ],
    },
    {
      name: 'Loonaangifte',
      count: 1,
      loonaangifteData: [
        { id: 'la1', persNr: '20415', naam: 'De Vries, M.A.', opmerking: 'BSN ontbreekt. Verplicht voor loonaangifte Belastingdienst. Graag aanvullen.' },
      ],
    },
    {
      name: 'TWK',
      count: 2,
      twkData: [
        { id: 'twk1', persNr: '20403', naam: 'Smit, L.J.', mutatie: 'Parttime%', oud: '80%', nieuw: '100%', opmerking: 'Parttime percentage met terugwerkende kracht gewijzigd van 80% naar 100%. Graag bevestigen dat de nabetaling correct is verwerkt.' },
        { id: 'twk2', persNr: '20419', naam: 'Van den Berg, P.H.', mutatie: 'Salaris', oud: '€3.200', nieuw: '€3.450', opmerking: 'Salaris met terugwerkende kracht aangepast (+€250/mnd). Graag bevestigen dat nabetaling meegenomen.' },
      ],
    },
    {
      name: 'In-dienst',
      count: 3,
      indienstData: [
        { id: 'id1', persNr: '20432', naam: 'Pietersen, A.', check: 'Correspondentieadres', opmerking: 'Correspondentieadres wijkt af van adrestype. Graag controleren en corrigeren.' },
        { id: 'id2', persNr: '20432', naam: 'Pietersen, A.', check: 'Rooster vs contract', opmerking: 'Rooster staat op 20u maar contract op 38u. Graag aanpassen.' },
        { id: 'id3', persNr: '20432', naam: 'Pietersen, A.', check: 'Vakantiegeld reservering', opmerking: 'Vakantiegeldreservering ontbreekt. Graag instellen.' },
      ],
    },
    {
      name: 'Uit-dienst',
      count: 2,
      uitdienstData: [
        { id: 'ud1', persNr: '20408', naam: 'Willems, K.D.', uitdienst: '31-01-2026', reservering: 'Vakantiegeld', saldo: '€1.247,30', opmerking: 'Medewerker is uit dienst per 31-01-2026 maar heeft nog een openstaand vakantiegeldsaldo van €1.247,30. Graag uitbetalen of bevestigen dat verrekening loopt.' },
        { id: 'ud2', persNr: '20408', naam: 'Willems, K.D.', uitdienst: '31-01-2026', reservering: 'Vakantiedagen', saldo: '8,5 dgn', opmerking: 'Nog 8,5 openstaande vakantiedagen. Graag uitbetalen of bevestigen.' },
      ],
    },
    {
      name: 'Betalingen',
      count: 1,
      betalingenData: [
        { id: 'bt1', persNr: '20427', naam: 'De Groot, S.', type: 'Kasbetaling', opmerking: 'Kasbetaling gedetecteerd. Graag bevestigen dat dit correct en gewenst is.' },
      ],
    },
    {
      name: 'Reserveringen',
      count: 0,
    },
  ],
  terugkoppelTotaal: 12,
  // Gecombineerd terugkoppelbestand
  terugkoppelbestand: [
    { nr: 1, persNr: '20401', naam: 'Bakker, J.P.', rapport: 'Verwerkingssignalen', opmerking: 'Ingangsdatum functie ligt voor aanvang dienstverband. Graag corrigeren naar de juiste datum of bevestigen dat dit correct is.' },
    { nr: 2, persNr: '20415', naam: 'De Vries, M.A.', rapport: 'Verwerkingssignalen', opmerking: 'Adresgegevens ontbreken. Graag het woonadres invoeren — dit is verplicht voor de loonaangifte.' },
    { nr: 3, persNr: '20418', naam: 'Yilmaz, A.', rapport: 'Verwerkingssignalen', opmerking: 'Ingangsdatum functie ligt voor aanvang dienstverband. Graag corrigeren.' },
    { nr: 4, persNr: '20415', naam: 'De Vries, M.A.', rapport: 'Loonaangifte', opmerking: 'BSN ontbreekt. Verplicht voor loonaangifte Belastingdienst. Graag aanvullen.' },
    { nr: 5, persNr: '20403', naam: 'Smit, L.J.', rapport: 'TWK', opmerking: 'Parttime% met TWK gewijzigd van 80% naar 100%. Graag bevestigen nabetaling.' },
    { nr: 6, persNr: '20419', naam: 'Van den Berg, P.H.', rapport: 'TWK', opmerking: 'Salaris met TWK aangepast (+€250/mnd). Graag bevestigen nabetaling.' },
    { nr: 7, persNr: '20432', naam: 'Pietersen, A.', rapport: 'In-dienst', opmerking: 'Correspondentieadres wijkt af van adrestype. Graag controleren.' },
    { nr: 8, persNr: '20432', naam: 'Pietersen, A.', rapport: 'In-dienst', opmerking: 'Rooster (20u) wijkt af van contract (38u). Graag aanpassen.' },
    { nr: 9, persNr: '20432', naam: 'Pietersen, A.', rapport: 'In-dienst', opmerking: 'Vakantiegeldreservering ontbreekt. Graag instellen.' },
    { nr: 10, persNr: '20408', naam: 'Willems, K.D.', rapport: 'Uit-dienst', opmerking: 'Openstaand vakantiegeldsaldo €1.247,30. Graag uitbetalen of bevestigen.' },
    { nr: 11, persNr: '20408', naam: 'Willems, K.D.', rapport: 'Uit-dienst', opmerking: 'Nog 8,5 openstaande vakantiedagen. Graag uitbetalen of bevestigen.' },
    { nr: 12, persNr: '20427', naam: 'De Groot, S.', rapport: 'Betalingen', opmerking: 'Kasbetaling gedetecteerd. Graag bevestigen dat dit correct en gewenst is.' },
  ],
};
