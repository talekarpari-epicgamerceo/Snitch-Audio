import React, { useCallback } from 'react';
import { UploadCloud, FileVideo, FileAudio, CheckCircle2 } from 'lucide-react';

interface FileUploadProps {
  label: string;
  accept: string;
  file: File | null;
  onFileSelect: (file: File) => void;
  icon?: React.ReactNode;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  label, 
  accept, 
  file, 
  onFileSelect,
  icon 
}) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div 
      className={`relative group border-2 border-dashed rounded-xl p-8 transition-all duration-200 cursor-pointer
        ${file 
          ? 'border-emerald-500 bg-emerald-50/50' 
          : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50'
        }`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => document.getElementById(`file-input-${label}`)?.click()}
    >
      <input
        type="file"
        id={`file-input-${label}`}
        className="hidden"
        accept={accept}
        onChange={handleChange}
      />
      
      <div className="flex flex-col items-center justify-center text-center space-y-3">
        {file ? (
          <>
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{file.name}</p>
              <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </>
        ) : (
          <>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors
              ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
              {icon || <UploadCloud size={24} />}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{label}</p>
              <p className="text-sm text-slate-500">Drag & drop or click to browse</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};