import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Card } from '../components/common/Card.js';
import { Badge } from '../components/common/Badge.js';
import {
  ShieldCheck,
  Check,
  X,
  BookOpen,
  Filter,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';

export const SupervisorPage: React.FC = () => {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [scenRes, srcRes] = await Promise.all([
        api.getSupervisorScenarios(),
        api.getKnowledgeSources(),
      ]);
      setScenarios(scenRes.scenarios || []);
      setSources(srcRes.sources || []);
    } catch (err) {
      console.error('Failed to load supervisor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.approveScenario(id, status);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    }
  };

  const filteredScenarios =
    filter === 'ALL' ? scenarios : scenarios.filter((s) => s.reviewStatus === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-psysim-coral" />
            <h1 className="text-2xl font-bold text-psysim-navy">Supervisor Clinical Portal</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Clinical scenario review, curriculum objective configuration, and accredited medical
            knowledge registry.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="coral">Clinician Authority Mode</Badge>
        </div>
      </div>

      {/* Scenario Review Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">
            Clinical Scenarios & Case Templates ({filteredScenarios.length})
          </h2>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-psysim-coral"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Approved Only</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="DRAFT">Drafts</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Loading scenarios...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredScenarios.map((sc) => (
              <Card key={sc.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900">{sc.patient.name}</span>
                      <span className="text-xs text-slate-500">({sc.patient.age} yrs)</span>
                      <Badge variant="neutral">{sc.difficulty}</Badge>
                    </div>
                    <span className="text-xs text-slate-500 block mt-0.5">{sc.categoryName}</span>
                  </div>

                  <Badge
                    variant={
                      sc.reviewStatus === 'APPROVED'
                        ? 'success'
                        : sc.reviewStatus === 'REJECTED'
                        ? 'error'
                        : 'warning'
                    }
                  >
                    {sc.reviewStatus}
                  </Badge>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <div className="font-semibold text-slate-700">
                    Approved: {sc.approvedDiagnosis?.name}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    ICD-11: {sc.approvedDiagnosis?.icd11Code} • DSM-5: {sc.approvedDiagnosis?.dsm5Code}
                  </div>
                </div>

                <div className="text-xs text-slate-600 line-clamp-2 italic">
                  Opening: "{sc.openingMessage}"
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-[11px] text-slate-400">
                    {sc.mandatoryObjectives?.length || 0} mandatory interview objectives
                  </span>

                  <div className="flex items-center space-x-2">
                    {sc.reviewStatus !== 'APPROVED' && (
                      <button
                        onClick={() => handleApprove(sc.id, 'APPROVED')}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Case</span>
                      </button>
                    )}
                    {sc.reviewStatus !== 'REJECTED' && (
                      <button
                        onClick={() => handleApprove(sc.id, 'REJECTED')}
                        className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium flex items-center space-x-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Official Medical Knowledge Registry */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-psysim-coral" />
          <span>Curated Clinical Knowledge Source Registry</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sources.map((src) => (
            <Card key={src.id} className="space-y-2 text-xs">
              <div className="flex items-start justify-between">
                <span className="font-bold text-slate-900 text-sm">{src.sourceName}</span>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-psysim-coral"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <div className="text-[11px] text-slate-500">
                Version: <span className="text-slate-700 font-medium">{src.version}</span>
              </div>
              <p className="text-[11px] text-slate-600">{src.licenseTerms}</p>
              <div className="pt-2 border-t border-slate-100 text-[10px] text-emerald-700 font-semibold">
                Verified: {src.retrievalDate}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
