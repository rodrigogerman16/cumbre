import { useEffect, useMemo, useRef } from 'react';
import { CloseIcon, InfoIcon, UploadIcon } from '../lib/icons';

interface MediaUploadRowProps {
  files: File[];
  onChange: (files: File[]) => void;
}

export function MediaUploadRow({ files, onChange }: MediaUploadRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  useEffect(() => {
    return () => previewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [previewUrls]);

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    onChange([...files, ...Array.from(fileList)]);
    if (inputRef.current) inputRef.current.value = '';
  }

  function removeAt(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="upload-row">
        {files.map((file, i) => (
          <div key={i} className="upload-thumb-wrap">
            {file.type.startsWith('video/') ? (
              <div className="upload-thumb upload-thumb-video">VIDEO</div>
            ) : (
              <img src={previewUrls[i]} alt="" className="upload-thumb" />
            )}
            <button type="button" className="upload-thumb-remove" onClick={() => removeAt(i)}>
              <CloseIcon size={11} color="#fff" />
            </button>
          </div>
        ))}
        <button type="button" className="upload-add" onClick={() => inputRef.current?.click()}>
          <UploadIcon size={20} color="var(--ink-faint)" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
      </div>
      <div className="moderation-note">
        <InfoIcon size={13} color="var(--ink-faint)" />
        Las imágenes y videos se revisan automáticamente antes de publicarse. No se permite contenido sexual.
      </div>
    </div>
  );
}
