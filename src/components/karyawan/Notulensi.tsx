import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getAllNotulensi, getAllJudul, getSubJudulByJudul, createNotulensi, updateNotulensi, deleteNotulensi, getManualSessionsBySubJudul, addManualSession, getAllUsers } from '../../lib/database';
import type { Notulensi, Judul, SubJudul, NotulensiPihak } from '../../types';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import './NotulensiQuill.css'; // Tambahkan import custom CSS untuk Quill
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { PencilIcon, TrashIcon, DocumentDuplicateIcon, ArrowDownTrayIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { Card } from '../ui/Card';

const SESSIONS = [
  'Paparan Pendahuluan',
  'Paparan Antara',
  'Paparan Akhir',
  'Diskusi 01',
  'Diskusi 02',
  'Lainnya'
];

// Helper di luar komponen untuk mengambil state awal dari localStorage
const getInitialState = () => {
  const draft = localStorage.getItem('notulensi_draft');
  if (draft) {
    try {
      const parsed = JSON.parse(draft);
      // Pastikan data yang direstore valid
      if(parsed && typeof parsed === 'object') return parsed;
    } catch (e) {
      // Abaikan jika JSON tidak valid
    }
  }
  // Default state jika tidak ada draft
  return {
    tab: 'buat',
    showForm: false,
    editData: null,
    judulId: '',
    subJudulId: '',
    sesi: 'Paparan Pendahuluan',
    sesiLainnya: '',
    tanggal: '',
    tempat: '',
    catatan: '',
    pihak: [],
    pihakInput: '',
    perwakilanInput: '',
    perwakilanList: [],
    selectedJudul: null,
    selectedSubJudul: null,
    selectedSesi: '',
  };
};


const Notulensi: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isInitialMount = useRef(true);
  const [initialState] = useState(getInitialState);
  
  const [tab, setTab] = useState<'buat' | 'riwayat'>(initialState.tab);
  const [notulensi, setNotulensi] = useState<Notulensi[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(initialState.showForm);
  const [selected, setSelected] = useState<Notulensi | null>(null);
  const [editData, setEditData] = useState<Notulensi | null>(initialState.editData);

  // Form state diinisialisasi dari localStorage
  const [judulList, setJudulList] = useState<Judul[]>([]);
  const [subJudulList, setSubJudulList] = useState<SubJudul[]>([]);
  const [judulId, setJudulId] = useState(initialState.judulId);
  const [subJudulId, setSubJudulId] = useState(initialState.subJudulId);
  const [sesi, setSesi] = useState(initialState.sesi);
  const [sesiLainnya, setSesiLainnya] = useState(initialState.sesiLainnya);
  const [tanggal, setTanggal] = useState(initialState.tanggal);
  const [tempat, setTempat] = useState(initialState.tempat);
  const [catatan, setCatatan] = useState(initialState.catatan);
  const [pihak, setPihak] = useState<{ nama_pihak: string; perwakilan: string[] }[]>(initialState.pihak);
  const [pihakInput, setPihakInput] = useState(initialState.pihakInput);
  const [perwakilanInput, setPerwakilanInput] = useState(initialState.perwakilanInput);
  const [perwakilanList, setPerwakilanList] = useState<string[]>(initialState.perwakilanList);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // State for new UI flow
  const [selectedJudul, setSelectedJudul] = useState<Judul | null>(initialState.selectedJudul);
  const [selectedSubJudul, setSelectedSubJudul] = useState<SubJudul | null>(initialState.selectedSubJudul);
  const [selectedSesi, setSelectedSesi] = useState(initialState.selectedSesi);
  const [manualSessions, setManualSessions] = useState<string[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  
  // Filter state
  const [filter, setFilter] = useState({
    judul: '',
    subjudul: '',
    sesi: '',
    tahun: '',
    search: ''
  });

  useEffect(() => {
    if (user) fetchNotulensi();
    getAllJudul().then(setJudulList);
    getAllUsers().then(setUsers);
  }, [user]);

  // Handle edit data from admin
  useEffect(() => {
    if (location.state?.editData) {
      const editDataFromAdmin = location.state.editData;
      setEditData(editDataFromAdmin);
      setTab('riwayat'); // Langsung ke tab riwayat, bukan buat
      setShowForm(false); // Jangan tampilkan form buat
      
      // Set judul and subjudul
      const judul = judulList.find(j => j.id === editDataFromAdmin.judul_id);
      if (judul) {
        setSelectedJudul(judul);
        setJudulId(judul.id);
        
        // Load sub judul list for this judul
        getSubJudulByJudul(judul.id).then(subJudulList => {
          const subJudul = subJudulList.find(s => s.id === editDataFromAdmin.subjudul_id);
          if (subJudul) {
            setSelectedSubJudul(subJudul);
            setSubJudulId(subJudul.id);
          }
        });
      }
      
      // Set other fields immediately
      setSelectedSesi(editDataFromAdmin.sesi);
      setTanggal(editDataFromAdmin.tanggal);
      setTempat(editDataFromAdmin.tempat);
      setCatatan(editDataFromAdmin.catatan);
      setPihak(editDataFromAdmin.pihak?.map((p: any) => ({ nama_pihak: p.nama_pihak, perwakilan: p.perwakilan })) || []);
      
      // Clear the state to prevent re-triggering
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, judulList, navigate, location.pathname]);

  useEffect(() => {
    if (selectedJudul) {
      getSubJudulByJudul(selectedJudul.id).then(setSubJudulList);
    } else {
      setSubJudulList([]);
      setSelectedSubJudul(null);
    }
  }, [selectedJudul]);

  useEffect(() => {
    if (selectedSubJudul) {
      setSesi(SESSIONS.includes(selectedSesi) ? selectedSesi : 'Lainnya');
      setSesiLainnya(SESSIONS.includes(selectedSesi) ? '' : selectedSesi);
    }
  }, [selectedSubJudul, selectedSesi]);

  useEffect(() => {
    if (selectedSubJudul && !editData) {
      setSesi('');
      setSesiLainnya('');
      setTanggal('');
      setTempat('');
      setCatatan('');
      setPihak([]);
      setPihakInput('');
      setPerwakilanInput('');
      setPerwakilanList([]);
      setError('');
    }
  }, [selectedSubJudul, editData]);

  useEffect(() => {
    if (editData) {
      // Set sesi
      if (SESSIONS.includes(editData.sesi)) {
        setSesi(editData.sesi);
        setSesiLainnya('');
      } else {
        setSesi('Lainnya');
        setSesiLainnya(editData.sesi);
      }
      
      // Set other fields
      setTanggal(editData.tanggal);
      setTempat(editData.tempat);
      setCatatan(editData.catatan);
      setPihak(editData.pihak?.map(p => ({ nama_pihak: p.nama_pihak, perwakilan: p.perwakilan })) || []);
    }
  }, [editData]);

  useEffect(() => {
    if (selectedSubJudul) {
      setLoadingSessions(true);
      getManualSessionsBySubJudul(selectedSubJudul.id)
        .then(setManualSessions)
        .finally(() => setLoadingSessions(false));
    } else {
      setManualSessions([]);
    }
  }, [selectedSubJudul]);

  const fetchNotulensi = async () => {
    setLoading(true);
    try {
      const data = await getAllNotulensi(); // Ambil semua notulensi, tanpa filter user.id
      setNotulensi(data);
    } catch (e) {
      alert('Gagal memuat notulensi');
    }
    setLoading(false);
  };

  // useEffect untuk menyimpan draft ke localStorage
  useEffect(() => {
    // Jangan simpan draft saat edit dari admin
    if (location.state?.editData) return;
    
    const draftState = {
      tab, showForm, editData, judulId, subJudulId, sesi, sesiLainnya,
      tanggal, tempat, catatan, pihak, pihakInput, perwakilanInput,
      perwakilanList, selectedJudul, selectedSubJudul, selectedSesi,
    };
    localStorage.setItem('notulensi_draft', JSON.stringify(draftState));
  }, [
    tab, showForm, editData, judulId, subJudulId, sesi, sesiLainnya,
    tanggal, tempat, catatan, pihak, pihakInput, perwakilanInput,
    perwakilanList, selectedJudul, selectedSubJudul, selectedSesi,
    location.state
  ]);

  // Hapus useEffect yang lama untuk restore draft

  const resetForm = () => {
    localStorage.removeItem('notulensi_draft');
    setJudulId('');
    setSubJudulId('');
    setSesi('Paparan Pendahuluan');
    setSesiLainnya('');
    setTanggal('');
    setTempat('');
    setCatatan('');
    setPihak([]);
    setPihakInput('');
    setPerwakilanInput('');
    setPerwakilanList([]);
    setEditData(null);
    setError('');
  };

  const handleAddPihak = () => {
    if (!pihakInput || perwakilanList.length === 0) return;
    setPihak([...pihak, { nama_pihak: pihakInput, perwakilan: perwakilanList }]);
    setPihakInput('');
    setPerwakilanInput('');
    setPerwakilanList([]);
  };

  const handleAddPerwakilan = () => {
    if (!perwakilanInput) return;
    setPerwakilanList([...perwakilanList, perwakilanInput]);
    setPerwakilanInput('');
  };

  const handleRemovePihak = (idx: number) => {
    setPihak(pihak.filter((_, i) => i !== idx));
  };

  const handleRemovePerwakilan = (idx: number) => {
    setPerwakilanList(perwakilanList.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user?.id || !selectedJudul || !selectedSubJudul || !selectedSesi || !tanggal || !tempat || !catatan || pihak.length === 0) {
      setError('Semua field wajib diisi!');
      return;
    }
    setSaving(true);
    try {
      const sesiValue = selectedSesi;
      const notulensiData = {
        user_id: user.id,
        judul_id: selectedJudul.id,
        subjudul_id: selectedSubJudul.id,
        sesi: sesiValue,
        tanggal,
        tempat,
        catatan
      };
      if (editData) {
        await updateNotulensi(editData.id, notulensiData, pihak, user.id);
      } else {
        await createNotulensi(notulensiData, pihak, user.id);
      }
      setEditData(null);
      setShowForm(false);
      resetForm();
      await fetchNotulensi();
    } catch (e: any) {
      // Setelah error, fetch ulang data dan cek hasilnya langsung
      const latest = await getAllNotulensi(user.id);
      const found = latest.find(n =>
        n.judul_id === selectedJudul.id &&
        n.subjudul_id === selectedSubJudul.id &&
        n.sesi === selectedSesi &&
        n.tanggal === tanggal &&
        n.tempat === tempat
      );
      if (found) {
        setError('');
        setShowForm(false);
        resetForm();
        setNotulensi(latest); // update state agar riwayat langsung muncul
      } else {
        setError('Gagal menyimpan notulensi');
      }
    }
    setSaving(false);
  };

  const handleAddManualSession = async () => {
    if (!selectedSubJudul || !sesiLainnya.trim()) return;
    await addManualSession(selectedSubJudul.id, sesiLainnya.trim());
    setSesiLainnya('');
    const sessions = await getManualSessionsBySubJudul(selectedSubJudul.id);
    setManualSessions(sessions);
  };

  // Export PDF
  const handleExportPDF = (n: Notulensi) => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Notulensi: ${n.sesi} (${n.subjudul?.nama}) (${new Date(n.tanggal).getFullYear()})`, 10, 15);
    doc.setFontSize(11);
    doc.text(`Judul: ${n.judul?.nama}`, 10, 25);
    doc.text(`Sub Judul: ${n.subjudul?.nama}`, 10, 32);
    doc.text(`Tanggal: ${n.tanggal}`, 10, 39);
    doc.text(`Tempat: ${n.tempat}`, 10, 46);
    let y = 53;
    n.pihak?.forEach((p, i) => {
      doc.text(`Pihak ${i + 1}: ${p.nama_pihak}`, 10, y);
      y += 7;
      doc.text(`Perwakilan: ${p.perwakilan.join(', ')}`, 15, y);
      y += 7;
    });
    doc.text('Catatan:', 10, y);
    y += 7;
    doc.setFontSize(10);
    doc.text(stripHtml(n.catatan), 10, y, { maxWidth: 180 });
    doc.save(`${n.sesi} (${n.subjudul?.nama}) (${new Date(n.tanggal).getFullYear()}).pdf`);
  };

  // Export Word
  const handleExportWord = async (n: Notulensi) => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({ text: `Notulensi: ${n.sesi} (${n.subjudul?.nama}) (${new Date(n.tanggal).getFullYear()})`, heading: 'Heading1' }),
            new Paragraph({ text: `Judul: ${n.judul?.nama}` }),
            new Paragraph({ text: `Sub Judul: ${n.subjudul?.nama}` }),
            new Paragraph({ text: `Tanggal: ${n.tanggal}` }),
            new Paragraph({ text: `Tempat: ${n.tempat}` }),
            ...((n.pihak || []).map((p, i) => [
              new Paragraph({ text: `Pihak ${i + 1}: ${p.nama_pihak}` }),
              new Paragraph({ text: `Perwakilan: ${p.perwakilan.join(', ')}` })
            ]).flat()),
            new Paragraph({ text: 'Catatan:' }),
            ...htmlToDocxParagraphs(n.catatan)
          ]
        }
      ]
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${n.sesi} (${n.subjudul?.nama}) (${new Date(n.tanggal).getFullYear()}).docx`);
  };

  // Copy to clipboard
  const handleCopy = (n: Notulensi) => {
    const text = `Notulensi: ${n.sesi} (${n.subjudul?.nama}) (${new Date(n.tanggal).getFullYear()})\nJudul: ${n.judul?.nama}\nSub Judul: ${n.subjudul?.nama}\nTanggal: ${n.tanggal}\nTempat: ${n.tempat}\n` +
      (n.pihak || []).map((p, i) => `Pihak ${i + 1}: ${p.nama_pihak}\nPerwakilan: ${p.perwakilan.join(', ')}`).join('\n') +
      `\nCatatan:\n${stripHtml(n.catatan)}`;
    navigator.clipboard.writeText(text);
    alert('Catatan berhasil disalin ke clipboard!');
  };

  // Helper: strip HTML tags
  function stripHtml(html: string) {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  // Helper: convert HTML to docx Paragraphs (simple)
  function htmlToDocxParagraphs(html: string) {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return [new Paragraph({ text: tmp.textContent || tmp.innerText || '' })];
  }

  // Cek sesi yang sudah ada notulensi untuk sub judul ini
  const sesiSudahAda = notulensi
    .filter(n => n.subjudul_id === selectedSubJudul?.id)
    .map(n => n.sesi);

  // Gabungkan sesi default + sesi manual (tanpa duplikat)
  const allSessions = Array.from(new Set([
    ...SESSIONS.filter(s => s !== 'Lainnya'),
    ...manualSessions
  ]));

  const handleBackToJudul = () => {
    setSelectedJudul(null);
    setSelectedSubJudul(null);
    setSelectedSesi('');
    setTanggal('');
    setTempat('');
    setCatatan('');
    setPihak([]);
    setPerwakilanList([]);
    setPihakInput('');
    setPerwakilanInput('');
    setEditData(null);
  };
  
  const handleBackToSubJudul = () => {
    setSelectedSubJudul(null);
    setSelectedSesi('');
  };

  const handleBackToSesi = () => {
    setSelectedSesi('');
  };

  return (
    <div className="min-h-screen py-8 px-4 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-5 py-2 rounded-xl glass-effect border border-cyan-400/30 text-cyan-200 font-semibold shadow-md hover:bg-cyan-700/20 hover:text-white transition w-full sm:w-auto"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Kembali
          </button>
          <div>
            <h1 className="text-2xl sm:text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-1 drop-shadow-lg">Notulensi Kegiatan</h1>
            <div className="text-cyan-200 text-sm sm:text-lg font-medium opacity-80">Catat dan kelola hasil paparan & diskusi kegiatan</div>
          </div>
        </div>
      </div>
      <div className="mb-8 flex gap-4">
        <button className={`px-4 py-2 rounded-xl font-bold text-lg ${tab==='buat'?'bg-cyan-600 text-white shadow-md':'bg-slate-700 text-cyan-200'}`} onClick={()=>setTab('buat')}>Buat Notulensi</button>
        <button className={`px-4 py-2 rounded-xl font-bold text-lg ${tab==='riwayat'?'bg-cyan-600 text-white shadow-md':'bg-slate-700 text-cyan-200'}`} onClick={()=>setTab('riwayat')}>Riwayat Notulensi</button>
      </div>
      {tab === 'buat' && (
        <>
          {editData ? (
            // Render form input langsung saat editData ada
            <form onSubmit={handleSubmit} className="space-y-6 bg-slate-800 p-8 rounded-xl border border-cyan-700 max-w-2xl mx-auto shadow-lg">
              <div className="text-cyan-300 font-bold text-2xl mb-4">Edit Notulensi</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-300 mb-1">Judul</label>
                  <input type="text" value={selectedJudul?.nama || ''} disabled className="w-full px-4 py-2 rounded bg-slate-700 text-gray-200 text-lg" />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Sub Judul</label>
                  <input type="text" value={selectedSubJudul?.nama || ''} disabled className="w-full px-4 py-2 rounded bg-slate-700 text-gray-200 text-lg" />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Sesi</label>
                  <input type="text" value={selectedSesi} disabled className="w-full px-4 py-2 rounded bg-slate-700 text-gray-200 text-lg" />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Tanggal</label>
                  <input type="date" value={tanggal} onChange={e=>setTanggal(e.target.value)} className="w-full px-4 py-2 rounded bg-slate-700 text-gray-200 text-lg" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-gray-300 mb-1">Tempat</label>
                  <input type="text" value={tempat} onChange={e=>setTempat(e.target.value)} className="w-full px-4 py-2 rounded bg-slate-700 text-gray-200 text-lg" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-gray-300 mb-1">Pihak & Perwakilan</label>
                  <div className="flex flex-col md:flex-row gap-2 mb-2">
                    <input type="text" placeholder="Nama Pihak" value={pihakInput} onChange={e=>setPihakInput(e.target.value)} className="px-4 py-2 rounded bg-slate-700 text-gray-200 text-lg flex-1" />
                    <input type="text" placeholder="Perwakilan (tekan Enter)" value={perwakilanInput} onChange={e=>setPerwakilanInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();handleAddPerwakilan();}}} className="px-4 py-2 rounded bg-slate-700 text-gray-200 text-lg flex-1" />
                    <button type="button" className="bg-cyan-600 px-4 py-2 rounded text-white font-semibold" onClick={handleAddPihak}>Tambah Pihak</button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {perwakilanList.map((p,i)=>(<span key={i} className="bg-cyan-700 text-white px-3 py-1 rounded text-base">{p} <button type="button" onClick={()=>handleRemovePerwakilan(i)}>&times;</button></span>))}
                  </div>
                  <div className="space-y-1">
                    {pihak.map((p,i)=>(<div key={i} className="bg-slate-700 text-cyan-200 px-3 py-2 rounded flex items-center justify-between text-base"><span><b>{p.nama_pihak}</b>: {p.perwakilan.join(', ')}</span> <button type="button" onClick={()=>handleRemovePihak(i)} className="text-red-400 ml-2">Hapus</button></div>))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-gray-300 mb-1 text-lg">Catatan</label>
                <div className="rounded overflow-hidden border-2 border-cyan-700 bg-white">
                  <ReactQuill theme="snow" value={catatan} onChange={setCatatan} style={{ minHeight: 220, fontSize: 18 }} className="text-lg quill-notulensi" />
                </div>
              </div>
              {error && <div className="text-red-400 text-base font-semibold">{error}</div>}
              <div className="flex gap-4 mt-4">
                <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-3 rounded text-lg font-bold flex-1" disabled={saving}>{saving?'Menyimpan...':'Simpan Notulensi'}</button>
                <button type="button" className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded text-lg font-bold flex-1" onClick={()=>{setSelectedSesi('');resetForm();}}>Batal</button>
              </div>
            </form>
          ) : (
            // Alur pilih judul/subjudul/sesi seperti biasa
            <>
              {!selectedJudul ? (
                <div>
                  <div className="mb-6 text-cyan-300 font-semibold text-2xl">Pilih Judul Kegiatan:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {judulList.map(j => (
                      <Card key={j.id} className="p-8 flex items-center justify-center text-center font-bold text-2xl text-cyan-100 cursor-pointer">
                        <div onClick={()=>setSelectedJudul(j)} className="w-full h-full flex items-center justify-center">
                          <span className="drop-shadow-lg">{j.nama}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : !selectedSubJudul ? (
                <div>
                  <button className="mb-4 text-cyan-400 hover:underline" onClick={handleBackToJudul}>&larr; Kembali ke Judul</button>
                  <div className="mb-2 text-cyan-300 font-semibold">Pilih Sub Judul:</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subJudulList.map(s => (
                      <Card key={s.id} className="p-4 text-left cursor-pointer">
                        <div onClick={()=>setSelectedSubJudul(s)} className="w-full h-full">
                          <div className="font-bold text-cyan-200">{s.nama}</div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : !selectedSesi ? (
                <div>
                  <button className="mb-4 text-cyan-400 hover:underline" onClick={handleBackToSubJudul}>&larr; Kembali ke Sub Judul</button>
                  <div className="mb-2 text-cyan-300 font-semibold">Pilih Sesi:</div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {allSessions.map(s => (
                      <Card key={s} className={`px-5 py-2 text-cyan-100 font-semibold text-lg cursor-pointer flex items-center gap-2 ${sesiSudahAda.includes(s) ? 'ring-2 ring-green-400/70' : ''}`}>
                        <div onClick={()=>setSelectedSesi(s)} className="w-full h-full flex items-center gap-2" style={{ pointerEvents: loadingSessions ? 'none' : 'auto' }}>
                          {sesiSudahAda.includes(s) && <span className="inline-block w-3 h-3 bg-green-400 rounded-full mr-1" title="Sudah ada notulensi"></span>}
                          {s}
                        </div>
                      </Card>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input type="text" placeholder="Tambah sesi manual..." value={sesiLainnya} onChange={e=>setSesiLainnya(e.target.value)} className="px-4 py-2 rounded bg-slate-700 text-gray-200 text-lg" />
                    <button type="button" className="bg-cyan-600 px-4 py-2 rounded text-white font-semibold" disabled={!sesiLainnya.trim() || loadingSessions} onClick={handleAddManualSession}>Tambah</button>
                  </div>
                </div>
              ) : (
                <div>
                  <button className="mb-4 text-cyan-400 hover:underline" onClick={handleBackToSesi}>&larr; Kembali ke Sesi</button>
                  <form onSubmit={handleSubmit} className="space-y-6 bg-slate-800 p-8 rounded-xl border border-cyan-700 max-w-2xl mx-auto shadow-lg">
                    <div className="text-cyan-300 font-bold text-2xl mb-4">Input Notulensi</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-gray-300 mb-1">Judul</label>
                        <input type="text" value={selectedJudul?.nama || ''} disabled className="w-full px-4 py-2 rounded bg-slate-700 text-gray-200 text-lg" />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-1">Sub Judul</label>
                        <input type="text" value={selectedSubJudul?.nama || ''} disabled className="w-full px-4 py-2 rounded bg-slate-700 text-gray-200 text-lg" />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-1">Sesi</label>
                        <input type="text" value={selectedSesi} disabled className="w-full px-4 py-2 rounded bg-slate-700 text-gray-200 text-lg" />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-1">Tanggal</label>
                        <input type="date" value={tanggal} onChange={e=>setTanggal(e.target.value)} className="w-full px-4 py-2 rounded bg-slate-700 text-gray-200 text-lg" required />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-gray-300 mb-1">Tempat</label>
                        <input type="text" value={tempat} onChange={e=>setTempat(e.target.value)} className="w-full px-4 py-2 rounded bg-slate-700 text-gray-200 text-lg" required />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-gray-300 mb-1">Pihak & Perwakilan</label>
                        <div className="flex flex-col md:flex-row gap-2 mb-2">
                          <input type="text" placeholder="Nama Pihak" value={pihakInput} onChange={e=>setPihakInput(e.target.value)} className="px-4 py-2 rounded bg-slate-700 text-gray-200 text-lg flex-1" />
                          <input type="text" placeholder="Perwakilan (tekan Enter)" value={perwakilanInput} onChange={e=>setPerwakilanInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();handleAddPerwakilan();}}} className="px-4 py-2 rounded bg-slate-700 text-gray-200 text-lg flex-1" />
                          <button type="button" className="bg-cyan-600 px-4 py-2 rounded text-white font-semibold" onClick={handleAddPihak}>Tambah Pihak</button>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {perwakilanList.map((p,i)=>(<span key={i} className="bg-cyan-700 text-white px-3 py-1 rounded text-base">{p} <button type="button" onClick={()=>handleRemovePerwakilan(i)}>&times;</button></span>))}
                        </div>
                        <div className="space-y-1">
                          {pihak.map((p,i)=>(<div key={i} className="bg-slate-700 text-cyan-200 px-3 py-2 rounded flex items-center justify-between text-base"><span><b>{p.nama_pihak}</b>: {p.perwakilan.join(', ')}</span> <button type="button" onClick={()=>handleRemovePihak(i)} className="text-red-400 ml-2">Hapus</button></div>))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-1 text-lg">Catatan</label>
                      <div className="rounded overflow-hidden border-2 border-cyan-700 bg-white">
                        <ReactQuill theme="snow" value={catatan} onChange={setCatatan} style={{ minHeight: 220, fontSize: 18 }} className="text-lg quill-notulensi" />
                      </div>
                    </div>
                    {error && <div className="text-red-400 text-base font-semibold">{error}</div>}
                    <div className="flex gap-4 mt-4">
                      <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-3 rounded text-lg font-bold flex-1" disabled={saving}>{saving?'Menyimpan...':'Simpan Notulensi'}</button>
                      <button type="button" className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded text-lg font-bold flex-1" onClick={()=>{setSelectedSesi('');resetForm();}}>Batal</button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </>
      )}
      {tab === 'riwayat' && (
        <div className="space-y-6">
          {/* Filter Section */}
          <div className="flex flex-wrap gap-4 mb-8">
            <select 
              className="px-4 py-2 glass-effect border border-cyan-400/30 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 [&>option]:bg-slate-800 [&>option]:text-white" 
              value={filter.judul} 
              onChange={e => setFilter(f => ({ ...f, judul: e.target.value, subjudul: '' }))}
            >
              <option value="">Semua Judul</option>
              {judulList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
            </select>
            <select 
              className="px-4 py-2 glass-effect border border-cyan-400/30 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 [&>option]:bg-slate-800 [&>option]:text-white" 
              value={filter.subjudul} 
              onChange={e => setFilter(f => ({ ...f, subjudul: e.target.value }))}
            >
              <option value="">Semua Sub Judul</option>
              {filter.judul ? 
                subJudulList.filter(s => s.judul_id === filter.judul).map(s => <option key={s.id} value={s.id}>{s.nama}</option>) :
                subJudulList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)
              }
            </select>
            <select 
              className="px-4 py-2 glass-effect border border-cyan-400/30 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 [&>option]:bg-slate-800 [&>option]:text-white" 
              value={filter.sesi} 
              onChange={e => setFilter(f => ({ ...f, sesi: e.target.value }))}
            >
              <option value="">Semua Sesi</option>
              {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              className="px-4 py-2 glass-effect border border-cyan-400/30 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 [&>option]:bg-slate-800 [&>option]:text-white" 
              value={filter.tahun} 
              onChange={e => setFilter(f => ({ ...f, tahun: e.target.value }))}
            >
              <option value="">Semua Tahun</option>
              {Array.from({ length: 5 }, (_, i) => (
                <option key={2025 + i} value={2025 + i}>{2025 + i}</option>
              ))}
            </select>
            <input 
              className="px-4 py-2 glass-effect border border-cyan-400/30 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400" 
              type="text" 
              placeholder="Cari notulensi..." 
              value={filter.search} 
              onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} 
            />
          </div>
          
          {/* Filtered Results */}
          {(() => {
            let filteredNotulensi = notulensi;
            
            // Filter by judul
            if (filter.judul) {
              filteredNotulensi = filteredNotulensi.filter(n => n.judul_id === filter.judul);
            }
            
            // Filter by subjudul
            if (filter.subjudul) {
              filteredNotulensi = filteredNotulensi.filter(n => n.subjudul_id === filter.subjudul);
            }
            
            // Filter by sesi
            if (filter.sesi) {
              filteredNotulensi = filteredNotulensi.filter(n => n.sesi === filter.sesi);
            }
            
            // Filter by tahun
            if (filter.tahun) {
              filteredNotulensi = filteredNotulensi.filter(n => n.tanggal.startsWith(filter.tahun));
            }
            
            // Filter by search
            if (filter.search) {
              const searchLower = filter.search.toLowerCase();
              filteredNotulensi = filteredNotulensi.filter(n => 
                n.judul?.nama?.toLowerCase().includes(searchLower) ||
                n.subjudul?.nama?.toLowerCase().includes(searchLower) ||
                n.sesi?.toLowerCase().includes(searchLower) ||
                n.tempat?.toLowerCase().includes(searchLower) ||
                n.catatan?.toLowerCase().includes(searchLower)
              );
            }
            
            return (
              <>
                {loading ? (
                  <div className="text-gray-400">Memuat data...</div>
                ) : filteredNotulensi.length === 0 ? (
                  <div className="text-gray-400">
                    {notulensi.length === 0 ? "Belum ada notulensi." : "Tidak ada notulensi sesuai filter."}
                  </div>
                ) : (
                                    filteredNotulensi.map(n => (
                    <Card key={n.id} className={`relative ${expandedId === n.id ? 'ring-2 ring-cyan-400/60' : ''}`}>
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === n.id ? null : n.id)}>
                        <div>
                          <div className="font-bold text-cyan-200 text-xl mb-1">{n.judul?.nama} {n.subjudul ? <span className="text-cyan-400">/ {n.subjudul.nama}</span> : ''}</div>
                          <div className="text-sm text-cyan-100 mb-1">Sesi: {n.sesi} | Tanggal: {n.tanggal}</div>
                          <div className="text-sm text-cyan-300">Diedit oleh: {users.filter(u => n.edited_by?.includes(u.id)).map(u => u.nama).join(', ') || n.user?.nama}</div>
                        </div>
                        <div className="flex flex-row flex-wrap gap-2 justify-end w-full sm:w-auto">
                          <button title="Edit" className="p-2 rounded hover:bg-cyan-700/30" onClick={async e => {
                            e.stopPropagation();
                            setSelected(null); // Tutup modal detail!
                            setTab('buat');
                            setEditData(n);
                            setShowForm(true);
                            const judul = judulList.find(j => j.id === n.judul_id) || null;
                            setSelectedJudul(judul);
                            if (judul) {
                              const subList = await getSubJudulByJudul(judul.id);
                              setSubJudulList(subList);
                              setSelectedSubJudul(subList.find(s => s.id === n.subjudul_id) || null);
                            } else {
                              setSelectedSubJudul(null);
                            }
                            setSelectedSesi(n.sesi);
                            setTanggal(n.tanggal);
                            setTempat(n.tempat);
                            setCatatan(n.catatan);
                            setPihak(n.pihak?.map(p => ({ nama_pihak: p.nama_pihak, perwakilan: p.perwakilan })) || []);
                          }}><PencilIcon className="w-5 h-5 text-yellow-400" /></button>
                          <button title="Hapus" className="p-2 rounded hover:bg-red-700/30" onClick={async e => {e.stopPropagation(); if(window.confirm('Yakin hapus notulensi ini?')){ await deleteNotulensi(n.id); fetchNotulensi(); }}}><TrashIcon className="w-5 h-5 text-red-400" /></button>
                          <button title="Copy" className="p-2 rounded hover:bg-gray-700/30" onClick={e => {e.stopPropagation(); handleCopy(n);}}><DocumentDuplicateIcon className="w-5 h-5 text-gray-200" /></button>
                          <div className="relative group">
                            <button title="Export" className="p-2 rounded hover:bg-blue-700/30" onClick={e => {e.stopPropagation(); setExpandedId(expandedId === n.id ? null : n.id);}}><ArrowDownTrayIcon className="w-5 h-5 text-blue-400" /></button>
                            <div className="absolute right-0 mt-2 z-10 hidden group-hover:block bg-slate-900 border border-cyan-400/30 rounded shadow-lg">
                              <button className="block w-full px-4 py-2 text-cyan-200 hover:bg-cyan-700/30" onClick={e => {e.stopPropagation(); handleExportPDF(n);}}>Export PDF</button>
                              <button className="block w-full px-4 py-2 text-cyan-200 hover:bg-cyan-700/30" onClick={e => {e.stopPropagation(); handleExportWord(n);}}>Export Word</button>
                            </div>
                          </div>
                          <button className="ml-2 p-2 rounded hover:bg-cyan-700/20">
                            {expandedId === n.id ? <ChevronUpIcon className="w-5 h-5 text-cyan-300" /> : <ChevronDownIcon className="w-5 h-5 text-cyan-300" />}
                          </button>
                        </div>
                      </div>
                      {expandedId === n.id && (
                        <div className="px-8 pb-6">
                          <div className="mb-2 text-cyan-200"><b>Pihak:</b>
                            <ul className="ml-4 list-disc">
                              {n.pihak?.map((p, i) => (
                                <li key={i}><b>{p.nama_pihak}</b>: {p.perwakilan.join(', ')}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="mb-2 text-cyan-200"><b>Catatan:</b></div>
                          <div className="prose prose-invert bg-slate-900/80 rounded p-3 mb-2" dangerouslySetInnerHTML={{ __html: n.catatan }} />
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </>
            );
          })()}
        </div>
      )}
      {(selected && !(showForm || editData)) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-lg p-8 max-w-lg w-full overflow-y-auto max-h-[90vh]">
            <div className="text-lg font-bold mb-4 text-cyan-400">Detail Notulensi</div>
            <div className="mb-2 text-gray-300"><b>Judul:</b> {selectedJudul?.nama || ''}</div>
            <div className="mb-2 text-gray-300"><b>Sub Judul:</b> {selectedSubJudul?.nama || ''}</div>
            <div className="mb-2 text-gray-300"><b>Sesi:</b> {selectedSesi}</div>
            <div className="mb-2 text-gray-300"><b>Tanggal:</b> {tanggal}</div>
            <div className="mb-2 text-gray-300"><b>Tempat:</b> {tempat}</div>
            <div className="mb-2 text-gray-300"><b>Pihak:</b>
              <ul className="ml-4 list-disc">
                {pihak.map((p, i) => (
                  <li key={i}><b>{p.nama_pihak}</b>: {p.perwakilan.join(', ')}</li>
                ))}
              </ul>
            </div>
            <div className="mb-2 text-gray-300"><b>Catatan:</b></div>
            <div className="prose prose-invert bg-slate-800 rounded p-3 mb-4" dangerouslySetInnerHTML={{ __html: catatan }} />
            <div className="flex flex-wrap gap-2 mt-4">
              <button className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 rounded" onClick={() => handleExportPDF(selected)}>Export PDF</button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded" onClick={() => handleExportWord(selected)}>Export Word</button>
              <button className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded" onClick={() => handleCopy(selected)}>Copy</button>
              <button className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded" onClick={() => {
                setTab('buat'); // Langsung pindah ke tab Buat Notulensi
                setEditData(selected);
                setSelected(null);
                setSelectedJudul(judulList.find(j => j.id === selected?.judul_id) || null);
                setSelectedSubJudul(subJudulList.find(s => s.id === selected?.subjudul_id) || null);
                setSelectedSesi((selected)?.sesi || '');
                setTanggal((selected)?.tanggal || '');
                setTempat((selected)?.tempat || '');
                setCatatan((selected)?.catatan || '');
                setPihak((selected)?.pihak?.map(p => ({ nama_pihak: p.nama_pihak, perwakilan: p.perwakilan })) || []);
                setShowForm(true);
              }}>
                Edit
              </button>
              <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded" onClick={async () => {
                if (window.confirm('Yakin hapus notulensi ini?')) {
                  await deleteNotulensi((selected)?.id || '');
                  setSelected(null);
                  fetchNotulensi();
                }
              }}>Hapus</button>
              <button className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-1 rounded ml-auto" onClick={() => setSelected(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notulensi; 