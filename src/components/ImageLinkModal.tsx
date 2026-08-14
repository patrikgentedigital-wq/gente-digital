import React, { useState } from 'react';
import { X, Image as ImageIcon, Check, AlertCircle, RefreshCw, Link as LinkIcon, Sparkles } from 'lucide-react';
import { AVATAR_PRESETS } from '../data/initialData';

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

  if (!isOpen) return null;

  const handleTestUrl = () => {
    if (!urlInput.trim()) return;
    setTestStatus('testing');
    
    const img = new Image();
    img.src = urlInput;
    img.onload = () => setTestStatus('success');
    img.onerror = () => setTestStatus('error');
  };

  const handleSelectPreset = (presetUrl: string) => {
    setUrlInput(presetUrl);
    setTestStatus('success');
  };

  const handleSave = () => {
    if (urlInput.trim()) {
      onSaveAvatar(urlInput.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050912]/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#0F1E38] border border-[#22365C] w-full max-w-lg rounded-2xl p-6 shadow-2xl relative flex flex-col gap-5 text-[#F2F5FA]">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[#22365C] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E3A73B]/10 border border-[#E3A73B]/30 flex items-center justify-center text-[#E3A73B]">
              <LinkIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">Link Direto da Imagem</h3>
              <p className="text-xs text-[#A9B7CE]">
                Personalize o avatar de <span className="text-[#E3A73B] font-semibold">{memberName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#6C7C99] hover:text-white p-1 rounded-lg hover:bg-[#14294A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview */}
        <div className="flex items-center gap-4 bg-[#14294A] p-4 rounded-xl border border-[#22365C]">
          <div className="relative group">
            <img
              src={urlInput || currentAvatarUrl}
              alt={memberName}
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-full object-cover border-2 border-[#E3A73B] bg-[#0A1424]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';
              }}
            />
            {testStatus === 'success' && (
              <span className="absolute bottom-0 right-0 bg-[#E3A73B] text-[#1a1200] p-1 rounded-full text-xs font-bold shadow-md">
                <Check className="w-3 h-3" />
              </span>
            )}
          </div>

          <div className="flex-1 space-y-1">
            <span className="text-[10px] font-mono text-[#A9B7CE] uppercase tracking-wider block">
              PRÉ-VISUALIZAÇÃO EM TEMPO REAL
            </span>
            <div className="text-sm font-display font-bold text-white truncate max-w-[240px]">
              {memberName}
            </div>
            <p className="text-xs text-[#6C7C99] leading-tight">
              Insira a URL pública da imagem (JPG, PNG, WebP ou CDN).
            </p>
          </div>
        </div>

        {/* URL Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold font-mono text-[#E3A73B] uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" />
            URL Direta da Imagem
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setTestStatus('idle');
              }}
              placeholder="https://exemplo.com/minha-foto.jpg"
              className="flex-1 bg-[#0A1424] border border-[#22365C] rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#E3A73B] transition-colors"
            />
            <button
              onClick={handleTestUrl}
              className="bg-[#14294A] hover:bg-[#22365C] border border-[#22365C] text-xs font-semibold px-3.5 py-2 rounded-xl text-white transition-colors flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testStatus === 'testing' ? 'animate-spin' : ''}`} />
              Testar
            </button>
          </div>

          {/* Test Feedback */}
          {testStatus === 'success' && (
            <div className="flex items-center gap-1.5 text-xs text-[#2E9E52] font-medium mt-1">
              <Check className="w-4 h-4" /> Imagem carregada e validada com sucesso!
            </div>
          )}
          {testStatus === 'error' && (
            <div className="flex items-center gap-1.5 text-xs text-[#C43B4E] font-medium mt-1">
              <AlertCircle className="w-4 h-4" /> Não foi possível carregar a imagem deste link. Verifique a URL.
            </div>
          )}
        </div>

        {/* Preset Gallery */}
        <div className="space-y-2">
          <label className="text-xs font-bold font-mono text-[#A9B7CE] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#E3A73B]" />
            Galeria de Avatares
          </label>
          <div className="grid grid-cols-5 gap-2 bg-[#0A1424] p-2.5 rounded-xl border border-[#22365C]">
            {AVATAR_PRESETS.map((preset, index) => (
              <button
                key={index}
                onClick={() => handleSelectPreset(preset)}
                className={`relative rounded-lg overflow-hidden border-2 transition-all hover:scale-105 aspect-square ${
                  urlInput === preset ? 'border-[#E3A73B] ring-2 ring-[#E3A73B]/30' : 'border-transparent opacity-70 hover:opacity-100'
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
        <div className="flex justify-end gap-3 border-t border-[#22365C] pt-4 mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#22365C] text-xs font-semibold text-[#A9B7CE] hover:text-white hover:bg-[#14294A] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-[#E3A73B] text-[#1a1200] font-bold text-xs hover:bg-[#eeb64f] transition-colors shadow-[0_0_15px_rgba(227,167,59,0.2)]"
          >
            Salvar Foto
          </button>
        </div>
      </div>
    </div>
  );
};

