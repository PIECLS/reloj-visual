import { useState, useRef, useEffect } from "react";
import { MILESTONES, playEnd, playWarn, speak } from "../shared";

export default function useTimer({ sound, activeHitos, speechOn }) {
  const [totalSecs, setTotalSecs] = useState(15*60);
  const [remaining, setRemaining] = useState(15*60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [minInput, setMinInput] = useState("15");

  const endAtRef  = useRef(null);
  const prevRemRef = useRef(15*60);

  useEffect(()=>{
    if(!running) return;
    endAtRef.current = Date.now()+remaining*1000;
    const id = setInterval(()=>{
      const rem  = Math.max(0,(endAtRef.current-Date.now())/1000);
      const prev = prevRemRef.current;
      MILESTONES.forEach(({key,secs,minTotal,text})=>{
        if(activeHitos[key]&&prev>secs&&rem<=secs&&totalSecs>minTotal){
          playWarn(sound);
          if(speechOn&&sound!=="off") speak(text);
        }
      });
      prevRemRef.current = rem;
      setRemaining(rem);
      if(rem<=0){ clearInterval(id); setRunning(false); playEnd(sound); setDone(true); }
    },200);
    return ()=>clearInterval(id);
  },[running]); // eslint-disable-line

  const setMinutes = (mins) => {
    const m = Math.min(60,Math.max(1,Math.round(mins)));
    const secs = m*60;
    setTotalSecs(secs); setRemaining(secs);
    prevRemRef.current = secs;
    setMinInput(String(m)); setDone(false);
  };

  const start = () => { if(remaining<=0) setMinutes(Number(minInput)||15); setDone(false); setRunning(true); };
  const pause = () => setRunning(false);
  const reset = () => { setRunning(false); setDone(false); setRemaining(totalSecs); prevRemRef.current=totalSecs; };

  // Carga minutos y opcionalmente arranca (usado por rutinas)
  const loadMinutes = (mins, autostart=false) => {
    const m = Math.min(60,Math.max(1,Math.round(mins)));
    const secs = m*60;
    setTotalSecs(secs); setRemaining(secs);
    prevRemRef.current = secs;
    setMinInput(String(m)); setDone(false);
    if(autostart) setRunning(true);
  };

  return {
    totalSecs, remaining, running, done, setDone,
    minInput, setMinInput, setMinutes, loadMinutes,
    start, pause, reset,
  };
}
