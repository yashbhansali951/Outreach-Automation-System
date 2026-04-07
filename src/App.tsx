/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Mail, 
  Send, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Keyboard, 
  Download, 
  Copy, 
  Check,
  AlertCircle,
  X,
  Table,
  Layout,
  Eye,
  Loader2,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

type Step = 'SMTP' | 'RESUME' | 'EXCEL' | 'TEMPLATE' | 'PREVIEW' | 'SENDING';

interface Recipient {
  [key: string]: string;
}

interface SmtpConfig {
  email: string;
  password: string;
  host: string;
  port: number;
}

export default function App() {
  const [step, setStep] = useState<Step>('SMTP');
  const [smtp, setSmtp] = useState<SmtpConfig>({ email: '', password: '', host: 'smtp.gmail.com', port: 465 });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [template, setTemplate] = useState('Hello {{Name}},\n\nI am writing to apply for the position. Please find my resume attached.\n\nBest regards,\n[Your Name]');
  const [subject, setSubject] = useState('Application for Role');
  const [interval, setIntervalValue] = useState(5); // seconds
  const [sendingProgress, setSendingProgress] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const resumeInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setResumeFile(file);
    } else {
      alert('Please upload a PDF file.');
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setExcelFile(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as Recipient[];
        if (data.length > 0) {
          setRecipients(data);
          setColumns(Object.keys(data[0]));
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtp),
      });
      const data = await response.json();
      if (response.ok) {
        setTestResult({ success: true, message: 'Connection successful!' });
      } else {
        setTestResult({ success: false, message: data.error || 'Connection failed' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown network error';
      setTestResult({ success: false, message: `Network error: ${errorMessage}` });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSendBatch = async () => {
    setIsSending(true);
    setStep('SENDING');
    setSendingProgress(0);
    setLogs(['Initializing batch...']);

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const email = recipient.Email || recipient.email || recipient.EMAIL || 'Unknown';
      setLogs(prev => [...prev, `Sending to ${email}...`]);

      const formData = new FormData();
      if (resumeFile) formData.append('resume', resumeFile);
      formData.append('data', JSON.stringify({
        template,
        recipient,
        subject,
        smtp
      }));

      try {
        const response = await fetch('/api/send-single-email', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        if (response.ok) {
          setLogs(prev => [...prev, `✓ Successfully sent to ${email}`]);
        } else {
          setLogs(prev => [...prev, `✗ FAILED for ${email}: ${result.error}`]);
        }
      } catch (error) {
        setLogs(prev => [...prev, `✗ ERROR for ${email}: Network failure`]);
      }

      setSendingProgress(Math.round(((i + 1) / recipients.length) * 100));

      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, interval * 1000));
      }
    }

    setLogs(prev => [...prev, 'Batch complete!']);
    setIsSending(false);
  };

  const renderPreview = (index: number) => {
    const recipient = recipients[index];
    if (!recipient) return '';
    let preview = template;
    columns.forEach(col => {
      preview = preview.replace(new RegExp(`{{${col}}}`, 'g'), recipient[col] || '');
    });
    return preview;
  };

  const handleReset = () => {
    setStep('SMTP');
    setResumeFile(null);
    setExcelFile(null);
    setRecipients([]);
    setColumns([]);
    setSendingProgress(0);
    setIsSending(false);
    setLogs([]);
  };

  return (
    <div className="min-h-screen flex flex-col font-body bg-brand-white">
      {/* Header */}
      <header className="w-full flex items-center justify-between px-8 py-6 border-b-2 border-brand-black bg-brand-white sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {step !== 'RESUME' && !isSending && (
            <button 
              onClick={() => {
                const steps: Step[] = ['SMTP', 'RESUME', 'EXCEL', 'TEMPLATE', 'PREVIEW', 'SENDING'];
                const currentIndex = steps.indexOf(step);
                if (currentIndex > 0) {
                  setStep(steps[currentIndex - 1]);
                }
              }}
              className="p-2 hover:bg-brand-surface transition-colors cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <div className="w-6 h-6 bg-brand-black text-brand-white flex items-center justify-center">
            <Mail className="w-4 h-4" />
          </div>
          <h1 className="font-display font-bold text-2xl tracking-tight uppercase">BULK RESUME SENDER</h1>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-brand-muted font-mono text-sm uppercase">
          <span>Step {['SMTP', 'RESUME', 'EXCEL', 'TEMPLATE', 'PREVIEW', 'SENDING'].indexOf(step) + 1} of 6</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] grid-bg" />

        <AnimatePresence mode="wait">
          {step === 'SMTP' && (
            <motion.div
              key="smtp"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 gap-8 z-10"
            >
              <div className="text-center mb-4">
                <h2 className="font-display font-bold text-4xl uppercase tracking-tighter">Step 1: SMTP Settings</h2>
                <p className="text-brand-muted mt-2">Enter your email credentials. These are only used to send emails and are never stored.</p>
              </div>
              <div className="w-full max-w-[500px] border-2 border-brand-black p-8 bg-brand-white brutalist-shadow space-y-5">
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold mb-2">Email Address</label>
                  <input
                    type="email"
                    className="w-full border-2 border-brand-black p-3 font-mono text-sm"
                    placeholder="you@gmail.com"
                    value={smtp.email}
                    onChange={(e) => setSmtp(s => ({ ...s, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold mb-2">App Password</label>
                  <input
                    type="password"
                    className="w-full border-2 border-brand-black p-3 font-mono text-sm"
                    placeholder="Your app-specific password"
                    value={smtp.password}
                    onChange={(e) => setSmtp(s => ({ ...s, password: e.target.value }))}
                  />
                  <p className="font-mono text-[10px] text-brand-muted mt-1">For Gmail: use an App Password from myaccount.google.com</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[10px] uppercase font-bold mb-2">SMTP Host</label>
                    <input
                      type="text"
                      className="w-full border-2 border-brand-black p-3 font-mono text-sm"
                      value={smtp.host}
                      onChange={(e) => setSmtp(s => ({ ...s, host: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase font-bold mb-2">Port</label>
                    <input
                      type="number"
                      className="w-full border-2 border-brand-black p-3 font-mono text-sm"
                      value={smtp.port}
                      onChange={(e) => setSmtp(s => ({ ...s, port: parseInt(e.target.value) || 465 }))}
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleTestConnection}
                    disabled={isTestingConnection || !smtp.email || !smtp.password}
                    className="w-full py-3 border-2 border-brand-black font-mono text-xs uppercase font-bold hover:bg-brand-surface transition-all flex items-center justify-center gap-2 disabled:opacity-20"
                  >
                    {isTestingConnection ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                    Test Connection
                  </button>
                  {testResult && (
                    <div className={`mt-2 p-3 font-mono text-xs border ${testResult.success ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                      {testResult.message}
                    </div>
                  )}
                </div>
              </div>
              <button
                disabled={!smtp.email || !smtp.password}
                onClick={() => setStep('RESUME')}
                className={`px-12 py-4 bg-brand-black text-brand-white font-display font-bold text-lg uppercase tracking-wider border-2 border-brand-black transition-all ${(!smtp.email || !smtp.password) ? 'opacity-20' : 'hover:bg-brand-white hover:text-brand-black'}`}
              >
                Next: Upload Resume
              </button>
            </motion.div>
          )}

          {step === 'RESUME' && (
            <motion.div 
              key="resume"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 gap-8 z-10"
            >
              <div className="text-center mb-4">
                <h2 className="font-display font-bold text-4xl uppercase tracking-tighter">Step 1: Upload Resume</h2>
                <p className="text-brand-muted mt-2">This file will be attached to every email.</p>
              </div>
              <div 
                className="w-full max-w-[600px] h-[300px] relative group cursor-pointer"
                onClick={() => resumeInputRef.current?.click()}
              >
                <input type="file" ref={resumeInputRef} className="hidden" accept=".pdf" onChange={handleResumeUpload} />
                <div className="w-full h-full bg-brand-surface border-2 border-dashed border-brand-black flex flex-col items-center justify-center p-8 transition-all hover:bg-brand-white hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  <div className="mb-4 w-16 h-16 rounded-full bg-brand-white border-2 border-brand-black flex items-center justify-center group-hover:bg-brand-black group-hover:text-brand-white transition-all">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="font-display font-bold text-2xl uppercase text-center break-all">{resumeFile ? resumeFile.name : 'Select PDF Resume'}</h3>
                  <p className="font-mono text-xs text-brand-muted mt-2 uppercase tracking-widest">PDF Only (Max 4MB)</p>
                </div>
              </div>
              <button 
                disabled={!resumeFile}
                onClick={() => setStep('EXCEL')}
                className={`px-12 py-4 bg-brand-black text-brand-white font-display font-bold text-lg uppercase tracking-wider border-2 border-brand-black transition-all ${!resumeFile ? 'opacity-20' : 'hover:bg-brand-white hover:text-brand-black'}`}
              >
                Next: Recipient List
              </button>
            </motion.div>
          )}

          {step === 'EXCEL' && (
            <motion.div 
              key="excel"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 gap-8 z-10"
            >
              <div className="text-center mb-4">
                <h2 className="font-display font-bold text-4xl uppercase tracking-tighter">Step 2: Upload Recipient List</h2>
                <p className="text-brand-muted mt-2">Upload an Excel file with columns like "Email", "Name", etc.</p>
              </div>
              <div 
                className="w-full max-w-[600px] h-[300px] relative group cursor-pointer"
                onClick={() => excelInputRef.current?.click()}
              >
                <input type="file" ref={excelInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} />
                <div className="w-full h-full bg-brand-surface border-2 border-dashed border-brand-black flex flex-col items-center justify-center p-8 transition-all hover:bg-brand-white hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  <div className="mb-4 w-16 h-16 rounded-full bg-brand-white border-2 border-brand-black flex items-center justify-center group-hover:bg-brand-black group-hover:text-brand-white transition-all">
                    <Table className="w-8 h-8" />
                  </div>
                  <h3 className="font-display font-bold text-2xl uppercase text-center break-all">{excelFile ? excelFile.name : 'Select Excel File'}</h3>
                  <p className="font-mono text-xs text-brand-muted mt-2 uppercase tracking-widest">XLSX or XLS</p>
                  {recipients.length > 0 && (
                    <p className="mt-4 font-bold text-primary">{recipients.length} recipients found</p>
                  )}
                </div>
              </div>
              <button 
                disabled={recipients.length === 0}
                onClick={() => setStep('TEMPLATE')}
                className={`px-12 py-4 bg-brand-black text-brand-white font-display font-bold text-lg uppercase tracking-wider border-2 border-brand-black transition-all ${recipients.length === 0 ? 'opacity-20' : 'hover:bg-brand-white hover:text-brand-black'}`}
              >
                Next: Email Template
              </button>
            </motion.div>
          )}

          {step === 'TEMPLATE' && (
            <motion.div 
              key="template"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col items-center p-6 md:p-12 gap-8 z-10 overflow-y-auto"
            >
              <div className="w-full max-w-[1000px] grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                  <div className="border-2 border-brand-black p-6 bg-brand-white brutalist-shadow">
                    <h2 className="font-display font-bold text-2xl uppercase mb-6">Step 3: Compose Template</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block font-mono text-[10px] uppercase font-bold mb-2">Subject Line</label>
                        <input 
                          type="text" 
                          className="w-full border-2 border-brand-black p-3 font-mono text-sm focus:ring-0"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-[10px] uppercase font-bold mb-2">Email Body</label>
                        <textarea 
                          className="w-full border-2 border-brand-black p-4 font-mono text-sm focus:ring-0 min-h-[300px]"
                          value={template}
                          onChange={(e) => setTemplate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="border-2 border-brand-black p-6 bg-brand-surface">
                    <h3 className="font-display font-bold text-lg uppercase mb-4">Placeholders</h3>
                    <p className="text-xs text-brand-muted mb-4">Click to copy placeholder tag:</p>
                    <div className="flex flex-wrap gap-2">
                      {columns.map(col => (
                        <button 
                          key={col}
                          onClick={() => {
                            navigator.clipboard.writeText(`{{${col}}}`);
                          }}
                          className="px-3 py-1 bg-brand-white border border-brand-black font-mono text-xs hover:bg-brand-black hover:text-brand-white transition-all"
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="border-2 border-brand-black p-6 bg-brand-white">
                    <h3 className="font-display font-bold text-lg uppercase mb-4">Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block font-mono text-[10px] uppercase font-bold mb-2">Interval (Seconds)</label>
                        <input 
                          type="number" 
                          className="w-full border-2 border-brand-black p-2 font-mono text-sm"
                          value={interval}
                          onChange={(e) => setIntervalValue(parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setStep('PREVIEW')}
                    className="w-full py-4 bg-brand-black text-brand-white font-display font-bold text-lg uppercase tracking-wider border-2 border-brand-black hover:bg-brand-white hover:text-brand-black transition-all"
                  >
                    Preview Batch
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'PREVIEW' && (
            <motion.div 
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center p-6 md:p-12 gap-8 z-10 overflow-y-auto"
            >
              <div className="w-full max-w-[800px] space-y-8">
                <div className="text-center">
                  <h2 className="font-display font-bold text-4xl uppercase tracking-tighter">Step 4: Final Preview</h2>
                  <p className="text-brand-muted mt-2">Review how the first few emails will look.</p>
                </div>
                
                <div className="space-y-6">
                  {[0, 1].map(idx => recipients[idx] && (
                    <div key={idx} className="border-2 border-brand-black bg-brand-white p-8 brutalist-shadow relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-brand-black text-brand-white px-4 py-1 font-mono text-[10px] uppercase">
                        Preview {idx + 1}
                      </div>
                      <div className="mb-4 pb-4 border-b border-brand-black/10">
                        <p className="font-mono text-[10px] uppercase text-brand-muted">To:</p>
                        <p className="font-bold">{recipients[idx].Email || recipients[idx].email || recipients[idx].EMAIL}</p>
                      </div>
                      <div className="mb-4 pb-4 border-b border-brand-black/10">
                        <p className="font-mono text-[10px] uppercase text-brand-muted">Subject:</p>
                        <p className="font-bold">{subject}</p>
                      </div>
                      <div className="whitespace-pre-wrap font-body text-sm leading-relaxed">
                        {renderPreview(idx)}
                      </div>
                      <div className="mt-6 p-3 bg-brand-surface border border-brand-black/10 flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="font-mono text-xs uppercase font-bold truncate">{resumeFile?.name}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep('TEMPLATE')}
                    className="flex-1 py-4 border-2 border-brand-black font-display font-bold text-lg uppercase tracking-wider hover:bg-brand-surface transition-all"
                  >
                    Back to Edit
                  </button>
                  <button 
                    onClick={handleSendBatch}
                    className="flex-1 py-4 bg-primary text-brand-white font-display font-bold text-lg uppercase tracking-wider border-2 border-brand-black hover:bg-brand-black transition-all flex items-center justify-center gap-3"
                  >
                    <Send className="w-6 h-6" />
                    Send Batch Now
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'SENDING' && (
            <motion.div 
              key="sending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 gap-12 z-10"
            >
              <div className="w-full max-w-[600px] space-y-8">
                <div className="text-center">
                  <h2 className="font-display font-bold text-4xl uppercase tracking-tighter">Sending Batch</h2>
                  <p className="text-brand-muted mt-2">Processing {recipients.length} emails with {interval}s intervals.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between font-mono text-xs uppercase font-bold">
                    <span>Progress</span>
                    <span>{sendingProgress}%</span>
                  </div>
                  <div className="w-full h-8 border-2 border-brand-black bg-brand-white p-1">
                    <motion.div 
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${sendingProgress}%` }}
                    />
                  </div>
                </div>

                <div className="border-2 border-brand-black bg-brand-black text-green-400 p-6 font-mono text-xs h-[300px] overflow-y-auto">
                  {logs.map((log, i) => (
                    <div key={i} className="mb-1">
                      <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span> {log}
                    </div>
                  ))}
                  {sendingProgress === 100 && (
                    <div className="mt-4 text-white font-bold text-center border-t border-white/20 pt-4">
                      BATCH COMPLETE!
                      <button 
                        onClick={handleReset}
                        className="block mx-auto mt-4 px-6 py-2 bg-white text-brand-black uppercase font-bold hover:bg-primary hover:text-white transition-all"
                      >
                        Start New Batch
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="p-6 border-t-2 border-brand-black flex justify-between items-center bg-brand-white font-mono text-xs uppercase text-brand-muted">
        <div>v2.0.0-bulk-sender</div>
        <div className="flex gap-4">
          <a href="#" className="hover:text-brand-black hover:underline underline-offset-4 decoration-2">Privacy</a>
          <a href="#" className="hover:text-brand-black hover:underline underline-offset-4 decoration-2">Terms</a>
        </div>
      </footer>
    </div>
  );
}
