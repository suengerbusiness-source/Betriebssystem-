import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Briefcase, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  businessIdeas,
  channels as channelsRepo,
  companies,
  contentItems,
  investments as investmentsRepo,
  revenueStreams,
} from "@/data/repo";
import type { Company } from "@/data/types";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { CompanyModal } from "./CompanyModal";
import { CompanyOverview } from "./CompanyOverview";
import { ChannelsTab } from "./ChannelsTab";
import { ContentTab } from "./ContentTab";
import { InvestmentsTab } from "./InvestmentsTab";
import { RevenueTab } from "./RevenueTab";
import { IdeasTab } from "./IdeasTab";

type Tab = "overview" | "channels" | "content" | "investments" | "revenue" | "ideas";

const TABS: { value: Tab; label: string }[] = [
  { value: "overview", label: "Übersicht" },
  { value: "channels", label: "Kanäle" },
  { value: "content", label: "Content" },
  { value: "investments", label: "Investitionen" },
  { value: "revenue", label: "Einnahmen" },
  { value: "ideas", label: "Ideen & Pläne" },
];

export function CompanyPage() {
  const { account } = useAuth();
  const accId = account?.id;

  const allCompanies = useLiveQuery(() => (accId ? companies.list(accId) : []), [accId]) ?? [];
  const allChannels = useLiveQuery(() => (accId ? channelsRepo.list(accId) : []), [accId]) ?? [];
  const allContent = useLiveQuery(() => (accId ? contentItems.list(accId) : []), [accId]) ?? [];
  const allInvestments = useLiveQuery(() => (accId ? investmentsRepo.list(accId) : []), [accId]) ?? [];
  const allStreams = useLiveQuery(() => (accId ? revenueStreams.list(accId) : []), [accId]) ?? [];
  const allIdeas = useLiveQuery(() => (accId ? businessIdeas.list(accId) : []), [accId]) ?? [];

  const sortedCompanies = useMemo(() => [...allCompanies].sort((a, b) => a.createdAt - b.createdAt), [allCompanies]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);

  // Auswahl gültig halten (erstes Unternehmen, falls keins gewählt).
  useEffect(() => {
    if (sortedCompanies.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !sortedCompanies.some((c) => c.id === selectedId)) {
      setSelectedId(sortedCompanies[0].id);
    }
  }, [sortedCompanies, selectedId]);

  const company = sortedCompanies.find((c) => c.id === selectedId) ?? null;

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit() {
    if (company) {
      setEditing(company);
      setModalOpen(true);
    }
  }
  async function removeCompany() {
    if (company && confirm(`„${company.name}" mit allen Kanälen, Content, Investitionen und Ideen löschen?`)) {
      await companies.remove(company.id);
    }
  }

  return (
    <div>
      <PageHeader
        title="Unternehmen"
        subtitle="Deine Marke, Kanäle, Content, Zahlen und Ideen – alles an einem Ort."
        actions={
          <>
            {sortedCompanies.length > 0 && (
              <Select value={selectedId ?? ""} onChange={(e) => setSelectedId(e.target.value)} className="h-10 w-auto min-w-[10rem]">
                {sortedCompanies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            )}
            <Button onClick={openNew}><Plus size={18} /> Unternehmen</Button>
          </>
        }
      />

      {!company ? (
        <EmptyState
          icon={<Briefcase size={22} />}
          title="Noch kein Unternehmen"
          description="Lege dein Gewerbe an – z. B. deine Social-Media-Marke – und baue alles drumherum auf."
          action={<Button onClick={openNew}><Plus size={18} /> Unternehmen anlegen</Button>}
        />
      ) : (
        <>
          {/* Tab-Leiste */}
          <div className="mb-5 flex gap-1 overflow-x-auto rounded-md bg-secondary p-1">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  "shrink-0 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === t.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={removeCompany}
              className="ml-auto shrink-0 rounded px-2 text-muted-foreground hover:text-destructive"
              aria-label="Unternehmen löschen"
              title="Unternehmen löschen"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {tab === "overview" && (
            <CompanyOverview
              company={company}
              channels={allChannels.filter((c) => c.companyId === company.id)}
              content={allContent.filter((c) => c.companyId === company.id)}
              investments={allInvestments.filter((c) => c.companyId === company.id)}
              streams={allStreams.filter((c) => c.companyId === company.id)}
              ideas={allIdeas.filter((c) => c.companyId === company.id)}
              onEdit={openEdit}
              onGoto={(t) => setTab(t as Tab)}
            />
          )}
          {tab === "channels" && accId && <ChannelsTab accountId={accId} companyId={company.id} />}
          {tab === "content" && accId && <ContentTab accountId={accId} companyId={company.id} />}
          {tab === "investments" && accId && <InvestmentsTab accountId={accId} companyId={company.id} />}
          {tab === "revenue" && accId && <RevenueTab accountId={accId} companyId={company.id} />}
          {tab === "ideas" && accId && <IdeasTab accountId={accId} companyId={company.id} />}
        </>
      )}

      {accId && (
        <CompanyModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          accountId={accId}
          editing={editing}
          onCreated={(id) => { setSelectedId(id); setTab("overview"); }}
        />
      )}
    </div>
  );
}
