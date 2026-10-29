import React, { useState } from 'react';
import {
  Terminal,
  X,
  Copy,
  Check,
  Play,
  ExternalLink,
  Server,
  Database,
  Users,
  BookOpen,
  Table2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { TabKey } from './NavigationTabs';

interface CloudShellPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab: (tab: TabKey) => void;
  booksCount: number;
  databasesCount: number;
  equipmentCount: number;
}

type ServiceKey = 'inventory' | 'todolist' | 'equipment';

export const CloudShellPanel: React.FC<CloudShellPanelProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
  booksCount,
  databasesCount,
  equipmentCount,
}) => {
  const [activeService, setActiveService] = useState<ServiceKey>('inventory');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string>(() => {
    return [
      'Welcome to Google Cloud Shell [Cloud Run: ais-dev-x5q5ialo4cilhmlebwaq64-246115386001]',
      'Region: us-east5 | Project ID: 246115386001',
      'Database: ai-studio-lighthousehashil-82b606fc-3fb5-43e5-ac8e-93f75f16bcae',
      '',
      'Type or click any app command below to inspect endpoints or run Cloud Shell operations.',
    ].join('\n');
  });

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExecuteLive = async (service: ServiceKey) => {
    setIsExecuting(true);
    const startTime = performance.now();
    try {
      let endpoint = '/api/books';
      let title = 'InventorySoftware (/api/books)';
      if (service === 'todolist') {
        endpoint = '/api/databases';
        title = 'TodoList (/api/databases)';
      } else if (service === 'equipment') {
        endpoint = '/api/equipment';
        title = 'Inventory Equipment (/api/equipment)';
      }

      const res = await fetch(endpoint);
      const data = await res.json();
      const elapsed = Math.round(performance.now() - startTime);

      const sample = Array.isArray(data) ? data.slice(0, 3) : data;
      const total = Array.isArray(data) ? data.length : 'OK';

      const log = [
        `\n$ curl -X GET "https://ais-dev-x5q5ialo4cilhmlebwaq64-246115386001.us-east5.run.app${endpoint}" -H "Accept: application/json"`,
        `HTTP/2 200 OK [${elapsed}ms]`,
        `Content-Type: application/json; charset=utf-8`,
        `Service Target: ${title}`,
        `Total Records Retrieved: ${total}`,
        `Preview Output (First items):`,
        JSON.stringify(sample, null, 2),
        `\n[cloudshell-user@gcp-us-east5 ~]$ _`,
      ].join('\n');

      setTerminalOutput(prev => prev + log);
    } catch (err: any) {
      setTerminalOutput(
        prev =>
          prev +
          `\n$ curl error: ${err.message || 'Network error'}\n[cloudshell-user@gcp-us-east5 ~]$ _`
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const servicesConfig: Record<
    ServiceKey,
    {
      title: string;
      navKey: TabKey;
      icon: React.ReactNode;
      description: string;
      itemCount: number;
      commands: { id: string; label: string; cmd: string }[];
    }
  > = {
    inventory: {
      title: 'Inventory Software',
      navKey: 'library',
      icon: <BookOpen className="w-4 h-4 text-[#E8637C]" />,
      description: 'Document inventory catalog, metadata ingestion & technical books pipeline',
      itemCount: booksCount,
      commands: [
        {
          id: 'inv-gcloud-service',
          label: 'Describe Cloud Run Service',
          cmd: 'gcloud run services describe ais-dev-x5q5ialo4cilhmlebwaq64-246115386001 --region=us-east5 --format="yaml(status.address.url)"',
        },
        {
          id: 'inv-curl',
          label: 'Query Inventory Catalog via cURL',
          cmd: 'curl -s "https://ais-dev-x5q5ialo4cilhmlebwaq64-246115386001.us-east5.run.app/api/books" | jq \'.[0:5]\'',
        },
        {
          id: 'inv-logs',
          label: 'Stream Cloud Run Deployment Logs',
          cmd: 'gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ais-dev-x5q5ialo4cilhmlebwaq64-246115386001" --limit=20',
        },
      ],
    },
    todolist: {
      title: 'TodoList Matrix',
      navKey: 'todolist',
      icon: <Table2 className="w-4 h-4 text-[#E8637C]" />,
      description: 'Dynamic TodoLists, tabular spreadsheets (Employers_Colombia) & Firestore collections',
      itemCount: databasesCount,
      commands: [
        {
          id: 'todo-curl',
          label: 'Fetch TodoList Matrices via Shell',
          cmd: 'curl -s "https://ais-dev-x5q5ialo4cilhmlebwaq64-246115386001.us-east5.run.app/api/databases" | jq \'.[] | {id, name, rows: (.rows | length)}\'',
        },
        {
          id: 'todo-firestore',
          label: 'Inspect Firestore Cloud Indexes',
          cmd: 'gcloud firestore indexes composite list --database="ai-studio-lighthousehashil-82b606fc-3fb5-43e5-ac8e-93f75f16bcae"',
        },
        {
          id: 'todo-export',
          label: 'Backup Matrix to Cloud Storage',
          cmd: 'gcloud firestore export gs://ai-studio-lighthousehashil-backup/ --database="ai-studio-lighthousehashil-82b606fc-3fb5-43e5-ac8e-93f75f16bcae"',
        },
      ],
    },
    equipment: {
      title: 'Inventory Equipment',
      navKey: 'equipment',
      icon: <Users className="w-4 h-4 text-[#E8637C]" />,
      description: 'Gundam units, engineer workstations, accounts & hardware loans',
      itemCount: equipmentCount,
      commands: [
        {
          id: 'eq-curl',
          label: 'List Registered Equipment via cURL',
          cmd: 'curl -s "https://ais-dev-x5q5ialo4cilhmlebwaq64-246115386001.us-east5.run.app/api/equipment" | jq \'.[] | {id, name, role}\'',
        },
        {
          id: 'eq-revisions',
          label: 'List Cloud Run Active Revisions',
          cmd: 'gcloud run revisions list --service=ais-dev-x5q5ialo4cilhmlebwaq64-246115386001 --region=us-east5 --limit=5',
        },
        {
          id: 'eq-auth',
          label: 'Verify GCP Authenticated Identity',
          cmd: 'gcloud auth list && gcloud config get-value project',
        },
      ],
    },
  };

  const currentConfig = servicesConfig[activeService];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#1E141A] rounded-3xl max-w-2xl w-full shadow-2xl border-2 border-[#F2D5DE] dark:border-[#382631] flex flex-col overflow-hidden max-h-[90vh]">
        {/* Panel Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#8A1E3B] via-[#C83761] to-[#E8637C] text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-white/20 text-white shadow-inner flex items-center justify-center">
              <Terminal className="w-5 h-5 text-white" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-serif-jp tracking-wide text-white">
                  Google Cloud Shell Access ⚡
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 uppercase">
                  Cloud Run / CLI
                </span>
              </div>
              <p className="text-xs text-pink-100">
                Access Inventory Software, TodoList &amp; Equipment via Google Cloud terminal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition cursor-pointer"
            title="Close Cloud Shell Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 App Service Selection Tabs */}
        <div className="grid grid-cols-3 border-b border-[#F2D5DE] dark:border-[#38322B] bg-[#FFF5F7] dark:bg-[#251820] p-1.5 gap-1.5">
          {(Object.keys(servicesConfig) as ServiceKey[]).map(key => {
            const s = servicesConfig[key];
            const isSelected = activeService === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveService(key)}
                className={`py-2 px-2 sm:px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-[#1E141A] text-[#8A1E3B] dark:text-[#F48FB1] shadow-2xs border border-[#F2D5DE] dark:border-[#38322B]'
                    : 'text-[#6B5B63] dark:text-[#E2B8C4] hover:bg-white/60 dark:hover:bg-[#2B1B24]'
                }`}
              >
                <span>{s.icon}</span>
                <span className="truncate">{s.title}</span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] rounded-full bg-[#FDE8EE] dark:bg-[#382631] text-[#8A1E3B] dark:text-[#F48FB1]">
                  {s.itemCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Service Actions & Command List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Service Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#FFF9FB] dark:bg-[#251820] border border-[#F2D5DE] dark:border-[#38322B]">
            <div>
              <h4 className="text-sm font-bold text-[#1E1619] dark:text-[#FDF2F5] flex items-center gap-1.5 font-serif-jp">
                <span>{currentConfig.title}</span>
                <span className="text-[11px] font-normal text-[#8A7881] dark:text-[#E2B8C4]">
                  • {currentConfig.itemCount} items
                </span>
              </h4>
              <p className="text-xs text-[#6B5B63] dark:text-[#E2B8C4] mt-0.5">
                {currentConfig.description}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Live Test / Run */}
              <button
                type="button"
                onClick={() => handleExecuteLive(activeService)}
                disabled={isExecuting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E8637C] hover:bg-[#D84C74] text-white shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Execute real curl request against Cloud Run endpoint"
              >
                {isExecuting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>Test in Shell</span>
              </button>

              {/* Jump to App View */}
              <button
                type="button"
                onClick={() => {
                  onNavigateToTab(currentConfig.navKey);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-[#1E141A] text-[#8A1E3B] dark:text-[#FDF2F5] border border-[#F2D5DE] dark:border-[#38322B] hover:bg-[#FFF5F7] transition cursor-pointer"
              >
                <span>Open View</span>
              </button>
            </div>
          </div>

          {/* Copyable CLI Commands */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#8A1E3B] dark:text-[#F48FB1] px-1">
              <span>Google Cloud Shell Executable Commands:</span>
              <a
                href="https://shell.cloud.google.com/?show=ide%2Cterminal"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-[#E8637C] hover:underline"
              >
                <span>Launch Google Cloud Shell</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {currentConfig.commands.map(cmdItem => (
              <div
                key={cmdItem.id}
                className="p-3 rounded-2xl bg-white dark:bg-[#1A1217] border border-[#F2D5DE] dark:border-[#38322B] shadow-2xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1E1619] dark:text-[#FDF2F5]">
                    {cmdItem.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(cmdItem.cmd, cmdItem.id)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-[#FFF5F7] dark:bg-[#251820] text-[#8A1E3B] dark:text-[#F48FB1] hover:bg-[#FDE8EE] transition border border-[#F2D5DE] dark:border-[#38322B] cursor-pointer"
                    title="Copy command to clipboard"
                  >
                    {copiedIndex === cmdItem.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-[11px] bg-[#140E12] text-pink-200 px-3 py-2 rounded-xl overflow-x-auto select-all">
                  <span className="text-pink-400 select-none">$ </span>
                  {cmdItem.cmd}
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Shell Terminal Console Window */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-bold text-[#6B5B63] dark:text-[#E2B8C4] px-1">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#E8637C]" />
                <span>Cloud Shell Output Simulator</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  setTerminalOutput(
                    '[cloudshell-user@gcp-us-east5 ~]$ Console cleared.\nReady for commands.'
                  )
                }
                className="text-[11px] text-[#8A7881] hover:text-[#8A1E3B] cursor-pointer"
              >
                Clear
              </button>
            </div>

            <div className="rounded-2xl bg-[#140E12] border border-[#382631] p-3 text-xs font-mono text-emerald-400 h-36 overflow-y-auto whitespace-pre leading-relaxed shadow-inner no-scrollbar">
              {terminalOutput}
            </div>
          </div>
        </div>

        {/* Panel Footer */}
        <div className="p-3 bg-[#FFF5F7] dark:bg-[#1A1217] border-t border-[#F2D5DE] dark:border-[#38322B] flex items-center justify-between px-4 text-xs">
          <div className="flex items-center gap-2 text-[#8A7881] dark:text-[#E2B8C4]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Cloud Run Service: Active (us-east5)</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#8A1E3B] hover:bg-[#A82B4E] text-white transition shadow-2xs cursor-pointer"
          >
            Close Menu
          </button>
        </div>
      </div>
    </div>
  );
};
