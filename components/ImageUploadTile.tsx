import React, { useRef } from 'react';
import { Camera, X, Upload, AlertCircle } from 'lucide-react';

interface ImageUploadTileProps {
  id: string;
  label: string;
  imageSrc: string | null;
  onUpload: (id: string, base64: string) => void;
  onRemove: (id: string) => void;
  error?: string;
}

export const ImageUploadTile: React.FC<ImageUploadTileProps> = ({
  id,
  label,
  imageSrc,
  onUpload,
  onRemove,
  error,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onUpload(id, base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerUpload = () => {
    inputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-purple-700 dark:text-purple-200">{label}</span>
      <div
        className={`relative w-full aspect-[4/3] rounded-xl border-2 border-dashed transition-all duration-300 overflow-hidden group ${
          error
            ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
            : imageSrc
            ? 'border-purple-500 bg-gray-100 dark:bg-gray-900'
            : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-gray-800'
        }`}
      >
        <input
          type="file"
          ref={inputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        {imageSrc ? (
          <>
            <img
              src={imageSrc}
              alt={label}
              className={`w-full h-full object-cover ${error ? 'opacity-40 grayscale' : ''}`}
            />
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle className="text-red-600 mb-1" size={28} />
                <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase leading-tight">
                  {error}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <button
                onClick={triggerUpload}
                className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition-colors"
                title="Replace"
              >
                <Upload size={20} />
              </button>
              <button
                onClick={() => onRemove(id)}
                className="p-2 bg-red-500/20 rounded-full hover:bg-red-500/40 text-red-200 transition-colors"
                title="Remove"
              >
                <X size={20} />
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={triggerUpload}
            className={`w-full h-full flex flex-col items-center justify-center gap-3 transition-colors ${
              error ? 'text-red-400' : 'text-gray-400 hover:text-purple-500 dark:hover:text-purple-300'
            }`}
          >
            <Camera size={32} />
            <span className="text-xs uppercase tracking-wider font-semibold">
              {error ? 'Try Another' : 'Upload Photo'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};