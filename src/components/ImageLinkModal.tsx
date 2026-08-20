import React, { useEffect, useState } from 'react';
import { X, Image as ImageIcon, Check, AlertCircle, RefreshCw, Link as LinkIcon, Sparkles } from 'lucide-react';
import { AVATAR_PRESETS } from '../data/catalogData';
import { useDialog } from '../hooks/useDialog';

interface ImageLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  currentAvatarUrl: string;
  onSaveAvatar: (newUrl: string) => void;
}

export const ImageLinkModal: React.FC<ImageLinkModalProps> = ({
  isOpen,
  onClose,
  memberName,
  currentAvatarUrl,
  onSaveAvatar,
}) => {
  const [urlInput, setUrlInput] = useState(currentAvatarUrl);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const dialogRef = useDialog(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setUrlInput(currentAvatarUrl);
    setTestStatus('idle');
  }, [currentAvatarUrl, isOpen]);

  if (!isOpen) return null;

  const handleTestUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('https://')) {
      setTestStatus('error');
      return;
    }
    setTestStatus('testing');
    
    const img = new Image();
    img.src = trimmed;
    img.onload = () => setTestStatus('success');
    img.onerror = () => setTestStatus('error');
  };

  const handleSelectPreset = (presetUrl: string) => {
    setUrlInput(presetUrl);
    setTestStatus('success');
  };

  const handleSave = () => {
    const trimmed = urlInput.trim();
    if (trimmed && trimmed.startsWith('https://')) {
      onSaveAvatar(trimmed);
      onClose();
    } else {
      setTestStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" role="presentation">
      <div
        ref={dialogRef}
        className="bg-surface border border-line w-full max-w-lg rounded-2xl p-6 shadow-2xl relative flex flex-col gap-5 text-ink"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-link-modal-title"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
              <LinkIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 id="image-link-modal-title" className="font-display font-bold text-lg text-white">Link Direto da Imagem</h3>
              <p className="text-xs text-muted">
                Personalize o avatar de <span className="text-accent font-semibold">{memberName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar edição da imagem"
            className="text-faint hover:text-white p-1 rounded-lg hover:bg-surface-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview */}
        <div className="flex items-center gap-4 bg-surface-2 p-4 rounded-xl border border-line">
          <div className="relative group">
            <img
              src={urlInput || currentAvatarUrl}
              alt={memberName}
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-full object-cover border-2 border-accent bg-app"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';
              }}
            />
            {testStatus === 'success' && (
              <span className="absolute bottom-0 right-0 bg-accent text-accent-ink p-1 rounded-full text-xs font-bold shadow-md">
                <Check className="w-3 h-3" />
              </span>
            )}
          </div>

          <div className="flex-1 space-y-1">
            <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">
              PRÉ-VISUALIZAÇÃO EM TEMPO REAL
            </span>
            <div className="text-sm font-display font-bold text-white truncate max-w-[240px]">
              {memberName}
            </div>
            <p className="text-xs text-faint leading-tight">
              Insira a URL pública da imagem (JPG, PNG, WebP ou CDN).
            </p>
          </div>
        </div>

        {/* URL Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold font-mono text-accent uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" />
            URL Direta da Imagem
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setTestStatus('idle');
              }}
              placeholder="https://exemplo.com/minha-foto.jpg"
              maxLength={2048}
              className="flex-1 bg-app border border-line rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="button"
              onClick={handleTestUrl}
              className="bg-surface-2 hover:bg-line border border-line text-xs font-semibold px-3.5 py-2 rounded-xl text-white transition-colors flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testStatus === 'testing' ? 'animate-spin' : ''}`} />
              Testar
            </button>
          </div>

          {/* Test Feedback */}
          {testStatus === 'success' && (
            <div className="flex items-center gap-1.5 text-xs text-success-strong font-medium mt-1">
              <Check className="w-4 h-4" /> Imagem carregada e validada com sucesso!
            </div>
          )}
          {testStatus === 'error' && (
            <div className="flex items-center gap-1.5 text-xs text-danger-strong font-medium mt-1">
              <AlertCircle className="w-4 h-4" /> Não foi possível carregar a imagem deste link. Certifique-se de que é uma URL pública HTTPS (https://...).
            </div>
          )}
        </div>

        {/* Preset Gallery */}
        <div className="space-y-2">
          <label className="text-xs font-bold font-mono text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            Galeria de Avatares
          </label>
          <div className="grid grid-cols-5 gap-2 bg-app p-2.5 rounded-xl border border-line">
            {AVATAR_PRESETS.map((preset, index) => (
              <button
                type="button"
                key={index}
                onClick={() => handleSelectPreset(preset)}
                className={`relative rounded-lg overflow-hidden border-2 transition-all hover:scale-105 aspect-square ${
                  urlInput === preset ? 'border-accent ring-2 ring-accent/30' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={preset}
                  alt={`Preset ${index + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 border-t border-line pt-4 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-muted hover:text-white hover:bg-surface-2 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-accent text-accent-ink font-bold text-xs hover:bg-accent-hover transition-colors shadow-[0_0_15px_rgba(227,167,59,0.2)]"
          >
            Salvar Foto
          </button>
        </div>
      </div>
    </div>
  );
};
