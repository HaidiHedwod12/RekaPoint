import React, { useEffect, useState } from 'react';
import { getAllNotulensi, getAllJudul, getSubJudulByJudul, updateNotulensi, deleteNotulensi } from '../../lib/database';
import type { Notulensi, Judul, SubJudul } from '../../types';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph } from 'docx';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon, TrashIcon, DocumentDuplicateIcon, ArrowDownTrayIcon, ChevronDownIcon, ChevronUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { motion } from 'framer-motion';

const SESSIONS = [
  'Paparan Pendahuluan',
  'Paparan Antara',
  'Paparan Akhir',
  'Diskusi 01',
  'Diskusi 02',
  'Lainnya'
];

const NotulensiAdmin: React.FC = () => {
  const [notulensi, setNotulensi] = useState<Notulensi[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Notulensi | null>(null);
  const [editData, setEditData] = useState<Notulensi | null>(null);
  const [judulList, setJudulList] = useState<Judul[]>([]);
  const [subJudulList, setSubJudulList] = useState<SubJudul[]>([]);
  const [filter, setFilter] = useState({ judul: '', subjudul: '', sesi: '', tahun: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchNotulensi();
    getAllJudul().then(setJudulList);
  }, []);

  useEffect(() => {
    if (filter.judul) {
      getSubJudulByJudul(filter.judul).then(setSubJudulList);
    } else {
      setSubJudulList([]);
    }
  }, [filter.judul]);

  const fetchNotulensi = async () => {
    setLoading(true);
    try {
      const data = await getAllNotulensi();
      setNotulensi(data);
    } catch (e) {
      alert('Gagal memuat notulensi');
    }
    setLoading(false);
  };

  // Filtered notulensi
  const filtered = notulensi.filter(n =>
    (!filter.judul || n.judul_id === filter.judul) &&
    (!filter.subjudul || n.subjudul_id === filter.subjudul) &&
    (!filter.sesi || n.sesi === filter.sesi) &&
    (!filter.tahun || n.tanggal.startsWith(filter.tahun))
  );

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

  return (
    <div className="min-h-screen py-8 relative">
      {/* Background elements */}
      <div className="fixed top-20 right-20 opacity-10">
        <DocumentTextIcon className="w-64 h-64 text-cyan-400" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="border-cyan-500/50 text-cyan-300 w-full sm:w-auto"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Kembali
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Notulensi Admin
                </h1>
                <p className="text-gray-400 mt-1 text-sm sm:text-base">Lihat dan kelola hasil notulensi kegiatan</p>
              </div>
            </div>
          </div>
        </motion.div>
        {/* Filter */}
        <div className="flex flex-wrap gap-4 mb-8">
          <select className="px-4 py-2 glass-effect border border-cyan-400/30 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 [&>option]:bg-slate-800 [&>option]:text-white" value={filter.judul} onChange={e => setFilter(f => ({ ...f, judul: e.target.value, subjudul: '' }))}>
            <option value="">Semua Judul</option>
            {judulList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
          </select>
          <select className="px-4 py-2 glass-effect border border-cyan-400/30 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 [&>option]:bg-slate-800 [&>option]:text-white" value={filter.subjudul} onChange={e => setFilter(f => ({ ...f, subjudul: e.target.value }))}>
            <option value="">Semua Sub Judul</option>
            {subJudulList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
          <select className="px-4 py-2 glass-effect border border-cyan-400/30 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 [&>option]:bg-slate-800 [&>option]:text-white" value={filter.sesi} onChange={e => setFilter(f => ({ ...f, sesi: e.target.value }))}>
            <option value="">Semua Sesi</option>
            {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="px-4 py-2 glass-effect border border-cyan-400/30 rounded-lg text-white bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-400" type="text" placeholder="Tahun" value={filter.tahun} onChange={e => setFilter(f => ({ ...f, tahun: e.target.value }))} />
        </div>
        {/* Detail, edit, hapus, export notulensi */}
        {selected && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-slate-900 rounded-lg p-8 max-w-lg w-full overflow-y-auto max-h-[90vh]">
              <div className="text-lg font-bold mb-4 text-cyan-400">Detail Notulensi</div>
              <div className="mb-2 text-gray-300"><b>Judul:</b> {selected.judul?.nama}</div>
              <div className="mb-2 text-gray-300"><b>Sub Judul:</b> {selected.subjudul?.nama}</div>
              <div className="mb-2 text-gray-300"><b>Sesi:</b> {selected.sesi}</div>
              <div className="mb-2 text-gray-300"><b>Tanggal:</b> {selected.tanggal}</div>
              <div className="mb-2 text-gray-300"><b>Tempat:</b> {selected.tempat}</div>
              <div className="mb-2 text-gray-300"><b>Pihak:</b>
                <ul className="ml-4 list-disc">
                  {selected.pihak?.map((p, i) => (
                    <li key={i}><b>{p.nama_pihak}</b>: {p.perwakilan.join(', ')}</li>
                  ))}
                </ul>
              </div>
              <div className="mb-2 text-gray-300"><b>Catatan:</b></div>
              <div className="prose prose-invert bg-slate-800 rounded p-3 mb-4" dangerouslySetInnerHTML={{ __html: selected.catatan }} />
              <div className="flex flex-wrap gap-2 mt-4">
                <button className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 rounded" onClick={() => handleExportPDF(selected)}>Export PDF</button>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded" onClick={() => handleExportWord(selected)}>Export Word</button>
                <button className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded" onClick={() => handleCopy(selected)}>Copy</button>
                <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded" onClick={() => {
                  navigate('/karyawan/notulensi', { state: { editData: selected } });
                  setSelected(null);
                }}>Edit</button>
                <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded" onClick={async () => {
                  if (window.confirm('Yakin hapus notulensi ini?')) {
                    await deleteNotulensi(selected.id);
                    setSelected(null);
                    fetchNotulensi();
                  }
                }}>Hapus</button>
                <button className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-1 rounded ml-auto" onClick={() => setSelected(null)}>Tutup</button>
              </div>
            </div>
          </div>
        )}
        {/* List notulensi */}
        <div className="space-y-6 mt-8">
          {loading ? (
            <div className="text-gray-400">Memuat data...</div>
          ) : filtered.length === 0 ? (
            <div className="text-gray-400">Tidak ada notulensi sesuai filter.</div>
          ) : (
            filtered.map(n => (
              <Card key={n.id} className={`relative glass-effect bg-slate-800/60 backdrop-blur border border-cyan-400/30 rounded-2xl shadow-xl p-6 transition-all duration-200 ${expandedId === n.id ? 'ring-2 ring-cyan-400/60' : ''}`}
                >
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === n.id ? null : n.id)}>
                  <div>
                    <div className="font-bold text-cyan-200 text-xl mb-1">{n.judul?.nama} {n.subjudul ? <span className="text-cyan-400">/ {n.subjudul.nama}</span> : ''}</div>
                    <div className="text-sm text-cyan-100 mb-1">Sesi: {n.sesi} | Tanggal: {n.tanggal}</div>
                    <div className="text-sm text-cyan-300">Diedit oleh: {n.user?.nama}</div>
                  </div>
                  <div className="flex flex-row flex-wrap gap-2 justify-end w-full sm:w-auto">
                    <button title="Edit" className="p-2 rounded hover:bg-cyan-700/30" onClick={e => {e.stopPropagation(); navigate('/karyawan/notulensi', { state: { editData: n } });}}><PencilIcon className="w-5 h-5 text-yellow-400" /></button>
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
        </div>
        {/* TODO: Edit form (reuse form dari karyawan jika perlu) */}
      </div>
    </div>
  );
};

export default NotulensiAdmin; 