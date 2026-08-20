import React, { useState, useEffect } from 'react';
import { TeamMember } from '../types';
import { TEAMS } from '../data/catalogData';
import {
  X,
  Trophy,
  Crown,
  TrendingUp,
  Zap,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Users,
  Award,
  Sparkles,
  Rocket,
  ShieldCheck,
} from 'lucide-react';
import { useDialog } from '../hooks/useDialog';
import { Avatar } from './Avatar';

interface KioskModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: TeamMember[];
}

export const KioskModeModal: React.FC<KioskModeModalProps> = ({
  isOpen,
  onClose,
  members,
}) => {
  const dialogRef = useDialog(isOpen, onClose);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // QR code linking back to the platform (loaded on demand to keep the main bundle lean)
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    import('qrcode')
      .then((module) =>
        module.default.toDataURL(window.location.origin, {
          width: 160,
          margin: 1,
          color: { dark: '#E3A73B', light: '#0F1E38' },
        }),
      )
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl(null);
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Slide rotation (every 10 seconds when playing)
  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 4);
    }, 10000);
    return () => clearInterval(interval);
  }, [isOpen, isPlaying]);

  if (!isOpen) return null;

  // Sorted members for calculations
  const sortedMembers = [...members].sort((a, b) => b.score - a.score);
  const top1 = sortedMembers[0];
  const top2 = sortedMembers[1];
  const top3 = sortedMembers[2];
  const top10 = sortedMembers.slice(0, 10);

  // Growth leaders (who moved up most positions or highest scores)
  const growthLeaders = sortedMembers
    .filter((m) => m.previousRank && m.previousRank > m.rank)
    .sort((a, b) => (b.previousRank! - b.rank) - (a.previousRank! - a.rank))
    .slice(0, 6);

  // Level-up recognition (members who improved vs previous cycle)
  const levelUpLeaders = sortedMembers
    .filter((m) => m.history && m.history.length > 0 && m.score > m.history[m.history.length - 1].score)
    .sort((a, b) => {
      const aDelta = a.score - (a.history?.[a.history.length - 1].score ?? 0);
      const bDelta = b.score - (b.history?.[b.history.length - 1].score ?? 0);
      return bDelta - aDelta;
    })
    .slice(0, 6);

  // Teams summary calculations
  const teamStats = TEAMS.map((team) => {
    const teamMembers = members.filter((m) => m.team === team.leader);
    const avgScore =
      teamMembers.length > 0
        ? teamMembers.reduce((acc, m) => acc + m.score, 0) / teamMembers.length
        : 0;
    const flyingCount = teamMembers.filter((m) => m.score > 140).length;

    return {
      name: `Time ${team.leader}`,
      leader: team.leader,
      color: team.color,
      count: teamMembers.length,
      avgScore: Math.round(avgScore * 10) / 10,
      flyingCount,
    };
  })
    .filter((team) => team.count > 0)
    .sort((a, b) => b.avgScore - a.avgScore);

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 bg-overlay-2 text-ink flex flex-col font-sans select-none overflow-hidden animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kiosk-mode-title"
      tabIndex={-1}
    >
      {/* Kiosk Header */}
      <header className="px-8 py-4 bg-app/90 border-b border-line flex justify-between items-center backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-accent-ink font-black text-xl shadow-lg shadow-accent/20">
            GD
          </div>
          <div>
            <div className="flex items-center gap-2">
                 <h1 id="kiosk-mode-title" className="font-display font-black text-2xl tracking-wider text-white">
                GENTE DIGITAL
              </h1>
              <span className="bg-accent/20 text-accent text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-accent/30 uppercase tracking-widest animate-pulse">
                AO VIVO • CICLO ATUAL
              </span>
            </div>
            <p className="text-xs text-muted font-medium">Painel Corporativo de Performance & Desempenho</p>
          </div>
        </div>

        {/* Controls & Clock */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-line">
            <button
              onClick={() => setCurrentSlide((prev) => (prev === 0 ? 3 : prev - 1))}
              className="p-1 text-muted hover:text-white transition-colors cursor-pointer"
              title="Slide anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1 text-accent hover:text-accent-hover transition-colors cursor-pointer"
              title={isPlaying ? 'Pausar rotação' : 'Iniciar rotação'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % 4)}
              className="p-1 text-muted hover:text-white transition-colors cursor-pointer"
              title="Próximo slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="flex gap-1.5 ml-2">
              {[0, 1, 2, 3].map((idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                    currentSlide === idx ? 'bg-accent w-6' : 'bg-line'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="font-mono font-bold text-xl text-accent bg-surface px-4 py-1.5 rounded-xl border border-line tracking-wider">
            {currentTime}
          </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar modo TV"
            className="text-faint hover:text-white p-2 rounded-xl hover:bg-surface-2 transition-colors cursor-pointer"
            title="Sair do Modo TV (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Slide Content */}
      <main className="flex-1 p-8 flex flex-col justify-center max-w-7xl w-full mx-auto overflow-hidden">
        {members.length === 0 ? (
          <div className="text-center p-8 bg-surface rounded-3xl border border-line max-w-md mx-auto">
            <Trophy className="w-12 h-12 text-accent mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-bold text-white mb-1">Nenhum dado carregado</h3>
            <p className="text-xs text-muted">Aguardando dados dos colaboradores para exibição no telão.</p>
          </div>
        ) : (
          <div key={currentSlide} className="flex-1 flex flex-col justify-center animate-slide-fade">
            {/* SLIDE 0: PODIUM & TOP PERFORMERS */}
            {currentSlide === 0 && (
              <div className="flex flex-col gap-6 h-full justify-center animate-in zoom-in-95 duration-500">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-widest border border-accent/20 mb-2">
                    <Trophy className="w-3.5 h-3.5" /> Pódio de Honra do Ciclo
                  </div>
                  <h2 className="text-3xl font-display font-black text-white">Top Destaques Gerais</h2>
                </div>

                {/* Podium 3 cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-4xl mx-auto w-full pt-4">
              {/* 2nd Place */}
              {top2 && (
                <div className="bg-surface border-2 border-muted/40 rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl relative order-1 transform hover:-translate-y-1 transition-transform">
                  <div className="absolute -top-5 w-10 h-10 rounded-full bg-slate-300 text-slate-900 font-black text-base flex items-center justify-center shadow-lg border-2 border-white">
                    2º
                  </div>
                  <Avatar
                    name={top2.name}
                    src={top2.avatarUrl}
                    teamColor={top2.teamColor}
                    size="2xl"
                    shape="circle"
                    className="border-2 border-silver shadow-md mb-3"
                  />
                  <h3 className="font-bold text-lg text-white truncate max-w-full">{top2.name}</h3>
                  <p className="text-xs text-muted mb-2">{top2.role} • Time {top2.team}</p>
                  <div className="bg-surface-2 px-4 py-1.5 rounded-xl border border-line font-mono font-black text-xl text-slate-200">
                    {top2.score} <span className="text-xs font-normal text-faint">/ 155</span>
                  </div>
                </div>
              )}

              {/* 1st Place (Center & Highest) */}
              {top1 && (
                <div className="bg-gradient-to-b from-gold-deep to-surface border-2 border-accent rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl relative order-2 transform -translate-y-4 shadow-accent/20">
                  <div className="absolute -top-6 w-12 h-12 rounded-full bg-accent text-accent-ink font-black text-xl flex items-center justify-center shadow-xl border-2 border-white animate-bounce">
                    <Crown className="w-6 h-6" />
                  </div>
                  <Avatar
                    name={top1.name}
                    src={top1.avatarUrl}
                    teamColor={top1.teamColor}
                    size="2xl"
                    shape="circle"
                    className="w-24 h-24 border-4 border-accent shadow-lg mb-3"
                  />
                  <h3 className="font-black text-2xl text-white truncate max-w-full">{top1.name}</h3>
                  <p className="text-xs text-accent font-semibold mb-3">{top1.role} • Time {top1.team}</p>
                  <div className="bg-accent/20 px-6 py-2 rounded-2xl border border-accent font-mono font-black text-3xl text-accent shadow-inner">
                    {top1.score} <span className="text-sm font-normal text-muted">/ 155 pts</span>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {top3 && (
                <div className="bg-surface border-2 border-bronze/50 rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl relative order-3 transform hover:-translate-y-1 transition-transform">
                  <div className="absolute -top-5 w-10 h-10 rounded-full bg-bronze text-white font-black text-base flex items-center justify-center shadow-lg border-2 border-white">
                    3º
                  </div>
                  <Avatar
                    name={top3.name}
                    src={top3.avatarUrl}
                    teamColor={top3.teamColor}
                    size="2xl"
                    shape="circle"
                    className="border-2 border-bronze shadow-md mb-3"
                  />
                  <h3 className="font-bold text-lg text-white truncate max-w-full">{top3.name}</h3>
                  <p className="text-xs text-muted mb-2">{top3.role} • Time {top3.team}</p>
                  <div className="bg-surface-2 px-4 py-1.5 rounded-xl border border-line font-mono font-black text-xl text-bronze">
                    {top3.score} <span className="text-xs font-normal text-faint">/ 155</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick ticker of 4th to 10th */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 mt-4">
              {top10.slice(3, 10).map((m, idx) => (
                <div
                  key={m.id}
                  className="bg-surface border border-line rounded-2xl p-3 flex flex-col items-center text-center"
                >
                  <span className="font-mono font-bold text-xs text-faint">{idx + 4}º</span>
                  <Avatar name={m.name} src={m.avatarUrl} teamColor={m.teamColor} size="md" shape="circle" className="my-1" />
                  <span className="font-semibold text-xs text-white truncate w-full">{m.name.split(' ')[0]}</span>
                  <span className="font-mono text-xs text-accent font-bold">{m.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLIDE 1: MAIORES EVOLUÇÕES & FOGUETES */}
        {currentSlide === 1 && (
          <div className="flex flex-col gap-6 h-full justify-center animate-in zoom-in-95 duration-500">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-success/10 text-success px-4 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-widest border border-success/20 mb-2">
                <Rocket className="w-3.5 h-3.5" /> Destaques de Crescimento
              </div>
              <h2 className="text-3xl font-display font-black text-white">Maiores Evoluções no Ranking</h2>
              <p className="text-sm text-muted mt-1">Colaboradores que mais subiram posições e superaram metas</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto w-full pt-4">
              {growthLeaders.map((m) => {
                const diff = (m.previousRank ?? m.rank) - m.rank;
                return (
                  <div
                    key={m.id}
                    className="bg-surface border border-line hover:border-success/50 rounded-2xl p-5 flex items-center gap-4 shadow-xl transition-all"
                  >
                    <div className="relative">
                      <Avatar name={m.name} src={m.avatarUrl} teamColor={m.teamColor} size="xl" className="border border-line" />
                      <div className="absolute -bottom-2 -right-2 bg-success-soft border border-success/50 text-success font-mono font-bold text-xs px-2 py-0.5 rounded-lg flex items-center gap-0.5 shadow-md">
                        <TrendingUp className="w-3 h-3" />
                        <span>+{diff}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-base truncate">{m.name}</h4>
                      <p className="text-xs text-muted truncate">{m.role} • Time {m.team}</p>
                      <div className="flex items-center gap-3 mt-2 font-mono text-xs">
                        <span className="text-faint">Posição: <strong className="text-white">{m.rank}º</strong></span>
                        <span className="text-accent font-bold">{m.score} pts</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SLIDE 2: DESEMPENHO DOS TIMES */}
        {currentSlide === 2 && (
          <div className="flex flex-col gap-6 h-full justify-center animate-in zoom-in-95 duration-500">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-info/10 text-info px-4 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-widest border border-info/20 mb-2">
                <Users className="w-3.5 h-3.5" /> Visão Executiva
              </div>
              <h2 className="text-3xl font-display font-black text-white">Desempenho por Equipe</h2>
              <p className="text-sm text-muted mt-1">Comparativo de médias e quantidade de colaboradores no nível Voando</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-5xl mx-auto w-full pt-4">
              {teamStats.map((team, idx) => (
                <div
                  key={team.leader}
                  className="bg-surface border border-line rounded-2xl p-5 shadow-xl flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                      <h4 className="font-bold text-white text-base">{team.name}</h4>
                    </div>
                    <span className="font-mono text-xs text-faint font-bold">#{idx + 1}</span>
                  </div>

                  <div className="space-y-2.5 my-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted">Média da Equipe:</span>
                      <span className="font-mono font-bold text-accent text-base">{team.avgScore} pts</span>
                    </div>
                    <div className="w-full bg-app h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${(team.avgScore / 155) * 100}%`,
                          backgroundColor: team.color,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-3 border-t border-line text-muted font-mono mt-2">
                    <span>Colaboradores: <strong className="text-white">{team.count}</strong></span>
                    <span className="text-success">Voando: <strong>{team.flyingCount}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
          {/* SLIDE 3: RECONHECIMENTO — SUBIU DE NÍVEL */}
        {currentSlide === 3 && (
          <div className="flex flex-col gap-6 h-full justify-center animate-in zoom-in-95 duration-500">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-widest border border-accent/20 mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Reconhecimento do Ciclo
              </div>
              <h2 className="text-3xl font-display font-black text-white">Parabéns, quem subiu de nível!</h2>
              <p className="text-sm text-muted mt-1">Colaboradores que elevaram a pontuação em relação ao ciclo anterior</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto w-full pt-4">
              {levelUpLeaders.map((m) => {
                const prevScore = m.history?.[m.history.length - 1]?.score ?? m.score;
                const delta = m.score - prevScore;
                return (
                  <div
                    key={m.id}
                    className="bg-surface border border-accent/40 hover:border-accent rounded-2xl p-5 flex items-center gap-4 shadow-xl transition-all"
                  >
                    <div className="relative">
                      <Avatar name={m.name} src={m.avatarUrl} teamColor={m.teamColor} size="xl" className="border border-accent/40" />
                      <div className="absolute -bottom-2 -right-2 bg-gold-soft border border-accent/50 text-accent font-mono font-bold text-xs px-2 py-0.5 rounded-lg flex items-center gap-0.5 shadow-md">
                        <Zap className="w-3 h-3" />
                        <span>+{delta}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-base truncate">{m.name}</h4>
                      <p className="text-xs text-muted truncate">{m.role} • Time {m.team}</p>
                      <div className="flex items-center gap-3 mt-2 font-mono text-xs">
                        <span className="text-faint">Nível: <strong className={m.score > 140 ? 'text-success' : 'text-white'}>{m.status}</strong></span>
                        <span className="text-accent font-bold">{m.score} pts</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {levelUpLeaders.length === 0 && (
              <p className="text-center text-sm text-faint">Ainda não há evoluções registradas neste ciclo.</p>
            )}
          </div>
        )}
          </div>
        )}
      </main>

      {/* Kiosk Footer */}
      <footer className="px-8 py-3 bg-app border-t border-line flex justify-between items-center font-mono text-xs text-faint">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-success" />
          <span>Dados carregados do Firestore</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Pressione <strong className="text-white">ESC</strong> para sair</span>
        </div>
      </footer>

      {/* QR Code linking back to the platform */}
      {qrDataUrl && (
        <div className="fixed bottom-16 right-6 z-10 bg-surface border border-line rounded-2xl p-3 flex flex-col items-center gap-1.5 shadow-2xl">
          <img src={qrDataUrl} alt="QR code para acessar a plataforma" className="w-24 h-24" />
          <span className="text-[9px] font-mono text-muted uppercase tracking-wider">Escaneie e acompanhe</span>
        </div>
      )}
    </div>
  );
};
