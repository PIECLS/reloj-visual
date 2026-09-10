import { useState, useEffect } from "react";

function ls(key, def) {
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? def; }
  catch { return def; }
}
function sv(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export const DEFAULT_HORARIOS = [
  {
    id: 1,
    nombre: "Primer ciclo",
    recreos: [
      { id: 11, inicio: "10:00", fin: "10:20" },
      { id: 12, inicio: "12:30", fin: "13:00" },
    ],
  },
  {
    id: 2,
    nombre: "Segundo ciclo",
    recreos: [
      { id: 21, inicio: "10:15", fin: "10:35" },
      { id: 22, inicio: "12:30", fin: "13:00" },
    ],
  },
];

function toMins(hhmm) {
  const [h, m] = (hhmm || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Calcula el estado actual respecto al horario de recreos.
 * Devuelve:
 *   { tipo: "hacia_recreo", secsLeft, blockTotal, recreo }
 *   { tipo: "en_recreo",    secsLeft, blockTotal, recreo }
 *   { tipo: "sin_recreos",  secsLeft: 0, blockTotal: 0, recreo: null }
 */
export function calcularEstado(recreos, now) {
  const sorted = [...recreos]
    .filter(r => r.inicio && r.fin && toMins(r.fin) > toMins(r.inicio))
    .sort((a, b) => toMins(a.inicio) - toMins(b.inicio));

  if (!sorted.length) return { tipo: "sin_recreos", secsLeft: 0, blockTotal: 0, recreo: null };

  const nowSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  let prevEndSecs = 0;

  for (const rec of sorted) {
    const inicioSecs = toMins(rec.inicio) * 60;
    const finSecs    = toMins(rec.fin)    * 60;

    if (nowSecs < inicioSecs) {
      return {
        tipo: "hacia_recreo",
        secsLeft:   Math.round(inicioSecs - nowSecs),
        blockTotal: Math.max(1, inicioSecs - prevEndSecs),
        recreo: rec,
      };
    }
    if (nowSecs < finSecs) {
      return {
        tipo: "en_recreo",
        secsLeft:   Math.round(finSecs - nowSecs),
        blockTotal: Math.max(1, finSecs - inicioSecs),
        recreo: rec,
      };
    }
    prevEndSecs = finSecs;
  }

  return { tipo: "sin_recreos", secsLeft: 0, blockTotal: 0, recreo: null };
}

export default function useHorarioRecreos() {
  const [horarios,    setHorarios]    = useState(() => ls("rv-horarios", DEFAULT_HORARIOS));
  const [activoId,    setActivoId]    = useState(() => ls("rv-horario-activo-id", 1));
  const [modoHorario, setModoHorario] = useState(() => ls("rv-modo-horario", false));

  useEffect(() => { sv("rv-horarios",            horarios);    }, [horarios]);
  useEffect(() => { sv("rv-horario-activo-id",   activoId);    }, [activoId]);
  useEffect(() => { sv("rv-modo-horario",         modoHorario); }, [modoHorario]);

  const horarioActivo = horarios.find(h => h.id === activoId) ?? horarios[0] ?? null;

  const crearHorario = () => {
    const nuevo = { id: Date.now(), nombre: "Nuevo horario", recreos: [] };
    setHorarios(h => [...h, nuevo]);
    setActivoId(nuevo.id);
  };

  const renombrarHorario = (id, nombre) =>
    setHorarios(h => h.map(x => x.id === id ? { ...x, nombre } : x));

  const eliminarHorario = (id) =>
    setHorarios(prev => {
      const sig = prev.filter(x => x.id !== id);
      if (activoId === id && sig.length) setActivoId(sig[0].id);
      return sig;
    });

  const agregarRecreo = (horarioId) =>
    setHorarios(h => h.map(x => x.id === horarioId
      ? { ...x, recreos: [...x.recreos, { id: Date.now(), inicio: "10:00", fin: "10:20" }] }
      : x));

  const actualizarRecreo = (horarioId, recreoId, field, value) =>
    setHorarios(h => h.map(x => x.id === horarioId
      ? { ...x, recreos: x.recreos.map(r => r.id === recreoId ? { ...r, [field]: value } : r) }
      : x));

  const eliminarRecreo = (horarioId, recreoId) =>
    setHorarios(h => h.map(x => x.id === horarioId
      ? { ...x, recreos: x.recreos.filter(r => r.id !== recreoId) }
      : x));

  return {
    horarios, horarioActivo, activoId, setActivoId,
    modoHorario, setModoHorario,
    crearHorario, renombrarHorario, eliminarHorario,
    agregarRecreo, actualizarRecreo, eliminarRecreo,
  };
}
