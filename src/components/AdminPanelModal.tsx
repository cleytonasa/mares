import React, { useState, useEffect } from 'react';
import { 
  X, 
  Ship, 
  FileText, 
  UploadCloud, 
  Trash2, 
  Save, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  LogOut, 
  Download, 
  Eye, 
  RotateCcw,
  Calendar,
  Layers,
  Sparkles,
  FileCheck,
  Bot,
  RefreshCw,
  SlidersHorizontal,
  Check
} from 'lucide-react';
import { SaltShipmentVessel } from '../data/saltShipmentsData';
import { extractTextFromPdf, parseLineupText, ExtractedLineupData } from '../services/pdfLineupParser';
import { 
  getManagedVessels, 
  saveManagedVesselsWithRemote, 
  resetManagedVessels,
  getUploadedPDF, 
  saveUploadedPDF,
  getLineupLastUpdated,
  saveLineupLastUpdated,
  UploadedPDFInfo,
  setAdminLoggedIn
} from '../services/adminLineupService';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export function AdminPanelModal({ isOpen, onClose, onLogout }: AdminPanelModalProps) {
  const [activeTab, setActiveTab] = useState<'vessels' | 'pdf' | 'settings'>('vessels');
  const [vessels, setVessels] = useState<SaltShipmentVessel[]>([]);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<number | 'ALL'>(9); // default September
  const [editingVesselId, setEditingVesselId] = useState<string | null>(null);
  const [pdfInfo, setPdfInfo] = useState<UploadedPDFInfo | null>(null);
  const [pdfDateInput, setPdfDateInput] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Automatic PDF Extraction & Review States
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [extractedCandidateVessels, setExtractedCandidateVessels] = useState<Partial<SaltShipmentVessel>[]>([]);
  const [extractedRawText, setExtractedRawText] = useState<string>('');
  const [showExtractionReviewModal, setShowExtractionReviewModal] = useState(false);

  // New vessel modal state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newVessel, setNewVessel] = useState<Partial<SaltShipmentVessel>>({
    voyageNumber: 'SLN2026038',
    vesselName: '',
    flag: 'Panamá',
    dwt: 40000,
    loa: 180,
    beam: 30,
    draughtArrival: 6.5,
    eta: '15/09/2026 12:00',
    etb: '15/09/2026 20:00',
    etd: '18/09/2026 16:00',
    status: 'Previsto',
    scVolumeTons: 35000,
    sqVolumeTons: 0,
    totalVolumeTons: 35000,
    shipper: 'SALINOR',
    destination: 'Cabotagem (Santos/SP)',
    productType: 'Sal Comum',
    notes: 'Programado no terminal'
  });

  // Load initial data on open
  useEffect(() => {
    if (isOpen) {
      setVessels(getManagedVessels());
      const currentPdf = getUploadedPDF();
      setPdfInfo(currentPdf);
      const effectiveDate = currentPdf?.pdfDate || currentPdf?.uploadedAt || getLineupLastUpdated();
      setPdfDateInput(effectiveDate);
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handler to update a single vessel's fields in memory
  const handleVesselChange = (id: string, field: keyof SaltShipmentVessel, value: any) => {
    setVessels((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;

        const updated = { ...v, [field]: value };
        // Recalculate total if sc or sq changes
        if (field === 'scVolumeTons' || field === 'sqVolumeTons') {
          const sc = field === 'scVolumeTons' ? Number(value) || 0 : v.scVolumeTons;
          const sq = field === 'sqVolumeTons' ? Number(value) || 0 : v.sqVolumeTons;
          updated.totalVolumeTons = sc + sq;
          if (sc > 0 && sq > 0) updated.productType = 'Misto (SC + SQ)';
          else if (sq > 0) updated.productType = 'Sal Químico';
          else updated.productType = 'Sal Comum';
        }
        return updated;
      })
    );
  };

  // Persist all vessels to localStorage and server
  const handleSaveAllVessels = async () => {
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await saveManagedVesselsWithRemote(vessels, pdfInfo, { user: 'controle', pass: 'casa8877$' });
      setStatusMessage({ type: 'success', text: res.message || 'Dados salvos e sincronizados com sucesso!' });
      setEditingVesselId(null);
    } catch {
      setStatusMessage({ type: 'error', text: 'Erro ao salvar os dados. Tente novamente.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Delete vessel
  const handleDeleteVessel = (id: string, vesselName: string) => {
    if (window.confirm(`Tem certeza que deseja remover o navio "${vesselName}" do Line-Up?`)) {
      const updated = vessels.filter((v) => v.id !== id);
      setVessels(updated);
      saveManagedVesselsWithRemote(updated, pdfInfo, { user: 'controle', pass: 'casa8877$' });
      setStatusMessage({ type: 'success', text: `Navio ${vesselName} removido da escala.` });
    }
  };

  // Add new vessel submit
  const handleCreateVessel = () => {
    if (!newVessel.vesselName?.trim()) {
      alert('Por favor informe o nome do navio.');
      return;
    }

    const total = (Number(newVessel.scVolumeTons) || 0) + (Number(newVessel.sqVolumeTons) || 0);
    const etaStr = newVessel.eta || '01/09/2026 12:00';
    const etaParts = etaStr.split('/');
    const monthNum = etaParts.length >= 2 ? parseInt(etaParts[1], 10) : 9;
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthName = monthNames[monthNum - 1] || 'Setembro';
    const isCbt = (newVessel.destination || '').toLowerCase().includes('cabot') || (newVessel.destination || '').toLowerCase().includes('santos') || (newVessel.destination || '').toLowerCase().includes('rio');

    const created: SaltShipmentVessel = {
      id: `vessel-custom-${Date.now()}`,
      visitCode: newVessel.voyageNumber || `SLN-${Date.now().toString().slice(-4)}`,
      voyageNumber: newVessel.voyageNumber || `SLN-${Date.now().toString().slice(-4)}`,
      vesselName: newVessel.vesselName.toUpperCase().trim(),
      loaMeters: Number(newVessel.loa) || 180,
      loa: Number(newVessel.loa) || 180,
      beam: Number(newVessel.beam) || 30,
      draughtArrival: Number(newVessel.draughtArrival) || 6.5,
      flag: newVessel.flag || 'Panamá',
      dwt: Number(newVessel.dwt) || 40000,
      eta: etaStr,
      etb: newVessel.etb || '01/09/2026 20:00',
      etd: newVessel.etd || '04/09/2026 18:00',
      status: (newVessel.status as any) || 'Previsto',
      scVolumeTons: Number(newVessel.scVolumeTons) || 0,
      sqVolumeTons: Number(newVessel.sqVolumeTons) || 0,
      totalVolumeTons: total,
      trafficType: isCbt ? 'CBT' : 'EXP',
      trafficLabel: isCbt ? 'Cabotagem' : 'Exportação',
      shipper: newVessel.shipper || 'SALINOR',
      destination: newVessel.destination || 'Cabotagem (Santos/SP)',
      productType: total === 0 ? 'Sal Comum' : (Number(newVessel.scVolumeTons) > 0 && Number(newVessel.sqVolumeTons) > 0) ? 'Misto (SC + SQ)' : Number(newVessel.sqVolumeTons) > 0 ? 'Sal Químico' : 'Sal Comum',
      notes: newVessel.notes || 'Cadastrado no módulo administrativo',
      month: monthNum,
      monthName: monthName,
      year: 2026,
    };

    const updated = [...vessels, created];
    setVessels(updated);
    saveManagedVesselsWithRemote(updated, pdfInfo, { user: 'controle', pass: 'casa8877$' });
    setIsAddingNew(false);
    setNewVessel({
      voyageNumber: `SLN20260${vessels.length + 1}`,
      vesselName: '',
      flag: 'Panamá',
      dwt: 40000,
      loa: 180,
      beam: 30,
      draughtArrival: 6.5,
      eta: '20/09/2026 12:00',
      etb: '20/09/2026 20:00',
      etd: '23/09/2026 16:00',
      status: 'Previsto',
      scVolumeTons: 35000,
      sqVolumeTons: 0,
      totalVolumeTons: 35000,
      shipper: 'SALINOR',
      destination: 'Cabotagem',
      productType: 'Sal Comum',
      notes: ''
    });
    setStatusMessage({ type: 'success', text: `Navio ${created.vesselName} adicionado à programação!` });
  };

  // Trigger Automatic Smart Extraction from the uploaded PDF
  const triggerExtractFromPdf = async (pdfDataUrlOrFile?: string | File) => {
    const targetSource = pdfDataUrlOrFile || pdfInfo?.dataUrl;
    if (!targetSource) {
      alert('Nenhum arquivo PDF encontrado para leitura. Por favor envie o PDF primeiro.');
      return;
    }

    setIsExtractingPdf(true);
    setStatusMessage({ type: 'success', text: 'Analisando e extraindo dados do PDF do Line-Up...' });

    try {
      const rawText = await extractTextFromPdf(targetSource);
      setExtractedRawText(rawText);

      const parsedData = parseLineupText(rawText);

      if (parsedData.documentDate && !pdfDateInput.trim()) {
        setPdfDateInput(parsedData.documentDate);
      }

      if (parsedData.vessels && parsedData.vessels.length > 0) {
        setExtractedCandidateVessels(parsedData.vessels);
        setShowExtractionReviewModal(true);
        setStatusMessage({
          type: 'success',
          text: `Leitura concluída! ${parsedData.vessels.length} registros/horários de navios identificados para revisão.`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: 'O texto do PDF foi extraído, mas nenhum padrão de escala de navios foi reconhecido automaticamente. Você pode continuar editando manualmente.'
        });
      }
    } catch (err) {
      console.error('Erro na extração do PDF:', err);
      setStatusMessage({
        type: 'error',
        text: 'Não foi possível ler o texto do PDF automaticamente. O documento permanece salvo para visualização normal.'
      });
    } finally {
      setIsExtractingPdf(false);
    }
  };

  // Apply reviewed extracted vessels into the active vessels state
  const handleApplyExtractedVessels = (mergeMode: 'merge' | 'replace') => {
    if (extractedCandidateVessels.length === 0) return;

    let updatedList: SaltShipmentVessel[] = [];

    if (mergeMode === 'replace') {
      // Replace only vessels for the affected months or all
      updatedList = extractedCandidateVessels.map((cand, idx) => ({
        id: cand.id || `vessel-extracted-${Date.now()}-${idx}`,
        visitCode: cand.voyageNumber || `SLN20260${idx + 40}`,
        voyageNumber: cand.voyageNumber || `SLN20260${idx + 40}`,
        vesselName: (cand.vesselName || 'NAVIO').toUpperCase().trim(),
        loaMeters: cand.loaMeters || 180,
        loa: cand.loaMeters || 180,
        beam: cand.beam || 30,
        draughtArrival: cand.draughtArrival || 6.5,
        flag: cand.flag || 'Panamá',
        dwt: cand.dwt || 40000,
        eta: cand.eta || '15/09/2026 12:00',
        etb: cand.etb || '15/09/2026 20:00',
        etd: cand.etd || '18/09/2026 16:00',
        status: cand.status || 'Previsto',
        scVolumeTons: cand.scVolumeTons || 35000,
        sqVolumeTons: cand.sqVolumeTons || 0,
        totalVolumeTons: (cand.scVolumeTons || 35000) + (cand.sqVolumeTons || 0),
        trafficType: cand.trafficType || 'CBT',
        trafficLabel: cand.trafficLabel || 'Cabotagem',
        shipper: cand.shipper || 'SALINOR',
        destination: cand.destination || 'Cabotagem',
        productType: cand.productType || 'Sal Comum',
        notes: cand.notes || 'Extraído automaticamente via PDF Line-Up',
        month: cand.month || 9,
        monthName: cand.monthName || 'Setembro',
        year: 2026,
      }));
    } else {
      // Merge with existing list: update matching vessel names or append
      const existing = [...vessels];
      extractedCandidateVessels.forEach((cand, idx) => {
        const cleanName = (cand.vesselName || '').toUpperCase().trim();
        const foundIndex = existing.findIndex(
          v => v.vesselName.toUpperCase().trim() === cleanName || 
          (cand.voyageNumber && v.voyageNumber === cand.voyageNumber)
        );

        if (foundIndex >= 0) {
          // Update existing vessel's dates and status
          existing[foundIndex] = {
            ...existing[foundIndex],
            eta: cand.eta || existing[foundIndex].eta,
            etb: cand.etb || existing[foundIndex].etb,
            etd: cand.etd || existing[foundIndex].etd,
            status: cand.status || existing[foundIndex].status,
            scVolumeTons: cand.scVolumeTons !== undefined ? cand.scVolumeTons : existing[foundIndex].scVolumeTons,
            sqVolumeTons: cand.sqVolumeTons !== undefined ? cand.sqVolumeTons : existing[foundIndex].sqVolumeTons,
            totalVolumeTons: cand.totalVolumeTons || existing[foundIndex].totalVolumeTons,
          };
        } else {
          // Add new
          existing.push({
            id: cand.id || `vessel-extracted-${Date.now()}-${idx}`,
            visitCode: cand.voyageNumber || `SLN20260${idx + 40}`,
            voyageNumber: cand.voyageNumber || `SLN20260${idx + 40}`,
            vesselName: cleanName || 'NAVIO',
            loaMeters: cand.loaMeters || 180,
            loa: cand.loaMeters || 180,
            beam: cand.beam || 30,
            draughtArrival: cand.draughtArrival || 6.5,
            flag: cand.flag || 'Panamá',
            dwt: cand.dwt || 40000,
            eta: cand.eta || '15/09/2026 12:00',
            etb: cand.etb || '15/09/2026 20:00',
            etd: cand.etd || '18/09/2026 16:00',
            status: cand.status || 'Previsto',
            scVolumeTons: cand.scVolumeTons || 35000,
            sqVolumeTons: cand.sqVolumeTons || 0,
            totalVolumeTons: (cand.scVolumeTons || 35000) + (cand.sqVolumeTons || 0),
            trafficType: cand.trafficType || 'CBT',
            trafficLabel: cand.trafficLabel || 'Cabotagem',
            shipper: cand.shipper || 'SALINOR',
            destination: cand.destination || 'Cabotagem',
            productType: cand.productType || 'Sal Comum',
            notes: cand.notes || 'Extraído automaticamente via PDF Line-Up',
            month: cand.month || 9,
            monthName: cand.monthName || 'Setembro',
            year: 2026,
          });
        }
      });
      updatedList = existing;
    }

    setVessels(updatedList);
    saveManagedVesselsWithRemote(updatedList, pdfInfo, { user: 'controle', pass: 'casa8877$' }, pdfDateInput);
    setShowExtractionReviewModal(false);
    setActiveTab('vessels');
    setStatusMessage({
      type: 'success',
      text: 'Escala de navios atualizada com sucesso a partir do PDF! Você pode continuar editando qualquer campo manualmente.'
    });
  };

  // Handle PDF file upload
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Apenas arquivos no formato PDF são permitidos.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('O arquivo PDF não deve exceder 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const fileDate = file.lastModified ? new Date(file.lastModified) : new Date();
      const day = String(fileDate.getDate()).padStart(2, '0');
      const month = String(fileDate.getMonth() + 1).padStart(2, '0');
      const year = fileDate.getFullYear();
      const hours = String(fileDate.getHours()).padStart(2, '0');
      const minutes = String(fileDate.getMinutes()).padStart(2, '0');
      const defaultDocDate = `${day}/${month}/${year} ${hours}:${minutes}`;
      
      const effectiveDate = pdfDateInput.trim() ? pdfDateInput.trim() : defaultDocDate;

      const info: UploadedPDFInfo = {
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: defaultDocDate,
        pdfDate: effectiveDate,
        dataUrl,
      };

      setPdfInfo(info);
      setPdfDateInput(effectiveDate);
      saveUploadedPDF(info);
      saveManagedVesselsWithRemote(vessels, info, { user: 'controle', pass: 'casa8877$' }, effectiveDate);
      setStatusMessage({ type: 'success', text: `Line-Up em PDF "${file.name}" publicado com sucesso! Data oficial: ${effectiveDate}` });

      // Automatically trigger smart text extraction on upload!
      triggerExtractFromPdf(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Handle saving custom PDF document date
  const handleSavePdfDate = () => {
    const trimmed = pdfDateInput.trim();
    if (!trimmed) {
      alert('Por favor, informe a data/hora do documento PDF.');
      return;
    }

    saveLineupLastUpdated(trimmed);
    if (pdfInfo) {
      const updatedPdf: UploadedPDFInfo = {
        ...pdfInfo,
        pdfDate: trimmed,
      };
      setPdfInfo(updatedPdf);
      saveUploadedPDF(updatedPdf);
      saveManagedVesselsWithRemote(vessels, updatedPdf, { user: 'controle', pass: 'casa8877$' }, trimmed);
    } else {
      saveManagedVesselsWithRemote(vessels, null, { user: 'controle', pass: 'casa8877$' }, trimmed);
    }
    setStatusMessage({ type: 'success', text: `Data do PDF atualizada para "${trimmed}" com sucesso!` });
  };

  // Remove PDF
  const handleRemovePdf = () => {
    if (window.confirm('Deseja remover o PDF do Line-Up ativo?')) {
      setPdfInfo(null);
      saveUploadedPDF(null);
      saveManagedVesselsWithRemote(vessels, null, { user: 'controle', pass: 'casa8877$' });
      setStatusMessage({ type: 'success', text: 'PDF do Line-Up removido.' });
    }
  };

  // Restore factory defaults
  const handleResetDefaults = () => {
    if (window.confirm('Atenção: Deseja restaurar a escala e dados originais de fábrica? Todas as edições manuais deste navegador serão reiniciadas.')) {
      resetManagedVessels();
      setVessels(getManagedVessels());
      setPdfInfo(null);
      setStatusMessage({ type: 'success', text: 'Dados originais restaurados com sucesso!' });
    }
  };

  // Filter vessels list for admin view
  const filteredVessels = vessels.filter((v) => {
    if (selectedMonthFilter === 'ALL') return true;
    const parts = v.eta.split('/');
    if (parts.length >= 2) {
      return parseInt(parts[1], 10) === selectedMonthFilter;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl h-[90vh] max-h-[850px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 p-0.5 shadow-md shadow-cyan-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Ship className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Painel de Controle Operacional
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[11px] font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  controle
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Edição em tempo real de escalas, horários, volumes e Line-Up PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setAdminLoggedIn(false);
                onLogout();
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Encerrar sessão administrativa"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              aria-label="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs inside Admin */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/70 shrink-0">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('vessels')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'vessels'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Ship className="w-3.5 h-3.5" />
              <span>Navios & Horários ({vessels.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pdf')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'pdf'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Line-Up em PDF {pdfInfo ? '✓' : ''}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Backup / Padrão</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>Data do PDF:</span>
              <span className="text-cyan-300 font-mono font-bold">{pdfDateInput || getLineupLastUpdated()}</span>
            </div>

          {activeTab === 'vessels' && (
            <div className="flex items-center gap-2">
              {pdfInfo && (
                <button
                  type="button"
                  onClick={() => triggerExtractFromPdf()}
                  disabled={isExtractingPdf}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/50 hover:bg-cyan-900/60 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                  title="Identificar e preencher novos horários a partir do PDF salvo"
                >
                  <Bot className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isExtractingPdf ? 'Lendo PDF...' : 'Extrair do PDF'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Navio</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAllVessels}
                disabled={isSaving}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          )}
          </div>
        </div>

        {/* Global Toast Notification */}
        {statusMessage && (
          <div className={`px-5 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800/80'
              : 'bg-rose-950/90 text-rose-200 border-rose-800/80'
          }`}>
            <span className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              )}
              {statusMessage.text}
            </span>
            <button 
              type="button" 
              onClick={() => setStatusMessage(null)}
              className="opacity-70 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab 1: Vessels List & Quick Editor */}
        {activeTab === 'vessels' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Filter by Month Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Filtrar mês:</span>
                <select
                  value={selectedMonthFilter}
                  onChange={(e) => setSelectedMonthFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-400 font-medium"
                >
                  <option value={9}>Setembro / 2026 (Atual)</option>
                  <option value={8}>Agosto / 2026</option>
                  <option value={7}>Julho / 2026</option>
                  <option value={6}>Junho / 2026</option>
                  <option value={5}>Maio / 2026</option>
                  <option value={4}>Abril / 2026</option>
                  <option value={3}>Março / 2026</option>
                  <option value={2}>Fevereiro / 2026</option>
                  <option value={1}>Janeiro / 2026</option>
                  <option value="ALL">Todos os Meses (2026)</option>
                </select>
              </div>

              <div className="text-xs text-slate-400">
                Mostrando <strong className="text-cyan-400">{filteredVessels.length}</strong> navios cadastrados
              </div>
            </div>

            {/* Quick banner for PDF Date */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Data oficial vinculada ao Line-Up (PDF): <strong className="text-cyan-300 font-mono font-bold">{pdfDateInput || getLineupLastUpdated()}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('pdf')}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
              >
                <span>Alterar data ou enviar novo PDF &rarr;</span>
              </button>
            </div>

            {/* List of Vessels */}
            <div className="space-y-3">
              {filteredVessels.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  Nenhum navio cadastrado para este mês. Clique em <strong>+ Adicionar Navio</strong> para incluir.
                </div>
              ) : (
                filteredVessels.map((v) => {
                  const isEditing = editingVesselId === v.id;

                  return (
                    <div
                      key={v.id}
                      className={`p-4 rounded-xl border transition-all ${
                        v.status === 'Em operação'
                          ? 'bg-emerald-950/20 border-emerald-800/80 shadow-lg shadow-emerald-950/20'
                          : isEditing
                          ? 'bg-slate-800/90 border-cyan-500/60 shadow-lg shadow-cyan-950/30'
                          : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      {/* Vessel Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/60">
                        <div className="flex items-center gap-3">
                          <span className={`w-3 h-3 rounded-full ${
                            v.status === 'Em operação'
                              ? 'bg-emerald-400 animate-pulse ring-4 ring-emerald-500/20'
                              : v.status === 'Concluído'
                              ? 'bg-cyan-500'
                              : 'bg-amber-400'
                          }`} />
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-white tracking-wide">
                                {v.vesselName}
                              </h4>
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                {v.voyageNumber}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {v.shipper} • {v.destination} • {v.flag}
                            </p>
                          </div>
                        </div>

                        {/* Status Select & Actions */}
                        <div className="flex items-center gap-2">
                          <select
                            value={v.status}
                            onChange={(e) => handleVesselChange(v.id, 'status', e.target.value)}
                            className={`text-xs font-bold rounded-lg px-2.5 py-1 border transition cursor-pointer ${
                              v.status === 'Em operação'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                : v.status === 'Concluído'
                                ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                                : 'bg-amber-950 text-amber-300 border-amber-700'
                            }`}
                          >
                            <option value="Em operação">Em operação</option>
                            <option value="Previsto">Previsto</option>
                            <option value="Concluído">Concluído</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => setEditingVesselId(isEditing ? null : v.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                              isEditing
                                ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                            }`}
                          >
                            {isEditing ? 'Fechar Edição' : 'Editar Horários & Sal'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteVessel(v.id, v.vesselName)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-800 transition cursor-pointer"
                            title="Remover navio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Always-visible Quick Summary Line */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-xs text-slate-300">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-mono">ETA (Chegada)</span>
                          <span className="font-semibold text-white">{v.eta || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-mono">ETB (Atracação)</span>
                          <span className="font-semibold text-white">{v.etb || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-mono">ETD (Saída)</span>
                          <span className="font-semibold text-white">{v.etd || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-mono">Volume Total</span>
                          <span className="font-bold text-cyan-400">
                            {v.totalVolumeTons.toLocaleString('pt-BR')} t
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            SC: {v.scVolumeTons.toLocaleString('pt-BR')} | SQ: {v.sqVolumeTons.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Editing Fields */}
                      {isEditing && (
                        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/80 p-3 rounded-xl">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">
                              Nome do Navio
                            </label>
                            <input
                              type="text"
                              value={v.vesselName}
                              onChange={(e) => handleVesselChange(v.id, 'vesselName', e.target.value.toUpperCase())}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-400"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">
                              Viagem / Código
                            </label>
                            <input
                              type="text"
                              value={v.voyageNumber}
                              onChange={(e) => handleVesselChange(v.id, 'voyageNumber', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-400"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">
                              Afretador / Shipper
                            </label>
                            <input
                              type="text"
                              value={v.shipper}
                              onChange={(e) => handleVesselChange(v.id, 'shipper', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-400"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-cyan-400 mb-1">
                              ETA (Chegada - DD/MM/AAAA HH:MM)
                            </label>
                            <input
                              type="text"
                              value={v.eta}
                              onChange={(e) => handleVesselChange(v.id, 'eta', e.target.value)}
                              placeholder="ex: 03/09/2026 00:01"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-400 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-cyan-400 mb-1">
                              ETB (Atracação - DD/MM/AAAA HH:MM)
                            </label>
                            <input
                              type="text"
                              value={v.etb}
                              onChange={(e) => handleVesselChange(v.id, 'etb', e.target.value)}
                              placeholder="ex: 03/09/2026 09:00"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-400 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-cyan-400 mb-1">
                              ETD (Desatracação - DD/MM/AAAA HH:MM)
                            </label>
                            <input
                              type="text"
                              value={v.etd}
                              onChange={(e) => handleVesselChange(v.id, 'etd', e.target.value)}
                              placeholder="ex: 06/09/2026 12:00"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-400 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-cyan-300 mb-1">
                              Sal Comum (Toneladas)
                            </label>
                            <input
                              type="number"
                              value={v.scVolumeTons}
                              onChange={(e) => handleVesselChange(v.id, 'scVolumeTons', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-400 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-emerald-400 mb-1">
                              Sal Químico (Toneladas)
                            </label>
                            <input
                              type="number"
                              value={v.sqVolumeTons}
                              onChange={(e) => handleVesselChange(v.id, 'sqVolumeTons', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-400 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">
                              Destino
                            </label>
                            <input
                              type="text"
                              value={v.destination}
                              onChange={(e) => handleVesselChange(v.id, 'destination', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-400"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">
                              Observações Operacionais
                            </label>
                            <input
                              type="text"
                              value={v.notes || ''}
                              onChange={(e) => handleVesselChange(v.id, 'notes', e.target.value)}
                              placeholder="ex: Atracado no Terminal Salineiro - Faina em andamento"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-400"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Upload PDF Line-Up */}
        {activeTab === 'pdf' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  Publicação do Line-Up Oficial em PDF
                </h3>
                <p className="text-xs text-slate-400 max-w-lg mx-auto">
                  Envie o arquivo PDF com o line-up oficial emitido pelo terminal. Ele ficará disponível para visualização e download direto para todos que acessarem o portal.
                </p>
              </div>

              {/* Upload Box */}
              <div className="border-2 border-dashed border-slate-700 hover:border-cyan-400/80 rounded-2xl p-8 text-center transition bg-slate-950/40 relative">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="pdf-upload-input"
                />
                <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">
                      Clique ou arraste o PDF do Line-Up aqui
                    </span>
                    <span className="text-xs text-slate-400">
                      Suporta documentos oficiais PDF até 15MB
                    </span>
                  </div>
                </div>
              </div>

              {/* Official Document Date Configuration */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Data Oficial de Emissão do PDF (Line-Up)
                    </span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-800/60">
                    Exibida no topo: "Atualizado: [data]"
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Defina ou ajuste a data e hora do documento oficial do Line-Up. Esta é a data que os usuários verão no cabeçalho do portal e no relatório do WhatsApp.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={pdfDateInput}
                      onChange={(e) => setPdfDateInput(e.target.value)}
                      placeholder="Ex: 05/09/2026 03:50"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSavePdfDate}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/20 cursor-pointer whitespace-nowrap"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Data do PDF</span>
                  </button>
                </div>
              </div>

              {/* Current Active PDF Info Card */}
              {pdfInfo ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 shadow-lg shadow-cyan-950/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{pdfInfo.fileName}</h4>
                        <p className="text-xs text-slate-400">
                          {(pdfInfo.fileSize / 1024).toFixed(1)} KB • Enviado em {pdfInfo.uploadedAt}
                        </p>
                        <p className="text-xs text-cyan-300 font-mono mt-0.5">
                          Data do documento: <strong>{pdfInfo.pdfDate || pdfInfo.uploadedAt}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={pdfInfo.dataUrl}
                        target="_blank"
                        rel="noreferrer"
                        download={pdfInfo.fileName}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar</span>
                      </a>

                      <button
                        type="button"
                        onClick={handleRemovePdf}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition cursor-pointer"
                        title="Remover este arquivo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-800/60 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Este PDF está ativo e um botão de download foi ativado no painel principal para os usuários.</span>
                  </div>

                  {/* Smart Extraction CTA inside PDF tab */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>Deseja ler novamente ou atualizar a escala através deste PDF?</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => triggerExtractFromPdf()}
                      disabled={isExtractingPdf}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold flex items-center gap-2 transition shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                    >
                      {isExtractingPdf ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Lendo PDF...</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-3.5 h-3.5" />
                          <span>Ler Horários do PDF Automaticamente</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
                  Nenhum arquivo PDF enviado no momento. A escala utiliza as tabelas interativas padrão.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Automatic PDF Extraction Review & Manual Approval */}
        {showExtractionReviewModal && (
          <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-cyan-500/60 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
              {/* Review Header */}
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Revisão da Extração Inteligente do PDF
                      <span className="text-xs font-normal text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-800/80">
                        {extractedCandidateVessels.length} navios identificados
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Você pode ajustar manualmente qualquer dado nesta tabela antes de aplicar à escala oficial.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowExtractionReviewModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Review Table / Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950/90 text-[11px] font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800">
                        <th className="p-3">Navio / Viagem</th>
                        <th className="p-3">ETA (Chegada)</th>
                        <th className="p-3">ETB (Atracação)</th>
                        <th className="p-3">ETD (Saída)</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Volume (Tons)</th>
                        <th className="p-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                      {extractedCandidateVessels.map((cand, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30 transition">
                          <td className="p-3">
                            <input
                              type="text"
                              value={cand.vesselName || ''}
                              onChange={(e) => {
                                const copy = [...extractedCandidateVessels];
                                copy[idx].vesselName = e.target.value.toUpperCase();
                                setExtractedCandidateVessels(copy);
                              }}
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-bold text-xs"
                            />
                            <span className="text-[10px] text-cyan-400 font-mono block mt-0.5">
                              {cand.voyageNumber || `SLN20260${idx + 40}`}
                            </span>
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={cand.eta || ''}
                              onChange={(e) => {
                                const copy = [...extractedCandidateVessels];
                                copy[idx].eta = e.target.value;
                                setExtractedCandidateVessels(copy);
                              }}
                              className="w-32 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-mono text-xs"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={cand.etb || ''}
                              onChange={(e) => {
                                const copy = [...extractedCandidateVessels];
                                copy[idx].etb = e.target.value;
                                setExtractedCandidateVessels(copy);
                              }}
                              className="w-32 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300 font-mono text-xs"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={cand.etd || ''}
                              onChange={(e) => {
                                const copy = [...extractedCandidateVessels];
                                copy[idx].etd = e.target.value;
                                setExtractedCandidateVessels(copy);
                              }}
                              className="w-32 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300 font-mono text-xs"
                            />
                          </td>
                          <td className="p-3">
                            <select
                              value={cand.status || 'Previsto'}
                              onChange={(e) => {
                                const copy = [...extractedCandidateVessels];
                                copy[idx].status = e.target.value as any;
                                setExtractedCandidateVessels(copy);
                              }}
                              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                            >
                              <option value="Previsto">Previsto</option>
                              <option value="Em operação">Em operação</option>
                              <option value="Concluído">Concluído</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={cand.scVolumeTons || 35000}
                              onChange={(e) => {
                                const copy = [...extractedCandidateVessels];
                                copy[idx].scVolumeTons = Number(e.target.value) || 0;
                                copy[idx].totalVolumeTons = (copy[idx].scVolumeTons || 0) + (copy[idx].sqVolumeTons || 0);
                                setExtractedCandidateVessels(copy);
                              }}
                              className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const copy = extractedCandidateVessels.filter((_, i) => i !== idx);
                                setExtractedCandidateVessels(copy);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40"
                              title="Remover este navio da importação"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                  <span className="font-bold text-slate-300 block flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Como você deseja salvar as alterações?
                  </span>
                  <p>
                    <strong>Mesclar com existentes:</strong> Atualiza os horários dos navios já cadastrados e adiciona os novos, preservando o histórico anterior.
                  </p>
                  <p>
                    <strong>Substituir escala atual:</strong> Define esta lista como a nova escala ativa oficial do terminal.
                  </p>
                </div>
              </div>

              {/* Review Footer */}
              <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowExtractionReviewModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Descartar / Cancelar
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyExtractedVessels('merge')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mesclar e Atualizar Horários</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyExtractedVessels('replace')}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-600/20 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Substituir Toda a Escala</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Settings & Backup */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-xl mx-auto space-y-6">
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                Restauração de Dados de Fábrica
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Caso queira descartar as edições manuais feitas no navegador e recarregar os 38 navios oficiais da base do sistema:
              </p>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-4 py-2 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/60 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restaurar Escala Original (Padrão)</span>
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-cyan-400" />
                Exportar Backup em JSON
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Faça o download de um arquivo JSON contendo todos os navios e horários atualmente configurados para segurança.
              </p>
              <button
                type="button"
                onClick={() => {
                  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(vessels, null, 2));
                  const dlAnchor = document.createElement('a');
                  dlAnchor.setAttribute('href', dataStr);
                  dlAnchor.setAttribute('download', `lineup_backup_${Date.now()}.json`);
                  dlAnchor.click();
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Baixar Backup (JSON)</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal New Vessel Overlay */}
        {isAddingNew && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-slate-900 border border-cyan-500/50 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  Adicionar Novo Navio à Programação
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Nome da Embarcação *</label>
                  <input
                    type="text"
                    value={newVessel.vesselName}
                    onChange={(e) => setNewVessel({ ...newVessel, vesselName: e.target.value })}
                    placeholder="Ex: CLIPPER HARMONY"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Número da Viagem</label>
                  <input
                    type="text"
                    value={newVessel.voyageNumber}
                    onChange={(e) => setNewVessel({ ...newVessel, voyageNumber: e.target.value })}
                    placeholder="Ex: SLN2026038"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Status Operacional</label>
                  <select
                    value={newVessel.status}
                    onChange={(e) => setNewVessel({ ...newVessel, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-bold"
                  >
                    <option value="Previsto">Previsto</option>
                    <option value="Em operação">Em operação</option>
                    <option value="Concluído">Concluído</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Afretador / Shipper</label>
                  <input
                    type="text"
                    value={newVessel.shipper}
                    onChange={(e) => setNewVessel({ ...newVessel, shipper: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-cyan-400 mb-1">ETA (Chegada - DD/MM/AAAA HH:MM)</label>
                  <input
                    type="text"
                    value={newVessel.eta}
                    onChange={(e) => setNewVessel({ ...newVessel, eta: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-cyan-400 mb-1">ETB (Atracação - DD/MM/AAAA HH:MM)</label>
                  <input
                    type="text"
                    value={newVessel.etb}
                    onChange={(e) => setNewVessel({ ...newVessel, etb: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-cyan-400 mb-1">ETD (Saída - DD/MM/AAAA HH:MM)</label>
                  <input
                    type="text"
                    value={newVessel.etd}
                    onChange={(e) => setNewVessel({ ...newVessel, etd: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Destino</label>
                  <input
                    type="text"
                    value={newVessel.destination}
                    onChange={(e) => setNewVessel({ ...newVessel, destination: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-cyan-300 mb-1">Sal Comum (Toneladas)</label>
                  <input
                    type="number"
                    value={newVessel.scVolumeTons}
                    onChange={(e) => setNewVessel({ ...newVessel, scVolumeTons: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-400 mb-1">Sal Químico (Toneladas)</label>
                  <input
                    type="number"
                    value={newVessel.sqVolumeTons}
                    onChange={(e) => setNewVessel({ ...newVessel, sqVolumeTons: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateVessel}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20"
                >
                  Confirmar e Adicionar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
