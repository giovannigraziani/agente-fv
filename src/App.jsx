import React, { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const ZONE_DATA = {
  "Nord":   { irr:1200, label:"Nord Italia (es. Milano, Torino)" },
  "Centro": { irr:1450, label:"Centro Italia (es. Roma, Firenze)" },
  "Sud":    { irr:1650, label:"Sud Italia (es. Napoli, Bari)" },
  "Isole":  { irr:1750, label:"Isole (Sicilia, Sardegna)" },
};
const ROOF_COEFF={"Falda Sud":1.0,"Falda SE/SO":0.95,"Piano":0.88,"Shed":0.92};
const PANEL_KWP=0.42,PANEL_M2=1.7,COSTO_KWH=0.28,COSTO_KWP=1450,CO2_PER_KWH=0.233;
const MESI=["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const MESI_COEFF=[0.55,0.65,0.85,1.0,1.12,1.18,1.20,1.15,1.00,0.80,0.60,0.50];
const FASCE=[
  {label:"Micro",    min:10000, max:100000, default:50000, step:5000},
  {label:"Piccola",  min:100000,max:500000, default:250000,step:10000},
  {label:"Media",    min:500000,max:2000000,default:800000,step:50000},
];
const COLORS=["#22c55e","#facc15"];

function useIsMobile(){
  const [mobile,setMobile]=useState(window.innerWidth<600);
  useEffect(()=>{
    const fn=()=>setMobile(window.innerWidth<600);
    window.addEventListener("resize",fn);
    return()=>window.removeEventListener("resize",fn);
  },[]);
  return mobile;
}

function calcola(input){
  const {consumo,zona,tetto,superficie,autoconsumoPerc}=input;
  const irr=ZONE_DATA[zona].irr,coeff=ROOF_COEFF[tetto],pr=0.80;
  const potenza=Math.min((consumo/(irr*pr*coeff))*1000,(superficie/PANEL_M2)*PANEL_KWP);
  const potenzaArr=Math.round(potenza*10)/10;
  const nPannelli=Math.ceil(potenza/PANEL_KWP);
  const produzioneAnnua=Math.round(potenza*irr*pr*coeff);
  const autoconsumo=Math.round(produzioneAnnua*autoconsumoPerc/100);
  const immissione=produzioneAnnua-autoconsumo;
  const risparmioTotale=Math.round(autoconsumo*COSTO_KWH+immissione*0.09);
  const costoImpianto=Math.round(potenzaArr*COSTO_KWP);
  const payback=(costoImpianto/risparmioTotale).toFixed(1);
  const co2=Math.round(produzioneAnnua*CO2_PER_KWH);
  const totC=MESI_COEFF.reduce((a,b)=>a+b,0);
  const mensile=MESI.map((m,i)=>({mese:m,produzione:Math.round(produzioneAnnua*MESI_COEFF[i]/totC),consumoMensile:Math.round(consumo/12)}));
  const confronto=Array.from({length:6},(_,i)=>{const a=(i+1)*5;return{anno:`A.${a}`,senzaFV:Math.round(consumo*COSTO_KWH*Math.pow(1.03,a)),conFV:Math.round((consumo-autoconsumo)*COSTO_KWH*Math.pow(1.03,a))};});
  const donut=[{name:"Autoconsumo",value:autoconsumo},{name:"Immissione rete",value:immissione}];
  return {potenzaArr,nPannelli,produzioneAnnua,autoconsumo,immissione,risparmioTotale,costoImpianto,payback,co2,mensile,confronto,donut};
}

function Counter({target,duration=900}){
  const [val,setVal]=useState(0);
  useEffect(()=>{let s=null;const step=ts=>{if(!s)s=ts;const p=Math.min((ts-s)/duration,1);setVal(Math.round(p*target));if(p<1)requestAnimationFrame(step);};requestAnimationFrame(step);},[target,duration]);
  return <span>{val.toLocaleString("it-IT")}</span>;
}
function FadeIn({delay=0,children}){
  const [vis,setVis]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setVis(true),delay);return()=>clearTimeout(t);},[delay]);
  return <div style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(14px)",transition:"opacity .5s ease,transform .5s ease"}}>{children}</div>;
}
function FormattedText({text}){
  const parts=[];const rx=/(\*\*(.+?)\*\*)|(\*(.+?)\*)/g;let last=0,m;
  while((m=rx.exec(text))!==null){
    if(m.index>last)parts.push(<span key={last}>{text.slice(last,m.index)}</span>);
    if(m[1])parts.push(<strong key={m.index} style={{color:"#4ade80"}}>{m[2]}</strong>);
    else parts.push(<em key={m.index}>{m[4]}</em>);
    last=m.index+m[0].length;
  }
  if(last<text.length)parts.push(<span key={last}>{text.slice(last)}</span>);
  return <span style={{lineHeight:1.75,fontSize:13,color:"#d1fae5"}}>{parts}</span>;
}
function Spinner(){
  const [a,setA]=useState(0);
  useEffect(()=>{const id=setInterval(()=>setA(x=>x+12),50);return()=>clearInterval(id);},[]);
  return <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20,padding:"60px 0"}}>
    <div style={{width:48,height:48,border:"4px solid #166534",borderTopColor:"#4ade80",borderRadius:"50%",transform:`rotate(${a}deg)`}}/>
    <div style={{color:"#86efac",fontSize:13}}>⚙️ Elaborazione in corso…</div>
  </div>;
}
function RotatingSun(){
  const [a,setA]=useState(0);
  useEffect(()=>{const id=setInterval(()=>setA(x=>(x+0.4)%360),30);return()=>clearInterval(id);},[]);
  return <span style={{display:"inline-block",transform:`rotate(${a}deg)`,fontSize:28,lineHeight:1}}>☀️</span>;
}
function PulseDot({color="#86efac"}){
  const [op,setOp]=useState(0.3);
  useEffect(()=>{let up=true;const id=setInterval(()=>{setOp(o=>{const n=up?o+0.07:o-0.07;if(n>=1)up=false;if(n<=0.3)up=true;return Math.min(1,Math.max(0.3,n));});},60);return()=>clearInterval(id);},[]);
  return <span style={{display:"inline-flex",alignItems:"center",gap:3}}>
    {[0,1,2].map(i=><span key={i} style={{width:4,height:4,borderRadius:"50%",background:color,opacity:op,display:"inline-block"}}/>)}
  </span>;
}
function PopFlash({children,color,ready}){
  const [flash,setFlash]=useState(false);
  const prev=useRef(false);
  useEffect(()=>{if(ready&&!prev.current){setFlash(true);setTimeout(()=>setFlash(false),600);}prev.current=ready;},[ready]);
  return <div style={{transition:"box-shadow .4s ease",boxShadow:flash?`0 0 14px ${color}99`:"none",borderRadius:12}}>{children}</div>;
}

async function fetchAI(prompt){
  const key=import.meta.env.VITE_GEMINI_KEY;
  const url=`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
  const rsp=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:2048}})});
  const data=await rsp.json();
  if(data.error)throw new Error(JSON.stringify(data.error));
  return data.candidates?.[0]?.content?.parts?.[0]?.text||"";
}
function parseTag(text,tag){
  const m=text.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m?m[1].trim():"";
}

function buildUnifiedPrompt(input,res){
  const c=`Consumo ${input.consumo.toLocaleString()}kWh/anno | Zona ${input.zona} | Tetto ${input.tetto} | Superficie ${input.superficie}m² | Potenza ${res.potenzaArr}kWp | ${res.nPannelli} pannelli | Produzione ${res.produzioneAnnua.toLocaleString()}kWh/anno | Autoconsumo ${res.autoconsumo.toLocaleString()}kWh (${input.autoconsumoPerc}%) | Immissione ${res.immissione.toLocaleString()}kWh | Risparmio €${res.risparmioTotale.toLocaleString()}/anno | Costo €${res.costoImpianto.toLocaleString()} | Payback ${res.payback}anni | CO₂ ${res.co2.toLocaleString()}kg`;
  return `Sei un consulente senior fotovoltaico. Analizza questo impianto e rispondi ESATTAMENTE nel formato XML seguente, senza testo fuori dai tag. Italiano. Max 2 frasi per KPI. **grassetto** per numeri chiave. Zero filler.

<verdetto>
ESITO: [Consigliato / Non consigliato / Consigliato con riserva]
MOTIVAZIONE: [max 12 parole]
NOTA: [2 frasi operative per il commerciale, **grassetto** per punti critici]
</verdetto>
<potenza>[Potenza ${res.potenzaArr}kWp: limitata da consumo o superficie? Margine espansione?]</potenza>
<pannelli>[${res.nPannelli} pannelli su ${input.superficie}m²: densità occupata? Superficie libera?]</pannelli>
<produzione>[Produzione copre quale % del fabbisogno? Buon risultato per zona ${input.zona}?]</produzione>
<risparmio>[Scomponi €${res.risparmioTotale.toLocaleString()}/anno: autoconsumo €${Math.round(res.autoconsumo*COSTO_KWH).toLocaleString()} vs immissione €${Math.round(res.immissione*0.09).toLocaleString()}. Peso relativo?]</risparmio>
<co2>[${res.co2.toLocaleString()}kg CO₂/anno: equivalenze concrete (auto, alberi). Vantaggio ESG?]</co2>
<costo>[€${res.costoImpianto.toLocaleString()}: incentivi applicabili (Transizione 5.0, detrazione 50%)? Costo netto?]</costo>
<payback>[Payback ${res.payback}anni vs media 6-9a. Rendimento % annuo sull'investimento?]</payback>
<autoconsumo>[${input.autoconsumoPerc}% autoconsumo: coerente col profilo d'uso? Conviene accumulo?]</autoconsumo>

Dati: ${c}`;
}

export default function App(){
  const mobile=useIsMobile();
  const [step,setStep]=useState(1);
  const [loading,setLoading]=useState(false);
  const [fascia,setFascia]=useState(0);
  const [input,setInput]=useState({nomeCliente:"",consumo:50000,zona:"Centro",tetto:"Falda Sud",superficie:500,autoconsumoPerc:65});
  const [risultato,setRisultato]=useState(null);
  const [kpiTexts,setKpiTexts]=useState({});
  const [kpiLoading,setKpiLoading]=useState({});
  const [selectedKpi,setSelectedKpi]=useState(null);
  const [verdetto,setVerdetto]=useState(null);
  const [verdLoading,setVerdLoading]=useState(false);

  const f=FASCE[fascia];
  const set=(k,v)=>setInput(p=>({...p,[k]:v}));

  const avvia=async()=>{
    setLoading(true);
    const res=calcola(input);
    setRisultato(res);
    setKpiTexts({});setKpiLoading({});setSelectedKpi(null);setVerdetto(null);

    const kpiKeys=["potenza","pannelli","produzione","risparmio","co2","costo","payback","autoconsumo"];
    const lm={};kpiKeys.forEach(k=>lm[k]=true);
    setKpiLoading(lm);setVerdLoading(true);

    (async()=>{
      try{
        const t=await fetchAI(buildUnifiedPrompt(input,res));
        setVerdetto(parseTag(t,"verdetto")||"ESITO: Consigliato con riserva\nMOTIVAZIONE: Errore nel recupero dati.\nNOTA: Riprovare.");
        setVerdLoading(false);
        const texts={};kpiKeys.forEach(k=>{texts[k]=parseTag(t,k)||"Analisi non disponibile.";});
        setKpiTexts(texts);setKpiLoading({});
      }catch(err){
        setVerdetto("ESITO: Consigliato con riserva\nMOTIVAZIONE: Errore nel recupero dati.\nNOTA: Riprovare.");
        setVerdLoading(false);
        const texts={};kpiKeys.forEach(k=>{texts[k]="Analisi non disponibile.";});
        setKpiTexts(texts);setKpiLoading({});
      }
    })();

    setLoading(false);setStep(2);
  };

  const reset=()=>{setStep(1);setRisultato(null);setKpiTexts({});setVerdetto(null);setSelectedKpi(null);};

  function parseVerdetto(text){
    if(!text)return null;
    const esito=(text.match(/ESITO\s*:\s*(.+)/i)||[])[1]?.trim()||"";
    const motiv=(text.match(/MOTIVAZIONE\s*:\s*(.+)/i)||[])[1]?.trim()||"";
    const nota=(text.match(/NOTA\s*:\s*([\s\S]+)/i)||[])[1]?.trim()||"";
    const low=esito.toLowerCase();
    const tipo=low.includes("non")?"no":low.includes("riserva")?"maybe":"yes";
    return {esito,motiv,nota,tipo};
  }

  const verd=verdetto?parseVerdetto(verdetto):null;
  const verdColor=!verd?"#86efac":verd.tipo==="yes"?"#22c55e":verd.tipo==="no"?"#f87171":"#facc15";
  const verdLabel=!verd?"—":verd.tipo==="yes"?"✓ CONSIGLIATO":verd.tipo==="no"?"✗ NON CONSIGLIATO":"⚠ CON RISERVA";

  const inp={width:"100%",padding:"10px 12px",borderRadius:10,border:"1px solid #166534",background:"rgba(255,255,255,0.07)",color:"#e8f5e9",fontSize:14,boxSizing:"border-box"};
  const sel={...inp,background:"#1a3a2a"};
  const card={background:"rgba(255,255,255,0.05)",borderRadius:14,padding:mobile?"12px 10px":"18px 16px",border:"1px solid #166534"};

  const KPI_DEFS=risultato?[
    {icon:"⚡",label:"Potenza",      pre:"",   val:<Counter target={Math.round(risultato.potenzaArr*10)}/>, post:" kWp", color:"#facc15",key:"potenza"},
    {icon:"🔆",label:"Pannelli",     pre:"",   val:<Counter target={risultato.nPannelli}/>,                 post:" pz",  color:"#4ade80",key:"pannelli"},
    {icon:"📊",label:"Produzione",   pre:"",   val:<Counter target={risultato.produzioneAnnua} duration={1000}/>, post:" kWh",color:"#34d399",key:"produzione"},
    {icon:"💶",label:"Risparmio/a",  pre:"€ ", val:<Counter target={risultato.risparmioTotale} duration={1100}/>,post:"",   color:"#a78bfa",key:"risparmio"},
    {icon:"🌱",label:"CO₂ evitata",  pre:"",   val:<Counter target={risultato.co2} duration={900}/>,        post:" kg", color:"#6ee7b7",key:"co2"},
    {icon:"🏗️",label:"Costo",        pre:"€ ", val:<Counter target={risultato.costoImpianto} duration={1000}/>,post:"",  color:"#fbbf24",key:"costo"},
    {icon:"📅",label:"Payback",      pre:"",   val:risultato.payback,                                        post:" a",  color:"#f87171",key:"payback"},
    {icon:"🔄",label:"Autoconsumo",  pre:"",   val:input.autoconsumoPerc,                                    post:"%",  color:"#60a5fa",key:"autoconsumo"},
  ]:[];

  const selDef=selectedKpi?KPI_DEFS.find(k=>k.key===selectedKpi):null;

  // KPI grid: 4 col desktop, 2 col mobile
  const kpiCols=mobile?"repeat(2,1fr)":"repeat(4,1fr)";

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f2417 0%,#1a3a2a 50%,#0d1f15 100%)",fontFamily:"'Segoe UI',sans-serif",color:"#e8f5e9",boxSizing:"border-box"}}>

      {/* Header */}
      <div style={{background:"linear-gradient(90deg,#166534,#15803d)",padding:mobile?"12px 16px":"16px 28px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 4px 20px rgba(0,0,0,0.4)"}}>
        <RotatingSun/>
        <div style={{fontSize:mobile?14:18,fontWeight:700,letterSpacing:.2,lineHeight:1.3}}>
          {mobile?"Agente FV":"Agente FV · Dimensionamento Impianti Fotovoltaici"}
        </div>
        <div style={{marginLeft:"auto",background:"rgba(255,255,255,0.12)",borderRadius:20,padding:"4px 10px",fontSize:11,color:"#86efac",whiteSpace:"nowrap"}}>🤖 AI</div>
      </div>

      <div style={{width:"100%",maxWidth:900,margin:"0 auto",padding:mobile?"16px 12px":"28px 16px",boxSizing:"border-box"}}>

        {/* ── STEP 1 ── */}
        {step===1&&(
          <div>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:mobile?19:24,fontWeight:700,color:"#4ade80"}}>Inserisci i dati del cliente</div>
              <div style={{color:"#86efac",marginTop:5,fontSize:13}}>Compila il form per ottenere la configurazione ottimale</div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:14}}>
              {/* Nome */}
              <div style={{gridColumn:"1/-1"}}>
                <label style={{display:"block",marginBottom:6,color:"#86efac",fontWeight:600,fontSize:12}}>👤 Nome cliente / Azienda</label>
                <input value={input.nomeCliente} onChange={e=>set("nomeCliente",e.target.value)} placeholder="es. Rossi Srl" style={inp}/>
              </div>

              {/* Fascia */}
              <div style={{gridColumn:"1/-1"}}>
                <label style={{display:"block",marginBottom:6,color:"#86efac",fontWeight:600,fontSize:12}}>🏭 Dimensione azienda</label>
                <div style={{display:"flex",gap:8}}>
                  {FASCE.map((fa,i)=>(
                    <button key={i} onClick={()=>{setFascia(i);set("consumo",fa.default);}}
                      style={{flex:1,padding:mobile?"8px 4px":"10px 8px",borderRadius:10,border:`2px solid ${fascia===i?"#22c55e":"#166534"}`,background:fascia===i?"rgba(34,197,94,0.15)":"transparent",color:fascia===i?"#4ade80":"#86efac",fontWeight:600,fontSize:mobile?12:13,cursor:"pointer",transition:"all .2s"}}>
                      {fa.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Consumo */}
              <div>
                <label style={{display:"block",marginBottom:6,color:"#86efac",fontWeight:600,fontSize:12}}>⚡ Consumo annuo (kWh)</label>
                <input type="number" value={input.consumo} onChange={e=>set("consumo",+e.target.value)} min={f.min} max={f.max} style={inp}/>
                <input type="range" min={f.min} max={f.max} step={f.step} value={Math.min(Math.max(input.consumo,f.min),f.max)} onChange={e=>set("consumo",+e.target.value)} style={{width:"100%",marginTop:6,accentColor:"#22c55e"}}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#4ade80",marginTop:2}}>
                  <span>{(f.min/1000).toFixed(0)}k</span>
                  <span style={{fontWeight:700}}>{(input.consumo/1000).toFixed(0)}k kWh/a</span>
                  <span>{(f.max/1000).toFixed(0)}k</span>
                </div>
              </div>

              {/* Superficie */}
              <div>
                <label style={{display:"block",marginBottom:6,color:"#86efac",fontWeight:600,fontSize:12}}>📐 Superficie tetto (m²)</label>
                <input type="number" value={input.superficie} onChange={e=>set("superficie",+e.target.value)} min={100} max={10000} style={inp}/>
                <input type="range" min={100} max={5000} step={50} value={input.superficie} onChange={e=>set("superficie",+e.target.value)} style={{width:"100%",marginTop:6,accentColor:"#22c55e"}}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#4ade80",marginTop:2}}>
                  <span>100 m²</span>
                  <span style={{fontWeight:700}}>{input.superficie.toLocaleString()} m²</span>
                  <span>5.000 m²</span>
                </div>
              </div>

              {/* Zona */}
              <div>
                <label style={{display:"block",marginBottom:6,color:"#86efac",fontWeight:600,fontSize:12}}>🗺️ Zona climatica</label>
                <select value={input.zona} onChange={e=>set("zona",e.target.value)} style={sel}>
                  {Object.entries(ZONE_DATA).map(([k,v])=><option key={k} value={k}>{mobile?k:v.label}</option>)}
                </select>
              </div>

              {/* Tetto */}
              <div>
                <label style={{display:"block",marginBottom:6,color:"#86efac",fontWeight:600,fontSize:12}}>🏠 Tipo copertura</label>
                <select value={input.tetto} onChange={e=>set("tetto",e.target.value)} style={sel}>
                  {Object.keys(ROOF_COEFF).map(k=><option key={k} value={k}>{k}</option>)}
                </select>
              </div>

              {/* Autoconsumo */}
              <div style={{gridColumn:"1/-1"}}>
                <label style={{display:"block",marginBottom:6,color:"#86efac",fontWeight:600,fontSize:12}}>🔄 Autoconsumo stimato — <span style={{color:"#4ade80",fontWeight:700}}>{input.autoconsumoPerc}%</span></label>
                <input type="range" min={30} max={90} step={5} value={input.autoconsumoPerc} onChange={e=>set("autoconsumoPerc",+e.target.value)} style={{width:"100%",accentColor:"#22c55e"}}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#4ade80",marginTop:3}}>
                  <span>30% — uso serale</span><span>90% — H24</span>
                </div>
              </div>
            </div>

            <button onClick={avvia}
              style={{marginTop:22,width:"100%",padding:"15px",borderRadius:14,border:"none",background:"linear-gradient(90deg,#16a34a,#22c55e)",color:"white",fontSize:16,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 20px rgba(34,197,94,0.35)",transition:"transform .15s"}}
              onMouseEnter={e=>e.target.style.transform="scale(1.015)"}
              onMouseLeave={e=>e.target.style.transform="scale(1)"}>
              🚀 Calcola configurazione ottimale
            </button>
          </div>
        )}

        {loading&&<Spinner/>}

        {/* ── STEP 2 ── */}
        {step===2&&risultato&&!loading&&(
          <div>
            <FadeIn delay={0}>
              <div style={{textAlign:"center",marginBottom:12}}>
                <div style={{fontSize:10,color:"#86efac",textTransform:"uppercase",letterSpacing:2}}>Scheda Tecnica</div>
                <div style={{fontSize:mobile?18:22,fontWeight:700,color:"#4ade80"}}>{input.nomeCliente||"Cliente"}</div>
                <div style={{color:"#86efac",fontSize:12}}>{ZONE_DATA[input.zona].label} · {input.tetto}</div>
              </div>
            </FadeIn>

            {/* KPI grid */}
            <FadeIn delay={100}>
              <div style={{fontSize:10,color:"#86efac",textAlign:"center",marginBottom:6,opacity:.8}}>
                💡 Tocca un indicatore per l'analisi AI
              </div>
              <div style={{display:"grid",gridTemplateColumns:kpiCols,gap:mobile?8:12,marginBottom:12}}>
                {KPI_DEFS.map(k=>{
                  const isSelected=selectedKpi===k.key;
                  return(
                    <PopFlash key={k.key} color={k.color} ready={!!kpiTexts[k.key]}>
                      <div
                        style={{background:isSelected?`${k.color}18`:"rgba(255,255,255,0.05)",borderRadius:12,padding:mobile?"10px 6px":"14px 10px",textAlign:"center",border:`1px solid ${isSelected?k.color:k.color+"33"}`,cursor:kpiTexts[k.key]?"pointer":"default",transition:"transform .2s,box-shadow .2s,background .2s",boxShadow:isSelected?`0 0 16px ${k.color}44`:"none"}}
                        onMouseEnter={e=>{if(!isSelected&&kpiTexts[k.key]){e.currentTarget.style.transform="scale(1.05)";e.currentTarget.style.boxShadow=`0 6px 18px ${k.color}44`;}}}
                        onMouseLeave={e=>{if(!isSelected){e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="none";}}}
                        onClick={()=>kpiTexts[k.key]&&setSelectedKpi(prev=>prev===k.key?null:k.key)}>
                        <div style={{fontSize:mobile?18:22}}>{k.icon}</div>
                        <div style={{fontSize:mobile?9:10,color:"#86efac",marginTop:2,textTransform:"uppercase",letterSpacing:.6}}>{k.label}</div>
                        <div style={{fontSize:mobile?13:15,fontWeight:700,color:k.color,marginTop:4}}>{k.pre}{k.val}{k.post}</div>
                        <div style={{marginTop:4,height:12,display:"flex",justifyContent:"center",alignItems:"center"}}>
                          {kpiLoading[k.key]
                            ? <PulseDot color={k.color}/>
                            : kpiTexts[k.key]
                              ? <span style={{fontSize:8,color:k.color,opacity:.7}}>▼ analisi</span>
                              : null}
                        </div>
                      </div>
                    </PopFlash>
                  );
                })}
              </div>

              {/* Pannello analisi AI */}
              {selectedKpi&&(
                <div style={{background:"rgba(0,0,0,0.3)",border:`1px solid ${selDef?.color||"#22c55e"}55`,borderRadius:12,padding:"12px 14px",display:"flex",gap:12,alignItems:"flex-start",marginBottom:12}}>
                  <div style={{fontSize:20,flexShrink:0}}>{selDef?.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:10,color:selDef?.color,textTransform:"uppercase",letterSpacing:.8,marginBottom:5,fontWeight:700}}>{selDef?.label} — analisi AI</div>
                    {kpiLoading[selectedKpi]
                      ? <div style={{color:"#86efac",fontSize:12}}>⚙️ analisi in corso…</div>
                      : <FormattedText text={kpiTexts[selectedKpi]||"—"}/>}
                  </div>
                  <button onClick={()=>setSelectedKpi(null)} style={{background:"none",border:"none",color:"#86efac",fontSize:16,cursor:"pointer",flexShrink:0,padding:"0 2px"}}>✕</button>
                </div>
              )}
            </FadeIn>

            {/* Verdetto */}
            <FadeIn delay={180}>
              <div style={{background:"rgba(0,0,0,0.25)",border:`1px solid ${verdColor}44`,borderRadius:14,padding:"12px 16px",marginBottom:16}}>
                <div style={{fontSize:10,color:"#86efac",textTransform:"uppercase",letterSpacing:.8,marginBottom:8,fontWeight:700}}>🤖 Valutazione commerciale</div>
                {verdLoading
                  ? <div style={{display:"flex",alignItems:"center",gap:8,color:"#86efac",fontSize:12}}><PulseDot color="#86efac"/><span>elaborazione in corso…</span></div>
                  : verd
                    ? <div>
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:verd.nota?8:0,flexWrap:"wrap"}}>
                          <span style={{background:verdColor,color:"#0a1a0f",fontWeight:800,fontSize:11,padding:"4px 12px",borderRadius:20,whiteSpace:"nowrap"}}>{verdLabel}</span>
                          {verd.motiv&&<span style={{color:"#d1fae5",fontSize:12}}>{verd.motiv}</span>}
                        </div>
                        {verd.nota&&<div style={{borderTop:`1px solid ${verdColor}22`,paddingTop:8,marginTop:4}}><FormattedText text={verd.nota}/></div>}
                      </div>
                    : <div style={{color:"#86efac",fontSize:12}}>—</div>}
              </div>
            </FadeIn>

            {/* Grafici */}
            <FadeIn delay={260}>
              {/* Su mobile: colonna singola. Su desktop: 3:2 */}
              <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"3fr 2fr",gap:14,marginBottom:14}}>

                {/* Bar chart */}
                <div style={card}>
                  <div style={{fontWeight:700,color:"#4ade80",marginBottom:10,fontSize:12}}>📈 Produzione mensile vs Consumo (kWh)</div>
                  <ResponsiveContainer width="100%" height={mobile?160:200}>
                    <BarChart data={risultato.mensile} barCategoryGap="25%" barGap={2} margin={{top:2,right:4,left:0,bottom:0}}>
                      <XAxis dataKey="mese" tick={{fill:"#86efac",fontSize:mobile?8:10}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:"#86efac",fontSize:mobile?8:10}} axisLine={false} tickLine={false} width={mobile?36:46} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
                      <Tooltip contentStyle={{background:"#1a3a2a",border:"1px solid #22c55e",borderRadius:8,color:"#e8f5e9",fontSize:11}} formatter={(v,n)=>[`${v.toLocaleString()} kWh`,n==="produzione"?"Produzione FV":"Consumo"]}/>
                      <Bar dataKey="produzione" fill="#22c55e" radius={[2,2,0,0]} name="produzione"/>
                      <Bar dataKey="consumoMensile" fill="#facc1566" radius={[2,2,0,0]} name="consumoMensile"/>
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{display:"flex",gap:12,fontSize:10,color:"#86efac",marginTop:5,justifyContent:"center"}}>
                    <span><span style={{color:"#22c55e"}}>■</span> Produzione FV</span>
                    <span><span style={{color:"#facc15"}}>■</span> Consumo</span>
                  </div>
                </div>

                {/* Donut */}
                <div style={{...card,display:"flex",flexDirection:"column"}}>
                  <div style={{fontWeight:700,color:"#4ade80",marginBottom:6,fontSize:12}}>🔄 Ripartizione produzione</div>
                  <ResponsiveContainer width="100%" height={mobile?130:160}>
                    <PieChart>
                      <Pie data={risultato.donut} dataKey="value" cx="50%" cy="50%" innerRadius={mobile?38:48} outerRadius={mobile?58:70} paddingAngle={4} labelLine={false}>
                        {risultato.donut.map((_,i)=><Cell key={i} fill={COLORS[i]}/>)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:4}}>
                    {risultato.donut.map((d,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:11}}>
                        <span style={{display:"flex",alignItems:"center",gap:5,color:"#86efac"}}>
                          <span style={{width:8,height:8,borderRadius:2,background:COLORS[i],display:"inline-block"}}/>
                          {d.name}
                        </span>
                        <span style={{color:COLORS[i],fontWeight:700}}>{d.value.toLocaleString()} kWh</span>
                      </div>
                    ))}
                    <div style={{borderTop:"1px solid #166534",paddingTop:5,display:"flex",justifyContent:"space-between",fontSize:10,color:"#86efac"}}>
                      <span>Totale</span>
                      <span style={{color:"#4ade80",fontWeight:700}}>{risultato.produzioneAnnua.toLocaleString()} kWh</span>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Line chart */}
            <FadeIn delay={340}>
              <div style={{...card,marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:4}}>
                  <div style={{fontWeight:700,color:"#4ade80",fontSize:12}}>💶 Proiezione bolletta — 25 anni</div>
                  <div style={{fontSize:10,color:"#86efac",background:"rgba(255,255,255,0.06)",borderRadius:8,padding:"2px 8px"}}>+3%/a prudenziale</div>
                </div>
                <ResponsiveContainer width="100%" height={mobile?150:190}>
                  <LineChart data={risultato.confronto} margin={{top:4,right:12,left:0,bottom:0}}>
                    <XAxis dataKey="anno" tick={{fill:"#86efac",fontSize:mobile?9:11}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:"#86efac",fontSize:mobile?9:11}} axisLine={false} tickLine={false} width={mobile?42:52} tickFormatter={v=>`€${(v/1000).toFixed(0)}k`}/>
                    <Tooltip contentStyle={{background:"#1a3a2a",border:"1px solid #22c55e",borderRadius:8,color:"#e8f5e9",fontSize:11}} formatter={v=>[`€ ${v.toLocaleString()}`]}/>
                    <Line type="monotone" dataKey="senzaFV" stroke="#f87171" strokeWidth={2} dot={{r:3,fill:"#f87171"}} name="Senza FV"/>
                    <Line type="monotone" dataKey="conFV"   stroke="#22c55e" strokeWidth={2} dot={{r:3,fill:"#22c55e"}} name="Con FV"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </FadeIn>

            <FadeIn delay={400}>
              <div style={{background:"rgba(22,101,52,0.3)",borderRadius:10,padding:"10px 14px",border:"1px solid #166534",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,color:"#86efac",marginBottom:14}}>
                <div>📋 {new Date().toLocaleDateString("it-IT")} · Dati indicativi</div>
                <div style={{color:"#4ade80",fontWeight:600}}>☀️ Agente FV</div>
              </div>
              <button onClick={reset}
                style={{width:"100%",padding:"12px",borderRadius:12,border:"1px solid #22c55e",background:"transparent",color:"#4ade80",fontSize:13,fontWeight:600,cursor:"pointer",transition:"background .2s"}}
                onMouseEnter={e=>e.target.style.background="rgba(34,197,94,0.08)"}
                onMouseLeave={e=>e.target.style.background="transparent"}>
                ← Nuovo dimensionamento
              </button>
            </FadeIn>
          </div>
        )}
      </div>
    </div>
  );
}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     