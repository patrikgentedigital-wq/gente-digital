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
      className="fixed inset-0 z-50 bg-[#060D1A] text-[#F2F5FA] flex flex-col font-sans select-none overflow-hidden animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kiosk-mode-title"
      tabIndex={-1}
    >
      {/* Kiosk Header */}
      <header className="px-8 py-4 bg-[#0A1424]/90 border-b border-[#22365C] flex justify-between items-center backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#E3A73B] flex items-center justify-center text-[#1a1200] font-black text-xl shadow-lg shadow-[#E3A73B]/20">
            GD
          </div>
          <div>
            <div className="flex items-center gap-2">
                 <h1 id="kiosk-mode-title" className="font-display font-black text-2xl tracking-wider text-white">
                GENTE DIGITAL
              </h1>
              <span className="bg-[#E3A73B]/20 text-[#E3A73B] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-[#E3A73B]/30 uppercase tracking-widest animate-pulse">
                AO VIVO • CICLO ATUAL
              </span>
            </div>
            <p className="text-xs text-[#A9B7CE] font-medium">Painel Corporativo de Performance & Desempenho</p>
          </div>
        </div>

        {/* Controls & Clock */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-[#0F1E38] px-3 py-1.5 rounded-xl border border-[#22365C]">
            <button
              onClick={() => setCurrentSlide((prev) => (prev === 0 ? 3 : prev - 1))}
              className="p-1 text-[#A9B7CE] hover:text-white transition-colors cursor-pointer"
              title="Slide anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1 text-[#E3A73B] hover:text-[#eeb64f] transition-colors cursor-pointer"
              title={isPlaying ? 'Pausar rotação' : 'Iniciar rotação'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % 4)}
              className="p-1 text-[#A9B7CE] hover:text-white transition-colors cursor-pointer"
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
                    currentSlide === idx ? 'bg-[#E3A73B] w-6' : 'bg-[#22365C]'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="font-mono font-bold text-xl text-[#E3A73B] bg-[#0F1E38] px-4 py-1.5 rounded-xl border border-[#22365C] tracking-wider">
            {currentTime}
          </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar modo TV"
            className="text-[#6C7C99] hover:text-white p-2 rounded-xl hover:bg-[#14294A] transition-colors cursor-pointer"
            title="Sair do Modo TV (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Slide Content */}
      <main className="flex-1 p-8 flex flex-col justify-center max-w-7xl w-full mx-auto overflow-hidden">
        {members.length === 0 ? (
          <div className="text-center p-8 bg-[#0F1E38] rounded-3xl border border-[#22365C] max-w-md mx-auto">
            <Trophy className="w-12 h-12 text-[#E3A73B] mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-bold text-white mb-1">Nenhum dado carregado</h3>
            <p className="text-xs text-[#A9B7CE]">Aguardando dados dos colaboradores para exibição no telão.</p>
          </div>
        ) : (
          <>
            {/* SLIDE 0: PODIUM & TOP PERFORMERS */}
            {currentSlide === 0 && (
              <div className="flex flex-col gap-6 h-full justify-center animate-in zoom-in-95 duration-500">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-[#E3A73B]/10 text-[#E3A73B] px-4 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-widest border border-[#E3A73B]/20 mb-2">
                    <Trophy className="w-3.5 h-3.5" /> Pódio de Honra do Ciclo
                  </div>
                  <h2 className="text-3xl font-display font-black text-white">Top Destaques Gerais</h2>
                </div>

                {/* Podium 3 cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-4xl mx-auto w-full pt-4">
              {/* 2nd Place */}
              {top2 && (
                <div className="bg-[#0F1E38] border-2 border-[#A9B7CE]/40 rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl relative order-1 transform hover:-translate-y-1 transition-transform">
                  <div className="absolute -top-5 w-10 h-10 rounded-full bg-slate-300 text-slate-900 font-black text-base flex items-center justify-center shadow-lg border-2 border-white">
                    2º
                  </div>
                  <img
                    src={top2.avatarUrl}
                    alt={top2.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-slate-300 shadow-md mb-3"
                  />
                  <h3 className="font-bold text-lg text-white truncate max-w-full">{top2.name}</h3>
                  <p className="text-xs text-[#A9B7CE] mb-2">{top2.role} • Time {top2.team}</p>
                  <div className="bg-[#14294A] px-4 py-1.5 rounded-xl border border-[#22365C] font-mono font-black text-xl text-slate-200">
                    {top2.score} <span className="text-xs font-normal text-[#6C7C99]">/ 155</span>
                  </div>
                </div>
              )}

              {/* 1st Place (Center & Highest) */}
              {top1 && (
                <div className="bg-gradient-to-b from-[#1c3057] to-[#0F1E38] border-2 border-[#E3A73B] rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl relative order-2 transform -translate-y-4 shadow-[#E3A73B]/20">
                  <div className="absolute -top-6 w-12 h-12 rounded-full bg-[#E3A73B] text-[#1a1200] font-black text-xl flex items-center justify-center shadow-xl border-2 border-white animate-bounce">
                    <Crown className="w-6 h-6" />
                  </div>
                  <img
                    src={top1.avatarUrl}
                    alt={top1.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-[#E3A73B] shadow-lg mb-3"
                  />
                  <h3 className="font-black text-2xl text-white truncate max-w-full">{top1.name}</h3>
                  <p className="text-xs text-[#E3A73B] font-semibold mb-3">{top1.role} • Time {top1.team}</p>
                  <div className="bg-[#E3A73B]/20 px-6 py-2 rounded-2xl border border-[#E3A73B] font-mono font-black text-3xl text-[#E3A73B] shadow-inner">
                    {top1.score} <span className="text-sm font-normal text-[#A9B7CE]">/ 155 pts</span>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {top3 && (
                <div className="bg-[#0F1E38] border-2 border-[#cd7f32]/50 rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl relative order-3 transform hover:-translate-y-1 transition-transform">
                  <div className="absolute -top-5 w-10 h-10 rounded-full bg-[#cd7f32] text-white font-black text-base flex items-center justify-center shadow-lg border-2 border-white">
                    3º
                  </div>
                  <img
                    src={top3.avatarUrl}
                    alt={top3.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-[#cd7f32] shadow-md mb-3"
                  />
                  <h3 className="font-bold text-lg text-white truncate max-w-full">{top3.name}</h3>
                  <p className="text-xs text-[#A9B7CE] mb-2">{top3.role} • Time {top3.team}</p>
                  <div className="bg-[#14294A] px-4 py-1.5 rounded-xl border border-[#22365C] font-mono font-black text-xl text-[#cd7f32]">
                    {top3.score} <span className="text-xs font-normal text-[#6C7C99]">/ 155</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick ticker of 4th to 10th */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 mt-4">
              {top10.slice(3, 10).map((m, idx) => (
                <div
                  key={m.id}
                  className="bg-[#0F1E38] border border-[#22365C] rounded-2xl p-3 flex flex-col items-center text-center"
                >
                  <span className="font-mono font-bold text-xs text-[#6C7C99]">{idx + 4}º</span>
                  <img src={m.avatarUrl} alt={m.name} className="w-10 h-10 rounded-full my-1 object-cover" />
                  <span className="font-semibold text-xs text-white truncate w-full">{m.name.split(' ')[0]}</span>
                  <span className="font-mono text-xs text-[#E3A73B] font-bold">{m.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLIDE 1: MAIORES EVOLUÇÕES & FOGUETES */}
        {currentSlide === 1 && (
          <div className="flex flex-col gap-6 h-full justify-center animate-in zoom-in-95 duration-500">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-[#4fb579]/10 text-[#4fb579] px-4 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-widest border border-[#4fb579]/20 mb-2">
                <Rocket className="w-3.5 h-3.5" /> Destaques de Crescimento
              </div>
              <h2 className="text-3xl font-display font-black text-white">Maiores Evoluções no Ranking</h2>
              <p className="text-sm text-[#A9B7CE] mt-1">Colaboradores que mais subiram posições e superaram metas</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto w-full pt-4">
              {growthLeaders.map((m) => {
                const diff = (m.previousRank ?? m.rank) - m.rank;
                return (
                  <div
                    key={m.id}
                    className="bg-[#0F1E38] border border-[#22365C] hover:border-[#4fb579]/50 rounded-2xl p-5 flex items-center gap-4 shadow-xl transition-all"
                  >
                    <div className="relative">
                      <img src={m.avatarUrl} alt={m.name} className="w-16 h-16 rounded-2xl object-cover border border-[#22365C]" />
                      <div className="absolute -bottom-2 -right-2 bg-[#132a1c] border border-[#4fb579]/50 text-[#4fb579] font-mono font-bold text-xs px-2 py-0.5 rounded-lg flex items-center gap-0.5 shadow-md">
                        <TrendingUp className="w-3 h-3" />
                        <span>+{diff}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-base truncate">{m.name}</h4>
                      <p className="text-xs text-[#A9B7CE] truncate">{m.role} • Time {m.team}</p>
                      <div className="flex items-center gap-3 mt-2 font-mono text-xs">
                        <span className="text-[#6C7C99]">Posição: <strong className="text-white">{m.rank}º</strong></span>
                        <span className="text-[#E3A73B] font-bold">{m.score} pts</span>
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
              <div className="inline-flex items-center gap-2 bg-[#38BDF8]/10 text-[#38BDF8] px-4 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-widest border border-[#38BDF8]/20 mb-2">
                <Users className="w-3.5 h-3.5" /> Visão Executiva
              </div>
              <h2 className="text-3xl font-display font-black text-white">Desempenho por Equipe</h2>
              <p className="text-sm text-[#A9B7CE] mt-1">Comparativo de médias e quantidade de colaboradores no nível Voando</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-5xl mx-auto w-full pt-4">
              {teamStats.map((team, idx) => (
                <div
                  key={team.leader}
                  className="bg-[#0F1E38] border border-[#22365C] rounded-2xl p-5 shadow-xl flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                      <h4 className="font-bold text-white text-base">{team.name}</h4>
                    </div>
                    <span className="font-mono text-xs text-[#6C7C99] font-bold">#{idx + 1}</span>
                  </div>

                  <div className="space-y-2.5 my-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#A9B7CE]">Média da Equipe:</span>
                      <span className="font-mono font-bold text-[#E3A73B] text-base">{team.avgScore} pts</span>
                    </div>
                    <div className="w-full bg-[#0A1424] h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${(team.avgScore / 155) * 100}%`,
                          backgroundColor: team.color,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-3 border-t border-[#22365C] text-[#A9B7CE] font-mono mt-2">
                    <span>Colaboradores: <strong className="text-white">{team.count}</strong></span>
                    <span className="text-[#4fb579]">Voando: <strong>{team.flyingCount}</strong></span>
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
              <div className="inline-flex items-center gap-2 bg-[#E3A73B]/10 text-[#E3A73B] px-4 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-widest border border-[#E3A73B]/20 mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Reconhecimento do Ciclo
              </div>
              <h2 className="text-3xl font-display font-black text-white">Parabéns, quem subiu de nível!</h2>
              <p className="text-sm text-[#A9B7CE] mt-1">Colaboradores que elevaram a pontuação em relação ao ciclo anterior</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto w-full pt-4">
              {levelUpLeaders.map((m) => {
                const prevScore = m.history?.[m.history.length - 1]?.score ?? m.score;
                const delta = m.score - prevScore;
                return (
                  <div
                    key={m.id}
                    className="bg-[#0F1E38] border border-[#E3A73B]/40 hover:border-[#E3A73B] rounded-2xl p-5 flex items-center gap-4 shadow-xl transition-all"
                  >
                    <div className="relative">
                      <img src={m.avatarUrl} alt={m.name} className="w-16 h-16 rounded-2xl object-cover border border-[#E3A73B]/40" />
                      <div className="absolute -bottom-2 -right-2 bg-[#3A2A10] border border-[#E3A73B]/50 text-[#E3A73B] font-mono font-bold text-xs px-2 py-0.5 rounded-lg flex items-center gap-0.5 shadow-md">
                        <Zap className="w-3 h-3" />
                        <span>+{delta}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-base truncate">{m.name}</h4>
                      <p className="text-xs text-[#A9B7CE] truncate">{m.role} • Time {m.team}</p>
                      <div className="flex items-center gap-3 mt-2 font-mono text-xs">
                        <span className="text-[#6C7C99]">Nível: <strong className={m.score > 140 ? 'text-[#4fb579]' : 'text-white'}>{m.status}</strong></span>
                        <span className="text-[#E3A73B] font-bold">{m.score} pts</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {levelUpLeaders.length === 0 && (
              <p className="text-center text-sm text-[#6C7C99]">Ainda não há evoluções registradas neste ciclo.</p>
            )}
          </div>
        )}
          </>
        )}
      </main>

      {/* Kiosk Footer */}
      <footer className="px-8 py-3 bg-[#0A1424] border-t border-[#22365C] flex justify-between items-center font-mono text-xs text-[#6C7C99]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#4fb579]" />
          <span>Dados carregados do Firestore</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Pressione <strong className="text-white">ESC</strong> para sair</span>
        </div>
      </footer>
    </div>
  );
};
