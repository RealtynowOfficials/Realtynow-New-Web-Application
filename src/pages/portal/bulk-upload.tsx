import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  History,
  ArrowLeft,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { getPortalSections } from './sections';
import { Card, Button, Select, Badge } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import { getListingPurposes, getWorkflowForPurpose, type ListingPurpose, type WorkflowField } from '../../lib/listing-config';
import {
  parseImportFile,
  templateColumns,
  validateRow,
  buildRowPayload,
  loadReferenceData,
  findInFileDuplicates,
  findDbDuplicates,
  type ResolvedRow,
} from '../../lib/bulk-import-payload';
import {
  createJob,
  updateJobProgress,
  completeJob,
  insertRow,
  insertError,
  listJobsForUser,
  type BulkImportJob,
} from '../../lib/bulk-import-jobs';

type WizardStep = 'purpose' | 'upload' | 'preview' | 'importing' | 'report';
type DuplicateStrategy = 'skip' | 'update' | 'replace' | 'create_new';

const CHUNK_SIZE = 25;

export function BulkUpload() {
  const { user, profile } = useAuth();
  const { t } = useLanguageContext();
  const toast = useToast();
  const navigate = useNavigate();
  const sections = getPortalSections(t);
  const role = profile?.role ?? 'customer';

  const [view, setView] = useState<'wizard' | 'history'>('wizard');
  const [step, setStep] = useState<WizardStep>('purpose');
  const [purposes, setPurposes] = useState<ListingPurpose[]>([]);
  const [purpose, setPurpose] = useState<ListingPurpose | null>(null);
  const [fields, setFields] = useState<WorkflowField[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [resolvedRows, setResolvedRows] = useState<ResolvedRow[]>([]);
  const [rowStrategy, setRowStrategy] = useState<Record<number, DuplicateStrategy>>({});
  const [defaultStrategy, setDefaultStrategy] = useState<DuplicateStrategy>('skip');
  const [job, setJob] = useState<BulkImportJob | null>(null);
  const [history, setHistory] = useState<BulkImportJob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getListingPurposes()
      .then(setPurposes)
      .catch(() => toast.addToast('error', 'Could not load listing purposes'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    try {
      setHistory(await listJobsForUser(user.id));
    } catch (err) {
      toast.addToast('error', err instanceof Error ? err.message : 'Could not load import history');
    }
  }, [user, toast]);

  useEffect(() => {
    if (view === 'history') loadHistory();
  }, [view, loadHistory]);

  const selectPurpose = useCallback(
    async (p: ListingPurpose) => {
      setPurpose(p);
      const { fieldsByStep } = await getWorkflowForPurpose(p.id);
      setFields(Object.values(fieldsByStep).flat());
      setStep('upload');
    },
    [],
  );

  const downloadTemplate = useCallback(() => {
    if (!purpose) return;
    const cols = templateColumns(fields, role);
    const csv = `${cols.join(',')}\n`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `realtynow_${purpose.key}_import_template.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [purpose, fields, role]);

  const handleFile = useCallback(
    async (selected: File) => {
      if (!purpose || !user) return;
      setFile(selected);
      setParsing(true);
      try {
        const rows = await parseImportFile(selected);
        if (rows.length === 0) {
          toast.addToast('error', 'No rows found in the file');
          setParsing(false);
          return;
        }
        const referenceData = await loadReferenceData(rows);

        const resolved: ResolvedRow[] = rows.map((row) => {
          const errors = validateRow(fields, row.raw, row.rowNumber);
          const cityName = (row.raw.city ?? '').toLowerCase();
          const cityId = cityName ? referenceData.cities.get(cityName) : undefined;
          if (row.raw.city && !cityId) {
            errors.push({ rowNumber: row.rowNumber, field: 'city', message: `Unknown city "${row.raw.city}"` });
          }

          const typeName = (row.raw.property_type ?? '').toLowerCase();
          const propertyTypeId = typeName ? referenceData.propertyTypes.get(typeName) : undefined;
          if (!propertyTypeId) {
            errors.push({ rowNumber: row.rowNumber, field: 'property_type', message: `Unknown property type "${row.raw.property_type || ''}"` });
          }

          let localityId: string | undefined;
          const localityName = (row.raw.locality ?? '').toLowerCase();
          if (localityName && cityId) {
            localityId = referenceData.localitiesByCity.get(cityId)?.get(localityName);
          }

          let payload: Record<string, unknown> | null = null;
          if (errors.length === 0) {
            payload = buildRowPayload(fields, row.raw, {
              ownerId: user.id,
              assignedAgentId: role === 'agent' ? user.id : undefined,
              purposeValue: purpose.properties_purpose_value,
              cityId,
              localityId,
            });
            payload.property_type_id = propertyTypeId;
          }

          return { rowNumber: row.rowNumber, raw: row.raw, errors, payload };
        });

        const inFileDupes = findInFileDuplicates(
          resolved.map((r) => ({ rowNumber: r.rowNumber, title: r.raw.title ?? '', city: r.raw.city ?? '' })),
        );
        for (const r of resolved) {
          const dupOfRow = inFileDupes.get(r.rowNumber);
          if (dupOfRow) {
            r.duplicateOfRowNumber = dupOfRow;
            r.duplicateReason = 'title_city_price';
          }
        }

        const candidates = resolved.filter((r) => r.errors.length === 0 && !r.duplicateOfRowNumber);
        if (candidates.length > 0) {
          const lookupRows = candidates.map((r) => {
            const cityName2 = (r.raw.city ?? '').toLowerCase();
            return {
              rowNumber: r.rowNumber,
              title: r.raw.title ?? '',
              cityId: cityName2 ? referenceData.cities.get(cityName2) : undefined,
              referenceId: r.raw.reference_id || undefined,
              reraNumber: r.raw.rera_number || undefined,
            };
          });
          const matches = await findDbDuplicates(lookupRows, {
            ownerId: user.id,
            assignedAgentId: role === 'agent' ? user.id : undefined,
          });
          for (const r of resolved) {
            const match = matches.get(r.rowNumber);
            if (match) {
              r.duplicateOfPropertyId = match.propertyId;
              r.duplicateReason = match.reason;
            }
          }
        }

        setResolvedRows(resolved);
        const strategies: Record<number, DuplicateStrategy> = {};
        for (const r of resolved) {
          if (r.duplicateOfPropertyId || r.duplicateOfRowNumber) strategies[r.rowNumber] = 'skip';
        }
        setRowStrategy(strategies);
        setStep('preview');
      } catch (err) {
        toast.addToast('error', err instanceof Error ? err.message : 'Could not parse file');
      } finally {
        setParsing(false);
      }
    },
    [purpose, fields, role, user, toast],
  );

  const startImport = useCallback(async () => {
    if (!purpose || !user) return;
    setStep('importing');
    let newJob: BulkImportJob | null = null;
    try {
      newJob = await createJob({
        ownerId: user.id,
        role,
        purpose: purpose.properties_purpose_value as 'Sale' | 'Rent',
        fileName: file?.name ?? 'import',
        totalRows: resolvedRows.length,
        duplicateStrategy: defaultStrategy,
      });
      setJob(newJob);

      let success = 0;
      let failed = 0;
      let skipped = 0;
      const toCreate: ResolvedRow[] = [];
      const toUpdate: ResolvedRow[] = [];

      for (const r of resolvedRows) {
        if (r.errors.length > 0) {
          failed++;
          await insertRow({ jobId: newJob.id, rowNumber: r.rowNumber, rawData: r.raw, status: 'failed' });
          for (const e of r.errors) {
            await insertError({ jobId: newJob.id, rowNumber: r.rowNumber, field: e.field ?? undefined, message: e.message });
          }
          continue;
        }
        const isDup = !!(r.duplicateOfPropertyId || r.duplicateOfRowNumber);
        const strategy = rowStrategy[r.rowNumber] ?? defaultStrategy;
        if (isDup && strategy === 'skip') {
          skipped++;
          await insertRow({
            jobId: newJob.id,
            rowNumber: r.rowNumber,
            rawData: r.raw,
            status: 'skipped',
            duplicateOfPropertyId: r.duplicateOfPropertyId,
            duplicateReason: r.duplicateReason,
          });
          continue;
        }
        if (isDup && r.duplicateOfPropertyId && strategy !== 'create_new') toUpdate.push(r);
        else toCreate.push(r);
      }

      await updateJobProgress(newJob.id, { success_rows: 0, failed_rows: failed, skipped_rows: skipped });

      for (let i = 0; i < toCreate.length; i += CHUNK_SIZE) {
        const chunk = toCreate.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabase
          .from('properties')
          .insert(chunk.map((r) => r.payload!))
          .select('id');
        if (error) {
          for (const r of chunk) {
            failed++;
            await insertRow({ jobId: newJob.id, rowNumber: r.rowNumber, rawData: r.raw, status: 'failed' });
            await insertError({ jobId: newJob.id, rowNumber: r.rowNumber, message: error.message });
          }
        } else {
          const ids = (data as { id: string }[]) ?? [];
          for (let idx = 0; idx < chunk.length; idx++) {
            success++;
            await insertRow({
              jobId: newJob.id,
              rowNumber: chunk[idx].rowNumber,
              rawData: chunk[idx].raw,
              status: 'success',
              resolvedPropertyId: ids[idx]?.id,
            });
          }
        }
        await updateJobProgress(newJob.id, { success_rows: success, failed_rows: failed, skipped_rows: skipped });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      for (let i = 0; i < toUpdate.length; i += CHUNK_SIZE) {
        const chunk = toUpdate.slice(i, i + CHUNK_SIZE);
        for (const r of chunk) {
          const { error } = await supabase.from('properties').update(r.payload!).eq('id', r.duplicateOfPropertyId!);
          if (error) {
            failed++;
            await insertRow({ jobId: newJob.id, rowNumber: r.rowNumber, rawData: r.raw, status: 'failed' });
            await insertError({ jobId: newJob.id, rowNumber: r.rowNumber, message: error.message });
          } else {
            success++;
            await insertRow({
              jobId: newJob.id,
              rowNumber: r.rowNumber,
              rawData: r.raw,
              status: 'success',
              resolvedPropertyId: r.duplicateOfPropertyId,
              duplicateOfPropertyId: r.duplicateOfPropertyId,
              duplicateReason: r.duplicateReason,
            });
          }
        }
        await updateJobProgress(newJob.id, { success_rows: success, failed_rows: failed, skipped_rows: skipped });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      await completeJob(newJob.id, 'Completed');
      setJob({ ...newJob, status: 'Completed', success_rows: success, failed_rows: failed, skipped_rows: skipped });
      setStep('report');
    } catch (err) {
      if (newJob) await completeJob(newJob.id, 'Failed', err instanceof Error ? err.message : 'Unknown error');
      toast.addToast('error', err instanceof Error ? err.message : 'Import failed');
      setStep('preview');
    }
  }, [purpose, user, role, file, resolvedRows, rowStrategy, defaultStrategy, toast]);

  const resetWizard = useCallback(() => {
    setStep('purpose');
    setPurpose(null);
    setFields([]);
    setFile(null);
    setResolvedRows([]);
    setRowStrategy({});
    setJob(null);
  }, []);

  const errorRows = resolvedRows.filter((r) => r.errors.length > 0);
  const duplicateRows = resolvedRows.filter((r) => r.errors.length === 0 && (r.duplicateOfPropertyId || r.duplicateOfRowNumber));
  const cleanRows = resolvedRows.filter((r) => r.errors.length === 0 && !r.duplicateOfPropertyId && !r.duplicateOfRowNumber);

  return (
    <DashboardLayout sections={sections} title="Bulk Import">
      <PageHeader
        title="Bulk Property Import"
        subtitle="Import multiple listings at once from Excel or CSV."
        action={
          <Button
            variant="ghost"
            size="sm"
            icon={<History className="h-4 w-4" />}
            onClick={() => setView(view === 'history' ? 'wizard' : 'history')}
          >
            {view === 'history' ? 'Back to Import' : 'Import History'}
          </Button>
        }
      />

      {view === 'history' ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-navy-100 bg-navy-50/60 text-left text-xs font-bold uppercase text-navy-500">
              <tr>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Success</th>
                <th className="px-4 py-3">Failed</th>
                <th className="px-4 py-3">Skipped</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((j) => (
                <tr key={j.id} className="border-b border-navy-50 last:border-0">
                  <td className="px-4 py-3 font-semibold text-navy-800">{j.file_name}</td>
                  <td className="px-4 py-3">{j.purpose}</td>
                  <td className="px-4 py-3">
                    <Badge variant={j.status === 'Completed' ? 'success' : j.status === 'Failed' ? 'error' : 'warning'}>{j.status}</Badge>
                  </td>
                  <td className="px-4 py-3">{j.total_rows}</td>
                  <td className="px-4 py-3 text-success-700">{j.success_rows}</td>
                  <td className="px-4 py-3 text-error-700">{j.failed_rows}</td>
                  <td className="px-4 py-3 text-navy-500">{j.skipped_rows}</td>
                  <td className="px-4 py-3 text-navy-400">{new Date(j.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-navy-400">
                    No import jobs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      ) : (
        <>
          {step === 'purpose' && (
            <Card className="p-6">
              <p className="mb-4 text-sm text-navy-500">Choose what you're bulk-importing.</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {purposes.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPurpose(p)}
                    className="rounded-xl border-2 border-navy-150 p-5 text-center font-bold text-navy-800 transition-colors hover:border-red-400 hover:bg-red-50/40"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {step === 'upload' && purpose && (
            <Card className="p-6">
              <button onClick={resetWizard} className="mb-4 flex items-center gap-1 text-sm font-semibold text-navy-500 hover:text-navy-800">
                <ArrowLeft className="h-4 w-4" /> Change purpose
              </button>
              <h2 className="font-display text-lg font-bold text-navy-900">{purpose.label}</h2>
              <p className="mt-1 text-sm text-navy-500">
                Download the template, fill it in, then upload it below. Supported formats: .csv, .xlsx, .xls.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={downloadTemplate}>
                  Download Template
                </Button>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-200 bg-navy-50/50 p-10 text-center hover:border-red-300 hover:bg-red-50/40"
              >
                {parsing ? <Loader2 className="h-6 w-6 animate-spin text-navy-400" /> : <UploadCloud className="h-6 w-6 text-navy-400" />}
                <p className="text-sm font-semibold text-navy-600">{parsing ? 'Parsing file...' : 'Click to upload your filled template'}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
            </Card>
          )}

          {step === 'preview' && (
            <div className="space-y-5">
              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5 font-semibold text-navy-700">
                      <FileSpreadsheet className="h-4 w-4" /> {resolvedRows.length} rows parsed
                    </span>
                    <Badge variant="success">{cleanRows.length} ready</Badge>
                    {duplicateRows.length > 0 && <Badge variant="warning">{duplicateRows.length} duplicates</Badge>}
                    {errorRows.length > 0 && <Badge variant="error">{errorRows.length} errors</Badge>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetWizard}>
                    Start Over
                  </Button>
                </div>
              </Card>

              {errorRows.length > 0 && (
                <Card className="p-5">
                  <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-error-700">
                    <AlertTriangle className="h-4 w-4" /> Errors — these rows will be skipped
                  </h3>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="text-left font-bold uppercase text-navy-400">
                        <tr>
                          <th className="py-1.5 pr-3">Row</th>
                          <th className="py-1.5 pr-3">Field</th>
                          <th className="py-1.5">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {errorRows.flatMap((r) =>
                          r.errors.map((e, i) => (
                            <tr key={`${r.rowNumber}-${i}`} className="border-t border-navy-50">
                              <td className="py-1.5 pr-3 font-semibold">{r.rowNumber}</td>
                              <td className="py-1.5 pr-3 text-navy-500">{e.field ?? '—'}</td>
                              <td className="py-1.5 text-error-600">{e.message}</td>
                            </tr>
                          )),
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {duplicateRows.length > 0 && (
                <Card className="p-5">
                  <h3 className="mb-3 text-sm font-bold text-warning-700">Possible Duplicates</h3>
                  <div className="mb-3 flex items-center gap-2 text-xs">
                    <span className="font-semibold text-navy-600">Apply to all:</span>
                    <Select
                      value={defaultStrategy}
                      onChange={(e) => {
                        const v = e.target.value as DuplicateStrategy;
                        setDefaultStrategy(v);
                        setRowStrategy((prev) => {
                          const next = { ...prev };
                          for (const r of duplicateRows) next[r.rowNumber] = v;
                          return next;
                        });
                      }}
                      className="!w-auto"
                    >
                      <option value="skip">Skip</option>
                      <option value="update">Update Existing</option>
                      <option value="replace">Replace</option>
                      <option value="create_new">Create New Anyway</option>
                    </Select>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="text-left font-bold uppercase text-navy-400">
                        <tr>
                          <th className="py-1.5 pr-3">Row</th>
                          <th className="py-1.5 pr-3">Title</th>
                          <th className="py-1.5 pr-3">Matched On</th>
                          <th className="py-1.5">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {duplicateRows.map((r) => (
                          <tr key={r.rowNumber} className="border-t border-navy-50">
                            <td className="py-1.5 pr-3 font-semibold">{r.rowNumber}</td>
                            <td className="py-1.5 pr-3">{r.raw.title}</td>
                            <td className="py-1.5 pr-3 text-navy-500">
                              {r.duplicateOfRowNumber ? `row ${r.duplicateOfRowNumber} (same file)` : r.duplicateReason}
                            </td>
                            <td className="py-1.5">
                              <Select
                                value={rowStrategy[r.rowNumber] ?? defaultStrategy}
                                onChange={(e) => setRowStrategy((prev) => ({ ...prev, [r.rowNumber]: e.target.value as DuplicateStrategy }))}
                                disabled={!!r.duplicateOfRowNumber}
                                className="!w-auto !py-1 text-xs"
                              >
                                <option value="skip">Skip</option>
                                {!r.duplicateOfRowNumber && <option value="update">Update</option>}
                                {!r.duplicateOfRowNumber && <option value="replace">Replace</option>}
                                <option value="create_new">Create New</option>
                              </Select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              <Button variant="primary" size="lg" className="w-full" disabled={cleanRows.length + duplicateRows.length === 0} onClick={startImport}>
                Start Import ({cleanRows.length + duplicateRows.filter((r) => (rowStrategy[r.rowNumber] ?? defaultStrategy) !== 'skip').length} rows)
              </Button>
            </div>
          )}

          {step === 'importing' && job && (
            <Card className="p-8 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-red-600" />
              <p className="mt-3 font-bold text-navy-800">Importing your listings...</p>
              <p className="mt-1 text-sm text-navy-500">
                {job.success_rows + job.failed_rows + job.skipped_rows} / {job.total_rows} processed
              </p>
              <div className="mx-auto mt-4 h-2 w-full max-w-sm overflow-hidden rounded-full bg-navy-100">
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${Math.min(100, ((job.success_rows + job.failed_rows + job.skipped_rows) / Math.max(1, job.total_rows)) * 100)}%` }}
                />
              </div>
              <p className="mt-4 text-xs font-semibold text-warning-600">Keep this tab open until the import finishes.</p>
            </Card>
          )}

          {step === 'report' && job && (
            <Card className="p-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-success-600" />
              <p className="mt-3 font-display text-xl font-bold text-navy-900">Import Complete</p>
              <div className="mt-5 flex justify-center gap-6 text-sm">
                <div>
                  <p className="text-2xl font-bold text-success-700">{job.success_rows}</p>
                  <p className="text-navy-500">Succeeded</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-error-700">{job.failed_rows}</p>
                  <p className="text-navy-500">Failed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-navy-600">{job.skipped_rows}</p>
                  <p className="text-navy-500">Skipped</p>
                </div>
              </div>
              <div className="mt-6 flex justify-center gap-3">
                <Button variant="secondary" onClick={resetWizard}>
                  Import More
                </Button>
                <Button variant="primary" onClick={() => navigate('/portal/my-properties')}>
                  View My Properties
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
