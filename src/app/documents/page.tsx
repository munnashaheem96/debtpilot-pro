'use client';

import React, { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { fetchCollection, saveDocumentItem, deleteDocumentItem, logActivity } from '@/lib/db';
import { DocumentFile } from '@/types';
import { isFirebaseConfigured, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FolderLock, Plus, FileText, Trash2, ArrowUpRight, Search, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function DocumentVaultPage() {
  const { user } = useAuth();
  
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [loading, setLoading] = useState(true);

  // Form upload fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentFile['category']>('Agreement');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user) {
      fetchCollection<DocumentFile>('documents', user.uid).then((data) => {
        setDocuments(data);
        setLoading(false);
      });
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      if (!title) {
        // Auto-fill title with file name without extension
        const name = e.target.files[0].name.split('.').slice(0, -1).join('.');
        setTitle(name);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !selectedFile) return;

    setUploading(true);
    try {
      let fileUrl = '#';
      
      // Check if Firebase Storage is active
      if (isFirebaseConfigured && storage) {
        const fileRef = ref(storage, `users/${user.uid}/documents/${Date.now()}_${selectedFile.name}`);
        const snapshot = await uploadBytes(fileRef, selectedFile);
        fileUrl = await getDownloadURL(snapshot.ref);
      } else {
        // Mock upload URL
        fileUrl = `https://mock-file-vault.local/${selectedFile.name}`;
      }

      const docItem: DocumentFile = {
        id: `doc-${Date.now()}`,
        userId: user.uid,
        title,
        category,
        fileUrl,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        uploadedAt: new Date().toISOString(),
      };

      await saveDocumentItem('documents', docItem);
      setDocuments((prev) => [docItem, ...prev]);
      
      // Reset
      setTitle('');
      setSelectedFile(null);
      
      // Reset file input element
      const fileInput = document.getElementById('file-input-field') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      await logActivity(user.uid, 'CREATE', 'DOCUMENT', `Uploaded document: ${title} (${selectedFile.name}).`);
    } catch (error) {
      console.error(error);
      alert('Error uploading document file.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, name: string) => {
    if (!user) return;
    if (confirm(`Permanently delete the document file: ${name}?`)) {
      await deleteDocumentItem('documents', user.uid, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      await logActivity(user.uid, 'DELETE', 'DOCUMENT', `Deleted document: ${name}.`);
    }
  };

  const filteredDocs = documents.filter((d) => {
    return (
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.fileName.toLowerCase().includes(search.toLowerCase())
    );
  });

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-semibold text-sm animate-pulse">Loading documents vault...</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Document Vault</h1>
          <p className="text-sm text-slate-500">Securely backup loan contracts, bank statements, and collateral files.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Upload card form */}
          <div className="lg:col-span-1">
            <Card className="glass-card shadow-premium p-5">
              <CardHeader className="p-0 pb-4 border-b border-slate-100 mb-4">
                <CardTitle className="text-base font-bold text-slate-900">Upload Document</CardTitle>
                <CardDescription>Drag or select files to back up securely</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={handleUpload} className="space-y-4">
                  <Input
                    label="Document Title *"
                    placeholder="e.g. Home Loan Contract"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />

                  <Select
                    label="Category Tag *"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DocumentFile['category'])}
                    options={[
                      { value: 'Agreement', label: 'Loan Agreement' },
                      { value: 'Statement', label: 'EMI / Bank Statement' },
                      { value: 'Bank', label: 'Bank Document' },
                      { value: 'Personal', label: 'Personal Document' },
                      { value: 'Other', label: 'Other Document' },
                    ]}
                  />

                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-semibold text-slate-500 block">Choose File *</label>
                    <input
                      type="file"
                      id="file-input-field"
                      onChange={handleFileChange}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full mt-4" isLoading={uploading}>
                    Upload File
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* List of uploaded files */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="glass-card p-4 shadow-premium">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter documents by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition"
                />
              </div>
            </Card>

            <Card className="glass-card shadow-premium p-6">
              {filteredDocs.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 font-semibold flex flex-col items-center">
                  <FolderLock className="w-10 h-10 text-slate-300 mb-2" />
                  <span>No documents matched.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDocs.map((d) => (
                    <div
                      key={d.id}
                      className="p-3.5 rounded-xl border border-slate-100 bg-white flex items-center justify-between text-xs font-semibold hover:border-indigo-100 transition shadow-sm hover:shadow-md hover:shadow-indigo-500/5 group"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 block truncate leading-tight">{d.title}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-40 font-mono">
                            {d.fileName} ({formatBytes(d.fileSize)})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <a
                          href={d.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-slate-50 rounded"
                          title="View / Download File"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(d.id, d.title)}
                          className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Delete File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </Shell>
  );
}
