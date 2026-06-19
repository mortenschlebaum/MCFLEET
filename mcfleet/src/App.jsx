import React, { useState, useMemo, useEffect } from "react";

// ── Supabase config ──
const SUPA_URL = "https://qiqgrafjzcijaphegffr.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpcWdyYWZqemNpamFwaGVnZmZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NTgyNjMsImV4cCI6MjA4OTEzNDI2M30.ulaNyqht-gqWwxZVKEQGGjBveA1lp4_t5gB9cvjyUH0";

// ── MotorAPI config ──
const MOTOR_KEY = "zu86wzqcqfv0esyl14i84owee3wnj49k";
const motorApi = async (reg) => {
  const url = `https://v1.motorapi.dk/vehicles/${reg.replace(/\s+/g,"")}`;
  const resp = await fetch(url, {
    headers: { "X-AUTH-TOKEN": MOTOR_KEY }
  });
  if(resp.status === 404) return null;
  if(!resp.ok) throw new Error("MotorAPI fejl: " + resp.status);
  return resp.json();
};

// Synsbasen API — henter næste syn dato korrekt
const SYNSBASEN_KEY = "sb_sk_6e0bb4e91920ce0e5ffd310b4e10e8ef";

// ── e-conomic integration ──
const ECO_APP   = "ivfNMko6pap2oaLRnHDdnODZBFsAWdzc5FrHGksdxRE";
const ECO_GRANT = "eNuTBlpklUlzhw2f3XiRPj4Z2dzbztTkOtTDkxu6A9I";
const ECO_KLADDE = 3;
const ECO_KONTO  = 2300;
const ECO_DIM = {
  "Kolding":18,"KTA Kolding":99,"Århus MC":15,"Hobro":20,
  "Herning":13,"Viborg":16,"Odense":17,"Randers":19,
  "Horsens":7,"Esbjerg":8,"Aabenraa":5,
  "MC til salg":99,"Solgte MC'er":99,"Lager / Depot":99
};

const ECO_BASE       = "https://restapi.e-conomic.com";
const ECO_CUST_GROUP = 1;   // e-conomic customer group number
const ECO_PAY_TERMS  = 1;   // e-conomic payment terms number
const ECO_VAT_ZONE   = 1;   // e-conomic VAT zone number
const ECO_MC_PRODUCT = 1210;// product number for MC sales
const ECO_LAYOUT     = 1;   // e-conomic invoice layout number

const ecoApi = async (method, path, body) => {
  const r = await fetch(ECO_BASE + path, {
    method,
    headers: {
      "X-AppSecretToken": ECO_APP,
      "X-AgreementGrantToken": ECO_GRANT,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const t = await r.text().catch(()=>"");
    console.error("e-conomic full error:", t);
    throw new Error("e-conomic " + r.status + ": " + t);
  }
  if (r.status === 204) return null;
  return r.json();
};
// Synsbasen API — returnerer fuldt dataobjekt med alle felter
const synsbasenApi = async (reg) => {
  const regNorm = reg.replace(/\s+/g, "");
  const url = `https://api.synsbasen.dk/v1/vehicles/registration/${regNorm}`;
  try {
    const resp = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${SYNSBASEN_KEY}`,
        "Content-Type": "application/json",
      }
    });
    if(resp.status === 404) return null;
    if(!resp.ok) { console.warn("Synsbasen fejl HTTP", resp.status, "for", regNorm); return null; }
    const json = await resp.json();
    return json?.data || json || null;
  } catch(e) {
    console.warn("Synsbasen fejl:", e.message);
    return null;
  }
};

// Udtræk normaliserede felter fra Synsbasen data
const synsbasenFelter = (d) => {
  if(!d) return {};
  const norm = raw => raw ? raw.split("+")[0].split("T")[0] : "";
  return {
    stel:       d.vin || "",
    foersteReg: norm(d.first_registration_date || d.first_registration || ""),
    syn:        norm(d.last_inspection_date || ""),
    naesteSyn:  d.next_inspection_date_estimate || d.next_inspection_date || "",
    beskrivelse:[d.brand?.name||d.make, d.model?.name||d.model, d.variant?.name||d.variant]
                  .filter(Boolean).join(" ").toUpperCase() || "",
  };
};

const db = async (path, opts={}) => {
  const {prefer:_p, body:_b, method:_m, ...rest} = opts;
  const url = `${SUPA_URL}/rest/v1/${path}`;
  const method = opts.method || "GET";
  const headers = {
    "apikey": SUPA_KEY,
    "Authorization": `Bearer ${SUPA_KEY}`,
    "Content-Type": "application/json",
    "Prefer": opts.prefer || "return=representation",
  };
  const res = await fetch(url, {
    method,
    headers,
    body: opts.body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status}: ${t}`);
  }
  const txt = await res.text();
  return txt ? JSON.parse(txt) : [];
};

// MC helpers: konverter snake_case DB → camelCase app og omvendt
const mcFromDb = r => ({
  id: Number(r.id), mcNr: r.mc_nr, reg: r.reg, stel: r.stel,
  gps: r.gps||"", syn: r.syn, km: r.km, location: r.location,
  beskrivelse: r.beskrivelse||"", foto: r.foto||"",
  thumb: r.thumb||"",
  fotos: Array.isArray(r.fotos) ? r.fotos : (r.foto ? [r.foto] : []),
  foersteReg: r.foerste_reg||"",
  naesteSyn: r.naeste_syn||"",
  noter: r.noter||"",
  type: r.type||"MC",
  lokationsLog: r.lokations_log||[], kmLog: r.km_log||[],
});
const mcToDb = m => {
  const obj = {
    id: m.id, mc_nr: m.mcNr||0, reg: m.reg||"", stel: m.stel||"",
    gps: m.gps||"", syn: m.syn||"", km: m.km||0, location: m.location||"",
    beskrivelse: m.beskrivelse||"", foto: m.foto||"",
    fotos: m.fotos||[],
    thumb: m.thumb||"",
    noter: m.noter||"",
    type: m.type||"MC",
    lokations_log: m.lokationsLog||[], km_log: m.kmLog||[],
  };
  if(m.foersteReg !== undefined) obj.foerste_reg = m.foersteReg||"";
  if(m.naesteSyn !== undefined) obj.naeste_syn = m.naesteSyn||"";
  return obj;
};

const fakFromDb = r => ({
  id: r.id, mcId: r.mc_id, mcReg: r.mc_reg, dato: r.dato,
  note: r.note||"", titel: r.titel||"", linjer: r.linjer||[], total: r.total||0, km: r.km||0,
  afdeling: r.afdeling||"", faktureret: r.faktureret||false,
});
const fakToDb = f => ({
  id: f.id, mc_id: f.mcId, mc_reg: f.mcReg||"", dato: f.dato,
  note: f.note||"", titel: f.titel||"", linjer: f.linjer||[], total: f.total||0, km: f.km||0,
  afdeling: f.afdeling||"", faktureret: f.faktureret||false,
});

const lokFromDb = r => ({id: r.id, navn: r.navn||"", transport: r.transport||0, dimension: r.dimension||""});
const lokToDb = l => ({navn: l.navn||"", transport: l.transport||0, dimension: l.dimension||""});

const ydFromDb = r => ({id: r.id, nr: r.nr||"", navn: r.navn||"", pris: r.pris||0});
const ydToDb = y => ({id: y.id, nr: y.nr||"", navn: y.navn||"", pris: y.pris||0});

const opgFromDb = r => ({
  id: r.id, titel: r.titel||"", beskrivelse: r.beskrivelse||"",
  lokation: r.lokation||"", senestUdfoert: r.senest_udfoert||"",
  oprettet: r.oprettet||"", udfoert: r.udfoert||false, udfoertDato: r.udfoert_dato||"",
  mcId: r.mc_id||null, mcReg: r.mc_reg||"", foto: r.foto||"",
});
const opgToDb = o => ({
  id: o.id, titel: o.titel||"", beskrivelse: o.beskrivelse||"",
  lokation: o.lokation||"", senest_udfoert: o.senestUdfoert||"",
  oprettet: o.oprettet||"", udfoert: o.udfoert||false, udfoert_dato: o.udfoertDato||"",
  mc_id: o.mcId||null, mc_reg: o.mcReg||"", foto: o.foto||"",
});

const brugerFromDb = r => ({id: r.id, brugernavn: r.brugernavn, adgangskode: r.adgangskode, navn: r.navn||"", rolle: r.rolle||"bruger"});
const brugerToDb = b => ({id: b.id, brugernavn: b.brugernavn, adgangskode: b.adgangskode||"", navn: b.navn||"", rolle: b.rolle||"bruger"});

const LOCATIONS = ["Kolding","KTA Kolding","Århus MC","Hobro","Herning","Viborg","Randers","Horsens","Odense","Lager / Depot","Esbjerg","Aabenraa","MC til salg","Solgte MC'er"];

// Lokationer der betragtes som "solgte" — tæller ikke med i statistik
const SOLGTE_LOKATIONER = ["Solgte MC'er", "MC til salg"];
const erSolgt = mc => SOLGTE_LOKATIONER.includes(mc.location);

// Transport-takster per afdeling (0 = ingen transport)
const TRANSPORT_TAKSTER = {
  "Kolding": 0, "KTA Kolding": 0, "Esbjerg": 530, "Odense": 553,
  "Horsens": 493, "Randers": 977, "Viborg": 925, "Herning": 788,
  "Århus MC": 908, "Hobro": 1175, "Aabenraa": 700, "MC til salg": 0,
  "Lager / Depot": 0, "Solgte MC'er": 0,
};
const today = new Date();
const todayStr = today.toISOString().split("T")[0];
const addDays = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x.toISOString().split("T")[0]; };
const fmtDato = d => {
  if(!d) return "";
  // Fjern timezone-suffix hvis tilstede: "2020-12-15+01:00" → "2020-12-15"
  const clean = d.split("+")[0].split("T")[0];
  const parts = clean.split("-");
  if(parts.length !== 3) return d;
  const [y,m,day] = parts;
  return `${day}-${m}-${y}`;
};
// Normaliser dato til YYYY-MM-DD format (til input type=date)
const normDato = d => {
  if(!d) return "";
  return d.split("+")[0].split("T")[0];
};
const fmt = n => Number(n).toLocaleString("da-DK",{minimumFractionDigits:2,maximumFractionDigits:2});

// Læs billede fra fil, ret EXIF-rotation og komprimer — returnerer korrekt orienteret dataUrl via callback
const fixOgKomprimer = (file, callback, maxPx=1200, kvalitet=0.82) => {
  const reader = new FileReader();
  reader.onload = ev => {
    const blob = ev.target.result;
    // Læs EXIF orientation manuelt fra JPEG header
    const getOrientation = (arrayBuffer) => {
      const view = new DataView(arrayBuffer);
      if(view.getUint16(0,false) !== 0xFFD8) return 1; // ikke JPEG
      let offset = 2;
      while(offset < view.byteLength) {
        const marker = view.getUint16(offset,false);
        offset += 2;
        if(marker === 0xFFE1) {
          if(view.getUint32(offset+2,false) !== 0x45786966) return 1; // ikke EXIF
          const little = view.getUint16(offset+8,false) === 0x4949;
          const ifdOffset = view.getUint32(offset+14,little);
          const entries = view.getUint16(offset+8+ifdOffset,little);
          for(let i=0;i<entries;i++){
            if(view.getUint16(offset+8+ifdOffset+2+i*12,little) === 0x0112)
              return view.getUint16(offset+8+ifdOffset+2+i*12+8,little);
          }
          return 1;
        }
        if((marker & 0xFF00) !== 0xFF00) break;
        offset += view.getUint16(offset,false);
      }
      return 1;
    };
    // Konverter til ArrayBuffer for EXIF-læsning
    const arr = new Uint8Array(blob);
    const orientation = getOrientation(arr.buffer);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      const swap = orientation >= 5; // 5-8 = 90/270 grader rotation
      const W = swap ? img.height : img.width;
      const H = swap ? img.width : img.height;
      const ratio = Math.min(maxPx/W, maxPx/H, 1);
      c.width = Math.round(W*ratio);
      c.height = Math.round(H*ratio);
      const ctx = c.getContext("2d");
      ctx.save();
      // Anvend korrekt rotation baseret på EXIF orientation
      switch(orientation){
        case 2: ctx.transform(-1,0,0,1,c.width,0); break;
        case 3: ctx.transform(-1,0,0,-1,c.width,c.height); break;
        case 4: ctx.transform(1,0,0,-1,0,c.height); break;
        case 5: ctx.transform(0,1,1,0,0,0); break;
        case 6: ctx.transform(0,1,-1,0,c.height,0); break;
        case 7: ctx.transform(0,-1,-1,0,c.height,c.width); break;
        case 8: ctx.transform(0,-1,1,0,0,c.width); break;
        default: break;
      }
      ctx.drawImage(img, 0, 0, img.width*ratio, img.height*ratio);
      ctx.restore();
      callback(c.toDataURL("image/jpeg", kvalitet));
    };
    img.src = URL.createObjectURL(new Blob([blob]));
  };
  reader.readAsArrayBuffer(file);
};

// Generér et lille thumbnail (til oversigtskort) ud fra en billede-dataURL.
// Returnerer en lille base64 JPEG (~2-6 KB) — eller "" hvis input mangler/fejler.
const lavThumb = (dataUrl, maxPx=160, kvalitet=0.55) => new Promise(resolve => {
  if(!dataUrl) return resolve("");
  const img = new Image();
  img.onload = () => {
    try {
      const c = document.createElement("canvas");
      const ratio = Math.min(maxPx/img.width, maxPx/img.height, 1);
      c.width = Math.round(img.width*ratio);
      c.height = Math.round(img.height*ratio);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", kvalitet));
    } catch(e) { resolve(""); }
  };
  img.onerror = () => resolve("");
  img.src = dataUrl;
});

// ── PDF GENERATOR ──────────────────────────────────────────────────────────────
const genPDF = (faktura) => {
  const loadJsPDF = () => new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(window.jspdf.jsPDF); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => resolve(window.jspdf.jsPDF);
    s.onerror = reject;
    document.head.appendChild(s);
  });

  loadJsPDF().then(JsPDF => {
    const doc = new JsPDF({orientation:"portrait",unit:"mm",format:"a4"});
    const W = 210, M = 18, CW = W - M*2;
    let y = 20;

    const line = (x1,y1,x2,y2,r=180,g=180,b=180) => {
      doc.setDrawColor(r,g,b); doc.line(x1,y1,x2,y2);
    };
    const txt = (t,x,yy,size=10,bold=false,color=[40,40,40]) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", bold?"bold":"normal");
      doc.setTextColor(...color);
      doc.text(String(t||""), x, yy);
    };
    const fmtKr = n => Number(n).toLocaleString("da-DK",{minimumFractionDigits:2,maximumFractionDigits:2})+" kr";
    const fmtD = d => { if(!d) return ""; const [y,m,day]=d.split("-"); return `${day}-${m}-${y}`; };

    // ── HEADER: firmaoplysninger ──
    doc.setFillColor(180,0,0);
    doc.rect(0,0,W,28,"F");
    txt("Lisbeths Køreskole ApS", M, 11, 16, true, [255,255,255]);
    txt("Vranderupvej 15, 6000 Kolding", M, 18, 9, false, [255,220,220]);
    txt("CVR: 36039175  ·  Info@lisbeth.dk", M, 24, 9, false, [255,220,220]);

    y = 40;

    // ── FAKTURA TITEL ──
    txt("FAKTURA", M, y, 22, true, [180,0,0]);
    y += 10;
    line(M, y, W-M, y, 220,0,0);
    y += 8;

    // ── FAKTURA INFO BOKS ──
    doc.setFillColor(245,245,245);
    doc.roundedRect(M, y, CW, 28, 2, 2, "F");
    const col2 = M + CW/2;
    txt("Faktura nr:", M+4, y+8, 9, true, [100,100,100]);
    txt(faktura.id, M+35, y+8, 10, true, [180,0,0]);
    txt("Dato:", col2, y+8, 9, true, [100,100,100]);
    txt(fmtD(faktura.dato), col2+20, y+8, 10, false, [40,40,40]);
    txt("MC:", M+4, y+17, 9, true, [100,100,100]);
    txt(faktura.mcReg||"-", M+35, y+17, 10, false, [40,40,40]);
    txt("Afdeling:", col2, y+17, 9, true, [100,100,100]);
    const mc_loc = faktura.afdeling||faktura.mcLokation||"-";
    txt(mc_loc, col2+28, y+17, 10, false, [40,40,40]);
    if(faktura.titel){
      txt("Titel:", M+4, y+25, 9, true, [100,100,100]);
      txt(faktura.titel, M+35, y+25, 10, false, [40,40,40]);
    }
    y += 36;

    // Beskrivelse/note
    if(faktura.note){
      doc.setFillColor(255,245,245);
      doc.roundedRect(M, y, CW, 12, 2, 2, "F");
      txt(faktura.note, M+4, y+8, 9, false, [100,40,40]);
      y += 18;
    }

    // ── LINJE TABEL HEADER ──
    const colAntal = M + CW*0.60;
    const colPris  = M + CW*0.72;
    const colTotal = W - M - 2;
    doc.setFillColor(40,40,40);
    doc.rect(M, y, CW, 9, "F");
    doc.setFontSize(9); doc.setFont("helvetica","bold"); doc.setTextColor(255,255,255);
    doc.text("Beskrivelse", M+3, y+6.5);
    doc.text("Antal", colAntal+6, y+6.5, {align:"center"});
    doc.text("Stk. pris", colPris+16, y+6.5, {align:"right"});
    doc.text("Total", colTotal, y+6.5, {align:"right"});
    y += 9;

    // ── LINJER ──
    let subtotal = 0;
    faktura.linjer.forEach((l, i) => {
      const rowH = 8;
      if(i%2===1){ doc.setFillColor(248,248,248); doc.rect(M,y,CW,rowH,"F"); }
      const lineTotal = l.antal * l.pris;
      subtotal += lineTotal;
      // Beskrivelse venstre
      doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(40,40,40);
      doc.text(String(l.navn||"-"), M+3, y+5.5);
      // Antal centreret
      doc.text(String(l.antal), colAntal+6, y+5.5, {align:"center"});
      // Stk pris højrejusteret
      doc.text(fmtKr(l.pris), colPris+16, y+5.5, {align:"right"});
      // Total højrejusteret
      doc.setFont("helvetica","bold");
      doc.text(fmtKr(lineTotal), colTotal, y+5.5, {align:"right"});
      y += rowH;
      if(y > 250){ doc.addPage(); y = 20; }
    });

    y += 4;
    line(M, y, W-M, y, 200,200,200);
    y += 8;

    // ── SUMMERING ──
    const moms = subtotal * 0.25;
    const totalInklMoms = subtotal + moms;
    const sumX = M + CW*0.58;
    const valX = W - M;

    doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(80,80,80);
    doc.text("Subtotal (ekskl. moms):", sumX, y);
    doc.setTextColor(40,40,40);
    doc.text(fmtKr(subtotal), W-M-2, y, {align:"right"});
    y += 7;
    doc.setTextColor(80,80,80);
    doc.text("Moms (25%):", sumX, y);
    doc.setTextColor(40,40,40);
    doc.text(fmtKr(moms), W-M-2, y, {align:"right"});
    y += 3;
    line(sumX, y, W-M, y, 180,180,180);
    y += 7;

    // Total boks
    doc.setFillColor(30,30,30);
    doc.rect(M, y, CW, 14, "F");
    doc.setFontSize(11); doc.setFont("helvetica","bold"); doc.setTextColor(255,255,255);
    doc.text("TOTAL", M+4, y+9);
    doc.setFontSize(12); doc.setTextColor(100,220,100);
    doc.text(fmtKr(totalInklMoms), W-M-2, y+9, {align:"right"});
    doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(180,180,180);
    doc.text("(inkl. moms)", W-M-2, y+13, {align:"right"});

    y += 20;

    // ── FOOTER ──
    line(M, 280, W-M, 280, 200,200,200);
    doc.setFontSize(8); doc.setTextColor(150,150,150); doc.setFont("helvetica","normal");
    doc.text("Lisbeths Køreskole ApS  ·  CVR: 36039175  ·  Vranderupvej 15, 6000 Kolding  ·  Info@lisbeth.dk", W/2, 285, {align:"center"});
    doc.text(`Faktura ${faktura.id} genereret ${fmtD(new Date().toISOString().split("T")[0])}`, W/2, 290, {align:"center"});

    doc.save(`${faktura.id}_${faktura.mcReg||"mc"}.pdf`);
  }).catch(e => alert("PDF fejl: "+e.message));
};

const genSlutseddel = (mc, køber) => {
  const loadJsPDF = () => new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(window.jspdf.jsPDF); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => resolve(window.jspdf.jsPDF);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  const _filename = `slutseddel_${mc.reg||"mc"}.pdf`;

  // Konverter tal til danske ord
  const talTilTekst = (n) => {
    try { n = Math.round(Number(String(n).replace(/\./g,"").replace(",","."))); } catch(e){ return String(n); }
    if(isNaN(n)||n===0) return "nul";
    const ones=["","en","to","tre","fire","fem","seks","syv","otte","ni","ti","elleve","tolv","tretten","fjorten","femten","seksten","sytten","atten","nitten"];
    const tens=["","","tyve","tredive","fyrre","halvtreds","tres","halvfjerds","firs","halvfems"];
    const u1000 = n => {
      if(n===0) return "";
      if(n<20) return ones[n];
      if(n<100){ const t=tens[Math.floor(n/10)],o=ones[n%10]; return o?(o+"og"+t):t; }
      const h=ones[Math.floor(n/100)]+"hundrede", r=u1000(n%100);
      return h+(r?("og"+r):"");
    };
    if(n<1000) return u1000(n);
    if(n<1000000){ const t=Math.floor(n/1000),r=n%1000; return (t===1?"et":u1000(t))+"tusinde"+(r?(r<100?"og":"")+u1000(r):""); }
    const m=Math.floor(n/1000000),r=n%1000000;
    return (m===1?"en":u1000(m))+"million"+(m>1?"er":"")+(r?talTilTekst(r):"");
  };

  return loadJsPDF().then(JsPDF => {
    const doc = new JsPDF({orientation:"portrait", unit:"mm", format:"a4"});
    const W=210, H=297, M=14, CW=W-M*2;
    const col2 = M + CW/2 + 3;
    const halfW = CW/2 - 4;

    const fmtD = d => { if(!d) return ""; const p=d.split("-"); return p.length===3?`${p[2]}-${p[1]}-${p[0]}`:d; };

    // Helpers
    const txt = (t, x, y, size=9, bold=false, color=[30,30,30]) => {
      doc.setFontSize(size);
      doc.setFont("helvetica", bold?"bold":"normal");
      doc.setTextColor(...color);
      doc.text(String(t||""), x, y);
    };
    const ln = (x1,y1,x2,y2,gray=170) => {
      doc.setDrawColor(gray,gray,gray); doc.setLineWidth(0.25); doc.line(x1,y1,x2,y2);
    };
    const uLine = (x,y,w) => ln(x,y,x+w,y,160);
    const box = (x,y,checked=false,size=3.5) => {
      doc.setDrawColor(80,80,80); doc.setLineWidth(0.3);
      doc.rect(x,y-size+0.5,size,size);
      if(checked){ doc.setFontSize(8);doc.setFont("helvetica","bold");doc.setTextColor(0,0,0);doc.text("X",x+0.5,y-0.3); }
    };
    const sektionHoved = (label,y) => {
      doc.setFillColor(220,220,220);
      doc.rect(M,y,CW,6.5,"F");
      txt(label,M+2,y+4.8,10,true,[20,20,20]);
      return y+6.5;
    };

    // Felt-hjælper: label øverst, value + linje under
    const felt = (label,val,x,y,w) => {
      txt(label,x,y,7,false,[110,110,110]);
      if(val) txt(val,x,y+5,9,false,[20,20,20]);
      uLine(x,y+6,w);
    };

    // ── HEADER ──
    doc.setFillColor(210,0,0);
    doc.rect(0,0,W,20,"F");
    txt("Slutseddel",M,9,17,true,[255,255,255]);
    txt("Handel med brugt motorcykel",M,15.5,9,false,[255,200,200]);


    let y = 25;

    // ── SÆLGER / KØBER ──
    txt("Sælger",M,y,10,true,[20,20,20]);
    txt("Køber",col2,y,10,true,[20,20,20]);
    y += 3;

    const sælger = ["Lisbeths Køreskole ApS","Vranderupvej 15","6000 Kolding","29414249",""];
    const køberArr = [køber.navn||"",køber.adresse||"",køber.postby||"",køber.telefon||"",køber.email||""];
    const feltLabels = ["Navn","Adresse","Postnr./by","Telefon","Email"];

    feltLabels.forEach((label,i) => {
      const fy = y + i*13;
      felt(label, sælger[i], M, fy, halfW);
      felt(label, køberArr[i], col2, fy, halfW);
    });
    y += 69;

    // CPR nr. kun på køber-siden
    felt("CPR nr.", køber.cpr||"", col2, y, halfW);
    y += 13;

    ln(M,y,W-M,y);
    y += 4;

    // ── MOTORCYKLEN ──
    y = sektionHoved("Motorcyklen",y);
    y += 5;

    // Række 1: Mærke/model (to linjer hvis lang) + Sidst syn + Stel
    // Split mærke/model so det ikke løber ind i Sidst syn
    const mcBeskr = mc.beskrivelse||"";
    const mcBeskrSplit = doc.splitTextToSize(mcBeskr, 55);
    txt("Mærke/model/type", M, y, 7, false, [110,110,110]);
    doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(20,20,20);
    doc.text(mcBeskrSplit, M, y+5);
    uLine(M, y+6+(mcBeskrSplit.length-1)*4, 58);
    felt("Sidst syn?", fmtD(mc.syn)||"", M+62, y, 28);
    felt("Stelnr.", mc.stel||"", col2+12, y, W-M-col2-12);
    y += mcBeskrSplit.length > 1 ? 17 : 13;

    // Række 2: 1.reg + Reg.nr + Med sidevogn
    felt("1. gang indregistreret", fmtD(mc.foersteReg)||"", M, y, 45);
    felt("Reg.nr.", mc.reg||"", M+48, y, 38);
    // Med sidevogn — pre-udfyldt Nej
    txt("Med sidevogn", col2+10, y, 7.5, false, [80,80,80]);
    box(col2+10, y+5, true); txt("Nej",col2+15,y+5,8);
    box(col2+26, y+5, false); txt("Ja, hvilken",col2+31,y+5,8);
    uLine(col2+50, y+6, 20);
    y += 13;

    // Række 3: Kørte km + Over 100.000
    const kmVis = køber.km ? Number(køber.km).toLocaleString("da-DK")+" km" : (mc.km?mc.km.toLocaleString("da-DK")+" km":"");
    felt("Kørte km", kmVis, M, y, 45);
    txt("Kørt over 100.000 km", col2, y, 7.5, false, [80,80,80]);
    // Pre-udfyldt Nej
    box(col2, y+5, false); txt("Ja",col2+5,y+5,8);
    box(col2+16, y+5, true); txt("Nej",col2+21,y+5,8);
    txt("Hvis ja, angiv km kørt i alt",col2+32,y+5,7.5,false,[110,110,110]);
    uLine(col2+79,y+6,W-M-col2-79);
    y += 14;

    ln(M,y,W-M,y); y+=4;

    // ── BETALING ──
    y = sektionHoved("Betaling",y);
    y += 5;

    const prisNum = Number(String(køber.pris||"0").replace(/[^0-9]/g,""));
    const prisKr = prisNum ? prisNum.toLocaleString("da-DK")+" kr." : "";
    const prisTekst = prisNum ? talTilTekst(prisNum)+" kroner" : "";

    felt("Købesum kr. (beløb i kroner)", prisKr, M, y, halfW);
    felt("Overtagelsesdag – dag/måned/år", "", col2, y, halfW);
    y += 13;

    // Købesum med bogstaver — pre-udfyldt
    felt("Købesum kr. (beløb med bogstaver)", prisTekst, M, y, halfW);
    // Restgæld — pre-udfyldt Nej
    txt("Evt. restgæld/andre hæftelser", col2, y, 7.5, false, [80,80,80]);
    box(col2, y+5, false); txt("Ja",col2+5,y+5,8);
    box(col2+16, y+5, true); txt("Nej",col2+21,y+5,8);
    txt("Hvis ja, til",col2+30,y+5,7.5,false,[110,110,110]);
    uLine(col2+52,y+6,halfW-52);
    y += 13;

    // Betaling — pre-udfyldt Bankoverførsel
    txt("Betaling",M,y,7.5,false,[80,80,80]);
    txt("Aktuel gæld kr. (beløb i kroner)",col2,y,7.5,false,[80,80,80]);
    y += 5;
    box(M,y,false); txt("Kontant betaling",M+5,y,8);
    box(M+38,y,true); txt("Bankoverførsel",M+43,y,8);
    uLine(col2,y+1,halfW);
    y += 11;

    ln(M,y,W-M,y); y+=4;

    // ── SÆLGER OPLYSER ──
    y = sektionHoved("Sælger oplyser",y);
    y += 5;

    // Svar-map: nøgle → "ja"|"nej"|"vednot"
    const svar = {
      "1)": køber.s1||"nej", "2)": køber.s2||"nej", "3)": køber.s3||"nej",
      "4)": køber.s4||"nej", "5)": køber.s5||"skolekørsel",
      "6)": køber.s6||"nej", "6b)": køber.s6b||"nej", "7)": køber.s7||"nej",
      "8)": køber.s8||"nej", "9)": køber.s9||"nej",
    };

    const sRækker = [
      {nr:"1)", l:"Er motoren udskiftet",                       h:"Hvis ja, med _____________  Kørte km efter udskiftning _______"},
      {nr:"2)", l:"Fortsat fabriksgaranti",                     h:"Hvis ja, angiv udløbsdato og \u2013\u00e5r _______________________"},
      {nr:"3)", l:"Dok. for serviceeftersyn hos aut. forhandler",h:"Servicehæfte udleveret | Ja/Nej"},
      {nr:"4)", l:"Dok. for regelmæssig eftersyn på værksted",    h:"Instruktionsbog udleveret | Ja/Nej"},
      {nr:"5)", l:"Tidligere anvendelse", h:"ANVENDELSE"},
      {nr:"6)", l:"Har motorcyklen v\u00e6ret skadet",               h:"Hvis ja, omfanget oplyses ____________________________"},
      {nr:"6b)",l:"St\u00f8rre reparationer",                        h:"Hvis ja, omfanget oplyses ____________________________"},
      {nr:"7)", l:"Er motorcyklen helt/delvis omlakeret",       h:"Hvis ja, hvornår ____________________________________"},
      {nr:"8)", l:"Har motorcyklen k\u00f8rt om vinteren",           h:""},
      {nr:"9)", l:"Dok. for vinteropbevaring hos forhandler?",  h:"Hvis ja, dok. for olieskift m.m. | Ja/Nej"},
    ];

    sRækker.forEach(r => {
      if(y>255){doc.addPage();y=15;}
      txt(r.nr,M,y,8,true,[30,30,30]);
      txt(r.l,M+8,y,8,false,[30,30,30]);
      y+=4;
      const sv = svar[r.nr];
      box(M+4, y, sv==="ja");   txt("Ja",M+9,y,7.5);
      box(M+19, y, sv==="nej"); txt("Nej",M+24,y,7.5);
      box(M+34, y, sv==="vednot"); txt("Ved ikke",M+39,y,7.5);
      if(r.h==="ANVENDELSE"){
        const anv = køber.s5||"skolekørsel";
        box(col2,y,anv==="privat"); txt("Privat",col2+5,y,7.5);
        box(col2+24,y,anv==="motorsport"); txt("Motorsport",col2+29,y,7.5);
        box(col2+55,y,anv==="skolekørsel"); txt("Skolekørsel",col2+60,y,7.5);
      } else if(r.h&&r.h.endsWith("| Ja/Nej")){
        const label=r.h.replace(" | Ja/Nej","");
        txt(label,col2,y,7.5,false,[50,50,50]);
        box(col2+label.length*1.8+2,y,false); txt("Ja",col2+label.length*1.8+7,y,7.5);
        box(col2+label.length*1.8+16,y,false); txt("Nej",col2+label.length*1.8+21,y,7.5);
      } else if(r.h){
        const clean=r.h.replace(/□/g,"").replace(/\s+/g," ").trim();
        const split=doc.splitTextToSize(clean,CW/2-5);
        doc.setFontSize(7.5);doc.setFont("helvetica","normal");doc.setTextColor(50,50,50);
        doc.text(split,col2,y);
      }
      y+=7;
    });

    ln(M,y,W-M,y); y+=4;

    // ── PRØVEKØRSEL ──
    if(y>255){doc.addPage();y=15;}
    y = sektionHoved("Prøvekørsel",y);
    y+=5;
    txt("Motorcyklen er prøvekørt af køber",M,y,8);
    y+=4;
    box(M,y,køber.proevekørt==="ja"); txt("Ja",M+5,y,8);
    box(M+16,y,køber.proevekørt==="nej"); txt("Nej",M+21,y,8);
    y+=10;

    // ── OMREGISTRERING ──
    if(y>240){doc.addPage();y=15;}
    y = sektionHoved("Omregistrering/afmelding",y);
    y+=5;
    const omreg1="Motorcyklen skal – for købers regning – synes og godkendes inden omregistrering";
    const omreg1s=doc.splitTextToSize(omreg1,halfW);
    doc.setFontSize(8);doc.setFont("helvetica","normal");doc.setTextColor(50,50,50);
    doc.text(omreg1s,M,y);
    const omreg2="Sælger omregistrerer motorcyklen når betalingen er registeret i købers bank.";
    const omreg2s=doc.splitTextToSize(omreg2,halfW);
    doc.text(omreg2s,col2,y);
    y+=omreg1s.length*3.5+3;
    // Motorcyklen skal synes — præ-udfyldt Nej
    box(M,y,false); txt("Ja",M+5,y,8);
    box(M+16,y,true); txt("Nej",M+21,y,8);
    box(col2,y,true); txt("Ja",col2+5,y,8);
    y+=8;
    txt("Synsrapport udleveret til køber",M,y,7.5,false,[80,80,80]);
    txt("Evt. rapportnr.:",M+55,y,7.5,false,[80,80,80]);
    uLine(M+78,y+1,30);
    y+=4;
    // Synsrapport — præ-udfyldt Nej
    box(M,y,false); txt("Ja",M+5,y,8);
    box(M+16,y,true); txt("Nej",M+21,y,8);
    txt("Køber omregistrerer/afmelder inden 4 dage",col2,y,7.5,false,[50,50,50]);
    y+=7;
    const synNote="MC under 5 år kan ejerskiftes uden syn. Er MC mere end 5 år, kræves syn ved ejerskifte, hvis det er mere end 2 år siden MC sidst har været synet.";
    const synNotes=doc.splitTextToSize(synNote,halfW);
    doc.setFontSize(7);doc.setFont("helvetica","normal");doc.setTextColor(100,100,100);
    doc.text(synNotes,col2,y);
    y+=synNotes.length*2.8+4;

    // Ved omregistrering tegnes der Kasko/Ansvar i Selskab
    txt("Ved omregistrering tegnes der",M,y,7.5,false,[50,50,50]);
    y+=5;
    box(M,y,køber.køberOmregForsikring==="kasko"); txt("Kasko",M+5,y,8);
    box(M+22,y,køber.køberOmregForsikring==="ansvar"); txt("Ansvar",M+27,y,8);
    txt("i Selskab:",M+47,y,7.5,false,[80,80,80]);
    if(køber.køberOmregSelskab) txt(String(køber.køberOmregSelskab),M+68,y,8,false,[20,20,20]);
    uLine(M+68,y+1,40);
    y+=8;

    ln(M,y,W-M,y); y+=4;

    // ── FORSIKRING ──
    if(y>240){doc.addPage();y=15;}
    y = sektionHoved("Forsikring",y);
    y+=5;
    const ftxt="Køber sørger selv for at tegne forsikring. Sælgers forsikring dækker køber indtil 4 dage efter ejerskiftet. Sælger oplyser, at motorcyklens nuværende forsikring omfatter";
    const ftxts=doc.splitTextToSize(ftxt,halfW);
    doc.setFontSize(8);doc.setFont("helvetica","normal");doc.setTextColor(50,50,50);
    doc.text(ftxts,M,y);
    y+=ftxts.length*3.5+2;
    box(M,y,!!køber.forsForsikrAnsvar); txt("Ansvar",M+5,y,8);
    box(M+20,y,!!køber.forsForsikrKasko); txt("Kasko",M+25,y,8);
    txt("Tegnet i",col2,y-6,7.5,false,[80,80,80]);
    if(køber.forsTegnetI) txt(String(køber.forsTegnetI),col2+18,y-6,8,false,[20,20,20]);
    uLine(col2+18,y-5,35);
    txt("Under policenr.",col2,y,7.5,false,[80,80,80]);
    if(køber.forsPolicenr) txt(String(køber.forsPolicenr),col2+30,y,8,false,[20,20,20]);
    uLine(col2+30,y+1,25);
    y+=10;

    ln(M,y,W-M,y); y+=4;

    // ── SÆRLIGE AFTALER ──
    if(y>230){doc.addPage();y=15;}
    y = sektionHoved("Særlige aftaler",y);
    y+=5;
    txt("Motorcyklen sælges som prøvet og beset uden reklamationsret",M,y,8);
    y+=4;
    // Pre-udfyldt Nej
    box(M,y,false); txt("Ja",M+5,y,8);
    box(M+16,y,true); txt("Nej",M+21,y,8);
    y+=6;
    // Garanti linje
    txt("Sælger yder nedenstående antal mdr. garanti:",M,y,8);
    txt("6",M+72,y,9,true,[20,20,20]);
    txt("måneder",M+78,y,8);
    uLine(M+68,y+1,8);
    y+=6;
    // 6 mdr garanti + 18 mdr reklamationsret
    txt("Andet: Sælger yder 6 måneders garanti + 18 måneders reklamationsret",M,y,8,false,[20,20,20]);
    uLine(M,y+1,CW);
    y+=10;

    ln(M,y,W-M,y); y+=4;

    // ── HANDLEN INDGÅET (altid ny side) ──
    doc.addPage(); y=15;
    const sigPageNum = doc.internal.getNumberOfPages();
    y = sektionHoved("Handlen indgået",y);
    y+=5;
    txt("Sted/dato/år (sælger)",M,y,7.5,false,[80,80,80]);
    txt("Sted/dato/år (køber)",col2,y,7.5,false,[80,80,80]);
    y+=14;
    uLine(M,y,halfW); uLine(col2,y,halfW);
    y+=5;
    txt("Sælgers underskrift",M,y,7.5,false,[80,80,80]);
    txt("Købers underskrift",col2,y,7.5,false,[80,80,80]);
    y+=12;
    uLine(M,y,halfW); uLine(col2,y,halfW);
    y+=10;

    // ── FOOTER ──
    doc.setFontSize(7);doc.setTextColor(160,160,160);doc.setFont("helvetica","normal");
    doc.text("Lisbeths Køreskole ApS  ·  Vranderupvej 15, 6000 Kolding  ·  Tlf. 29414249",W/2,H-4,{align:"center"});

    const totalPages = sigPageNum;
    const base64 = doc.output('datauristring').split(',')[1];
    doc.save(_filename);
    return { base64, filename: _filename, totalPages };
  }).catch(e => { alert("PDF fejl: "+e.message); return null; });
};


const MC_SVG = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 120' fill='none'><rect width='200' height='120' fill='%23111'/><ellipse cx='48' cy='88' rx='22' ry='22' stroke='%23555' stroke-width='5'/><ellipse cx='48' cy='88' rx='12' ry='12' fill='%23333' stroke='%23666' stroke-width='3'/><ellipse cx='152' cy='88' rx='22' ry='22' stroke='%23555' stroke-width='5'/><ellipse cx='152' cy='88' rx='12' ry='12' fill='%23333' stroke='%23666' stroke-width='3'/><path d='M48 88 L80 55 L120 50 L145 65 L152 88' stroke='%23c00' stroke-width='4' fill='none'/><path d='M80 55 L90 35 L130 38 L120 50' fill='%23222' stroke='%23555' stroke-width='2'/><path d='M120 50 L145 45 L155 65 L145 65' fill='%23333' stroke='%23555' stroke-width='2'/><path d='M68 75 L48 88' stroke='%23777' stroke-width='3'/><circle cx='90' cy='48' r='6' fill='%23c00'/></svg>`;

const INIT_MC = [
  {id:1,mcNr:102,reg:"DD 70 407",stel:"MLHPC63A2M5101639",gps:"",syn:"2026-12-14",km:17703,location:"Kolding",beskrivelse:"HONDA CB 500 FA GUL",lokationsLog:[{lokation:"Kolding",fra:"2024-12-14",til:null}]},
  {id:2,mcNr:20,reg:"AX 59 119",stel:"VBKJGA40XEC033320",gps:"",syn:"2026-09-29",km:23470,location:"Kolding",beskrivelse:"KTM 125 DUKE",lokationsLog:[{lokation:"Kolding",fra:"2025-11-11",til:null}]},
  {id:3,mcNr:33,reg:"DM 94 444",stel:"MLHPC56AN5301147",gps:"",syn:"2026-04-16",km:9724,location:"Kolding",beskrivelse:"HONDA 500 RABEL SORT",lokationsLog:[{lokation:"Kolding",fra:"2025-09-24",til:null}]},
  {id:4,mcNr:96,reg:"DM 94 443",stel:"MLHPC56A4N5302773",gps:"",syn:"2026-06-24",km:7714,location:"Kolding",beskrivelse:"HONDA 500 RABET GRØN",lokationsLog:[{lokation:"Kolding",fra:"2025-06-22",til:null}]},
  {id:5,mcNr:104,reg:"DD 70 404",stel:"MLHPC63A4K5009252",gps:"",syn:"2026-08-12",km:15562,location:"Kolding",beskrivelse:"HONDA CB 500 FA SORT",lokationsLog:[{lokation:"Kolding",fra:"2025-01-22",til:null}]},
  {id:6,mcNr:1,reg:"DZ 45 116",stel:"MLHJC92AXP5201601",gps:"",syn:"2026-07-14",km:0,location:"Kolding",beskrivelse:"HONDA MSX 125 A",lokationsLog:[{lokation:"Kolding",fra:"2025-11-27",til:null}]},
  {id:7,mcNr:12,reg:"DZ 46 431",stel:"MLHRH02A2M5106560",gps:"",syn:"2027-01-17",km:12884,location:"Kolding",beskrivelse:"HONDA CB 650 R RØDMETAL",lokationsLog:[{lokation:"Kolding",fra:"2025-08-17",til:null}]},
  {id:8,mcNr:15,reg:"ED 83 962",stel:"JH2RH12A4PK016462",gps:"",syn:"2026-01-27",km:0,location:"Kolding",beskrivelse:"HONDA CB 750 HORNET SORT SÆNKET",lokationsLog:[{lokation:"Kolding",fra:"2024-12-29",til:null}]},
  {id:9,mcNr:13,reg:"EH 49 705",stel:"JH2RH12A1PK018914",gps:"",syn:"2026-09-14",km:0,location:"Kolding",beskrivelse:"HONDA CB 750 HORNET HVID",lokationsLog:[{lokation:"Kolding",fra:"2025-05-13",til:null}]},
  {id:10,mcNr:14,reg:"EH 49 705",stel:"MLHRH02A2N5201539",gps:"",syn:"2026-09-17",km:0,location:"Kolding",beskrivelse:"HONDA CB 650 R MAT BLÅ",lokationsLog:[{lokation:"Kolding",fra:"2026-02-02",til:null}]},
  {id:11,mcNr:5,reg:"EH 50 188",stel:"JH2RH1AXPK021407",gps:"",syn:"2026-09-23",km:0,location:"Kolding",beskrivelse:"HONDA 750 HORNET GUL A2",lokationsLog:[{lokation:"Kolding",fra:"2025-05-25",til:null}]},
  {id:12,mcNr:4,reg:"FF 14 330",stel:"MLHPC63A4N5202765",gps:"",syn:"2026-05-07",km:15376,location:"KTA Kolding",beskrivelse:"HONDA CB 500 FA GRÅ",lokationsLog:[{lokation:"KTA Kolding",fra:"2025-03-31",til:null}]},
  {id:13,mcNr:5,reg:"FF 14 529",stel:"MLHPC63A4N5202733",gps:"",syn:"2026-08-11",km:10846,location:"KTA Kolding",beskrivelse:"HONDA CB 500 FA GRÅ",lokationsLog:[{lokation:"KTA Kolding",fra:"2025-12-30",til:null}]},
  {id:14,mcNr:6,reg:"FF 14 528",stel:"MLHPC63A5N5202658",gps:"",syn:"2026-04-15",km:16343,location:"KTA Kolding",beskrivelse:"HONDA CB 500 RØD",lokationsLog:[{lokation:"KTA Kolding",fra:"2025-10-31",til:null}]},
  {id:15,mcNr:8,reg:"FF 12 730",stel:"VBKJUC407EC007102",gps:"",syn:"2026-02-06",km:14792,location:"KTA Kolding",beskrivelse:"KTA 200 DUKE",lokationsLog:[{lokation:"KTA Kolding",fra:"2025-05-25",til:null}]},
  {id:16,mcNr:9,reg:"FF 14 564",stel:"ML5ER650SSDA88960",gps:"",syn:"2026-09-24",km:8055,location:"KTA Kolding",beskrivelse:"KAWASAKI Z 650 SORT",lokationsLog:[{lokation:"KTA Kolding",fra:"2024-12-06",til:null}]},
  {id:17,mcNr:10,reg:"FF 14 522",stel:"MLHRH02AXN5205693",gps:"",syn:"2027-01-12",km:19504,location:"KTA Kolding",beskrivelse:"HONDA CB 650 R GRÅMETAL",lokationsLog:[{lokation:"KTA Kolding",fra:"2025-12-16",til:null}]},
  {id:18,mcNr:11,reg:"FF 14 520",stel:"MLHRH02AXN52054466",gps:"",syn:"2027-01-16",km:19559,location:"KTA Kolding",beskrivelse:"HONDA CB 650 R MAT BLÅ",lokationsLog:[{lokation:"KTA Kolding",fra:"2025-05-29",til:null}]},
  {id:19,mcNr:12,reg:"FF 14 521",stel:"MLHRH02A8N5206213",gps:"",syn:"2026-02-02",km:19044,location:"KTA Kolding",beskrivelse:"HONDA CB 650 R MAT SORT",lokationsLog:[{lokation:"KTA Kolding",fra:"2025-03-18",til:null}]},
  {id:20,mcNr:13,reg:"FF 14 523",stel:"MLHRH2A8N5205367",gps:"",syn:"2026-05-27",km:19985,location:"KTA Kolding",beskrivelse:"HONDA CB 650 R RØDMETAL",lokationsLog:[{lokation:"KTA Kolding",fra:"2025-06-09",til:null}]},
  {id:21,mcNr:14,reg:"FF 14 519",stel:"MLHRH02A9N5206124",gps:"",syn:"2026-06-10",km:19852,location:"KTA Kolding",beskrivelse:"HONDA CB 650 R MAT SORT",lokationsLog:[{lokation:"KTA Kolding",fra:"2025-02-25",til:null}]},
  {id:22,mcNr:15,reg:"FF 13 339",stel:"WB10307B35ZR24821",gps:"",syn:"2026-12-15",km:25000,location:"KTA Kolding",beskrivelse:"BMW R 1200 RS SIDEVOGN",lokationsLog:[{lokation:"KTA Kolding",fra:"2025-08-31",til:null}]},
  {id:23,mcNr:16,reg:"FF 14 512",stel:"JH2RH09A8MK003340",gps:"",syn:"2026-11-15",km:2449,location:"KTA Kolding",beskrivelse:"HONDA NC 750 SIDEVOGN",lokationsLog:[{lokation:"KTA Kolding",fra:"2024-12-20",til:null}]},
  {id:24,mcNr:7,reg:"FF 44 364",stel:"VTTBKTI1100101404",gps:"",syn:"2027-04-14",km:4966,location:"KTA Kolding",beskrivelse:"SUZUKI 500 SIDEVOGN",lokationsLog:[{lokation:"KTA Kolding",fra:"2025-07-20",til:null}]},
  {id:25,mcNr:73,reg:"CY 42 826",stel:"MLHPC56A5L5202842",gps:"",syn:"2026-02-02",km:13781,location:"Århus MC",beskrivelse:"HONDA 500 REBEL SORT",lokationsLog:[{lokation:"Århus MC",fra:"2025-08-28",til:null}]},
  {id:26,mcNr:81,reg:"CM 61 700",stel:"MLHJC79A0J5004812",gps:"",syn:"2027-01-31",km:13737,location:"Århus MC",beskrivelse:"HONDA CB 125 R HVID",lokationsLog:[{lokation:"Århus MC",fra:"2025-12-19",til:null}]},
  {id:27,mcNr:84,reg:"DV 39 724",stel:"MLHRH02AXM5105043",gps:"",syn:"2026-03-09",km:18148,location:"Århus MC",beskrivelse:"HONDA CB 650 R BLÅ",lokationsLog:[{lokation:"Århus MC",fra:"2025-02-20",til:null}]},
  {id:28,mcNr:85,reg:"DX 66 784",stel:"ML5ER650KKDA60767",gps:"",syn:"2027-03-22",km:16599,location:"Århus MC",beskrivelse:"KAWASAKI Z 650 SORT",lokationsLog:[{lokation:"Århus MC",fra:"2025-01-03",til:null}]},
  {id:29,mcNr:89,reg:"DS 52 586",stel:"MLHRG63A0N56206181",gps:"",syn:"2026-03-11",km:15854,location:"Århus MC",beskrivelse:"HONDA CB 500 FA GRÅ",lokationsLog:[{lokation:"Århus MC",fra:"2025-06-04",til:null}]},
  {id:30,mcNr:80,reg:"DZ 46 429",stel:"MLHRH02A9M5106474",gps:"",syn:"2027-02-26",km:13725,location:"Århus MC",beskrivelse:"HONDA CB 650 R LYS GRÅ",lokationsLog:[{lokation:"Århus MC",fra:"2025-10-18",til:null}]},
  {id:31,mcNr:86,reg:"EJ 29 846",stel:"JH2RH12A1PK020243",gps:"",syn:"2027-01-09",km:0,location:"Århus MC",beskrivelse:"HONDA 750 HORNET GUL A2",lokationsLog:[{lokation:"Århus MC",fra:"2025-05-25",til:null}]},
  {id:32,mcNr:97,reg:"DM 94 449",stel:"MLHPC63AXN5204700",gps:"",syn:"2026-01-13",km:18501,location:"Hobro",beskrivelse:"HONDA CB 500 FA RØD",lokationsLog:[{lokation:"Hobro",fra:"2025-02-24",til:null}]},
  {id:33,mcNr:103,reg:"DD 31 067",stel:"MLHRH02A5M5107606",gps:"",syn:"2026-02-23",km:28581,location:"Hobro",beskrivelse:"HONDA CB 650 R RØDMETAL",lokationsLog:[{lokation:"Hobro",fra:"2025-03-15",til:null}]},
  {id:34,mcNr:100,reg:"DN 23 604",stel:"MH4BR125LLIP06984",gps:"",syn:"2026-08-09",km:7339,location:"Hobro",beskrivelse:"KAWASAKI Z 125",lokationsLog:[{lokation:"Hobro",fra:"2025-08-10",til:null}]},
  {id:35,mcNr:107,reg:"FF 14 317",stel:"MLHRH02AN5202861",gps:"",syn:"2026-08-23",km:13525,location:"Hobro",beskrivelse:"HONDA CB 650R SØLV LILLE BULE I TANK",lokationsLog:[{lokation:"Hobro",fra:"2025-07-06",til:null}]},
  {id:36,mcNr:14,reg:"FF 14 867",stel:"MLHRH02AXM5105060",gps:"",syn:"2026-11-15",km:7994,location:"Hobro",beskrivelse:"HONDA VB 650 R MAT BLÅ (BULE I TANK)",lokationsLog:[{lokation:"Hobro",fra:"2025-12-13",til:null}]},
  {id:37,mcNr:108,reg:"FF 14 318",stel:"ML5ER650KKDA2404",gps:"",syn:"2026-06-03",km:11676,location:"Hobro",beskrivelse:"KAWASAKI Z 650 SORT",lokationsLog:[{lokation:"Hobro",fra:"2025-01-06",til:null}]},
  {id:38,mcNr:17,reg:"FF 14 565",stel:"NJ42A1I1106",gps:"",syn:"2026-12-29",km:27705,location:"Hobro",beskrivelse:"SUZUKI 250 SIDEVOGN",lokationsLog:[{lokation:"Hobro",fra:"2025-11-03",til:null}]},
  {id:39,mcNr:105,reg:"FF 15 216",stel:"JH2RH09A5PK101844",gps:"",syn:"2027-02-08",km:852,location:"Hobro",beskrivelse:"HONDA NC 750 SIDEVOGN",lokationsLog:[{lokation:"Hobro",fra:"2025-10-29",til:null}]},
  {id:40,mcNr:106,reg:"EC 24 119",stel:"JH2H12A2PK0075596",gps:"",syn:"2027-03-02",km:4143,location:"Hobro",beskrivelse:"HONDA CB 750 HORNET HVID",lokationsLog:[{lokation:"Hobro",fra:"2024-12-03",til:null}]},
  {id:41,mcNr:101,reg:"FF 15 163",stel:"MLHPC63A0N5200896",gps:"",syn:"2026-09-25",km:3278,location:"Hobro",beskrivelse:"HONDA CB 500FA SORT",lokationsLog:[{lokation:"Hobro",fra:"2025-11-16",til:null}]},
  {id:42,mcNr:104,reg:"FF 15 164",stel:"MLHPC63A7N5202760",gps:"",syn:"2027-01-19",km:4050,location:"Hobro",beskrivelse:"HONDA CB 500FA LYSEGRÅ",lokationsLog:[{lokation:"Hobro",fra:"2025-03-30",til:null}]},
  {id:43,mcNr:102,reg:"FF 15 165",stel:"MLHPC63A8N5202637",gps:"",syn:"2026-04-27",km:3944,location:"Hobro",beskrivelse:"HONDA CB 500 FA RØD",lokationsLog:[{lokation:"Hobro",fra:"2026-01-01",til:null}]},
  {id:44,mcNr:20,reg:"DW 83 060",stel:"VCKJUA403MC0774749",gps:"",syn:"2026-11-11",km:4404,location:"Herning",beskrivelse:"HUSQVARNA 125 SORT",lokationsLog:[{lokation:"Herning",fra:"2024-11-02",til:null}]},
  {id:45,mcNr:22,reg:"DD 31 073",stel:"MLHPC56A2L5209022",gps:"",syn:"2026-10-18",km:19962,location:"Herning",beskrivelse:"HONDA 500 RABET SORT",lokationsLog:[{lokation:"Herning",fra:"2025-02-24",til:null}]},
  {id:46,mcNr:23,reg:"DM 94 440",stel:"MLHPC63A1N5204651",gps:"",syn:"2027-02-28",km:25759,location:"Herning",beskrivelse:"HONDA CB 500 FA GRÅ (lille bule i tank)",lokationsLog:[{lokation:"Herning",fra:"2025-11-28",til:null}]},
  {id:47,mcNr:25,reg:"DW 83 062",stel:"MLHRH02A1N5204187",gps:"",syn:"2026-08-17",km:17812,location:"Herning",beskrivelse:"HONDA CB 650 R RØDMETAL",lokationsLog:[{lokation:"Herning",fra:"2025-08-20",til:null}]},
  {id:48,mcNr:26,reg:"DW 83 063",stel:"MLHRH02A5N5206265",gps:"",syn:"2027-01-11",km:0,location:"Herning",beskrivelse:"HONDA CB 650 R",lokationsLog:[{lokation:"Herning",fra:"2025-05-23",til:null}]},
  {id:49,mcNr:27,reg:"DW 83 064",stel:"MLHRH02A6N5204203",gps:"",syn:"2026-07-26",km:24052,location:"Herning",beskrivelse:"HONDA CB 650 R SORT",lokationsLog:[{lokation:"Herning",fra:"2025-06-24",til:null}]},
  {id:50,mcNr:21,reg:"DM 94 446",stel:"MLHRG63A50N5202678",gps:"",syn:"2026-10-27",km:24725,location:"Herning",beskrivelse:"HONDA CB 500 FA RØD",lokationsLog:[{lokation:"Herning",fra:"2025-03-10",til:null}]},
  {id:51,mcNr:26,reg:"EJ 29 409",stel:"JH2H12A6PK020237",gps:"",syn:"2026-07-14",km:0,location:"Herning",beskrivelse:"HONDA HORNET 750 CCM GUL",lokationsLog:[{lokation:"Herning",fra:"2024-11-24",til:null}]},
  {id:52,mcNr:70,reg:"CM 61 701",stel:"MLHJC79A0J5004812",gps:"",syn:"2026-05-20",km:20246,location:"Viborg",beskrivelse:"HONDA CB 125 R RØDMETAL",lokationsLog:[{lokation:"Viborg",fra:"2026-01-18",til:null}]},
  {id:53,mcNr:71,reg:"DM 94 452",stel:"MLHPC63A5N5204667",gps:"",syn:"2026-01-30",km:25075,location:"Viborg",beskrivelse:"HONDA CB500 FA GRÅ",lokationsLog:[{lokation:"Viborg",fra:"2025-09-01",til:null}]},
  {id:54,mcNr:74,reg:"DX 66 795",stel:"ML5ER650SSDAA8230",gps:"",syn:"2026-11-13",km:15115,location:"Viborg",beskrivelse:"KAWASAKI Z 650 SORT/RØD",lokationsLog:[{lokation:"Viborg",fra:"2025-09-09",til:null}]},
  {id:55,mcNr:73,reg:"DV 39 727",stel:"MLHRH02A3M5106549",gps:"",syn:"2027-03-19",km:26014,location:"Viborg",beskrivelse:"HONDA CB 650 R RØD",lokationsLog:[{lokation:"Viborg",fra:"2025-06-29",til:null}]},
  {id:56,mcNr:76,reg:"DZ 39 163",stel:"MLHRH02A9M5105146",gps:"",syn:"2026-03-22",km:16596,location:"Viborg",beskrivelse:"HONDA CB 650 GRÅ",lokationsLog:[{lokation:"Viborg",fra:"2025-03-28",til:null}]},
  {id:57,mcNr:72,reg:"DZ 46 428",stel:"MLHPC63A0N5200413",gps:"",syn:"2027-04-15",km:8277,location:"Viborg",beskrivelse:"HONDA CB 500 FA GRÅ",lokationsLog:[{lokation:"Viborg",fra:"2025-09-01",til:null}]},
  {id:58,mcNr:75,reg:"ED 83 710",stel:"JH2RH12A7PK016052",gps:"",syn:"2026-09-06",km:6576,location:"Viborg",beskrivelse:"HONDA 750 HORNET HVID",lokationsLog:[{lokation:"Viborg",fra:"2025-01-31",til:null}]},
  {id:59,mcNr:92,reg:"DV 39 723",stel:"MLHPC3A5N5200408",gps:"",syn:"2026-07-26",km:13512,location:"Randers",beskrivelse:"HONDA CN 500 FA GRÅ",lokationsLog:[{lokation:"Randers",fra:"2024-11-03",til:null}]},
  {id:60,mcNr:95,reg:"DW 83 059",stel:"MLHRH02A1M5105075",gps:"",syn:"2026-11-18",km:18988,location:"Randers",beskrivelse:"HONDA CB 650 R BLÅ",lokationsLog:[{lokation:"Randers",fra:"2025-12-11",til:null}]},
  {id:61,mcNr:90,reg:"DN 23 592",stel:"MH4BR125LLIP07064",gps:"",syn:"2027-03-10",km:7075,location:"Randers",beskrivelse:"KAWASAKI Z 125 GRÅ",lokationsLog:[{lokation:"Randers",fra:"2025-12-09",til:null}]},
  {id:62,mcNr:94,reg:"EA 22 374",stel:"MLHRH02A3M5106373",gps:"",syn:"2026-10-13",km:13252,location:"Randers",beskrivelse:"HONDA CB 650 R GRÅ",lokationsLog:[{lokation:"Randers",fra:"2025-10-22",til:null}]},
  {id:63,mcNr:93,reg:"ED 83 945",stel:"JH2RH12A3PK0075588",gps:"",syn:"2026-03-19",km:3825,location:"Randers",beskrivelse:"HONDA HORNET HVID",lokationsLog:[{lokation:"Randers",fra:"2024-12-05",til:null}]},
  {id:64,mcNr:91,reg:"EJ 29 845",stel:"JH2RH12A5PK021413",gps:"",syn:"2026-12-21",km:0,location:"Randers",beskrivelse:"HONDA HORNET 750 GUL A2",lokationsLog:[{lokation:"Randers",fra:"2025-07-29",til:null}]},
  {id:65,mcNr:15,reg:"DY 28 051",stel:"MLHRH02AXM5106456",gps:"",syn:"2027-01-29",km:19618,location:"Horsens",beskrivelse:"HONDA CB 650 R RØDMETAL",lokationsLog:[{lokation:"Horsens",fra:"2025-07-01",til:null}]},
  {id:66,mcNr:62,reg:"DC 69 846",stel:"MLHPC63A2N5200897",gps:"",syn:"2026-10-21",km:13018,location:"Horsens",beskrivelse:"HONDA CB 500 SORT",lokationsLog:[{lokation:"Horsens",fra:"2025-04-08",til:null}]},
  {id:67,mcNr:63,reg:"DC 69 847",stel:"MLHPC63A1N5200325",gps:"",syn:"2026-03-21",km:14018,location:"Horsens",beskrivelse:"HONDA CB 500 FA GRÅ",lokationsLog:[{lokation:"Horsens",fra:"2025-07-26",til:null}]},
  {id:68,mcNr:66,reg:"DD 31 061",stel:"MLHRH02A9M5107608",gps:"",syn:"2026-05-08",km:26174,location:"Horsens",beskrivelse:"HONDA CB 650 R RØD RIDSER I TANK",lokationsLog:[{lokation:"Horsens",fra:"2025-08-14",til:null}]},
  {id:69,mcNr:67,reg:"DD 31 063",stel:"ML5ER650KKDA22117",gps:"",syn:"2027-02-05",km:14962,location:"Horsens",beskrivelse:"KAWASAKI Z 650 HVID/GRØN RIDSER I TANK",lokationsLog:[{lokation:"Horsens",fra:"2026-01-30",til:null}]},
  {id:70,mcNr:101,reg:"DD 70 227",stel:"MLHJC79A8J5003228",gps:"",syn:"2026-11-22",km:11269,location:"Horsens",beskrivelse:"HONDA CB 125 R SORT",lokationsLog:[{lokation:"Horsens",fra:"2025-07-17",til:null}]},
  {id:71,mcNr:10,reg:"EH 49 160",stel:"JH2RH12A3PK020244",gps:"",syn:"2027-02-16",km:0,location:"Horsens",beskrivelse:"HONDA CB 750 HORNET GUL",lokationsLog:[{lokation:"Horsens",fra:"2024-10-28",til:null}]},
  {id:72,mcNr:56,reg:"CE 21 388",stel:"MLHJC79A8J5002578",gps:"",syn:"2026-10-31",km:11928,location:"Odense",beskrivelse:"HONDA CB 125 R SORT",lokationsLog:[{lokation:"Odense",fra:"2025-09-23",til:null}]},
  {id:73,mcNr:55,reg:"DJ 72 555",stel:"MLHPC63A0N5202762",gps:"",syn:"2026-08-16",km:19071,location:"Odense",beskrivelse:"HONDA CB 500 FA GRÅ",lokationsLog:[{lokation:"Odense",fra:"2025-12-30",til:null}]},
  {id:74,mcNr:54,reg:"DM 94 451",stel:"MLHPC63A5N5204653",gps:"",syn:"2027-02-12",km:27564,location:"Odense",beskrivelse:"HONDA CB 500 FA GRÅ",lokationsLog:[{lokation:"Odense",fra:"2025-12-03",til:null}]},
  {id:75,mcNr:51,reg:"DZ 39 162",stel:"MLHRH02A1M51083725",gps:"",syn:"2027-03-21",km:14588,location:"Odense",beskrivelse:"HONDA CB 650 R NY LYSGRÅ",lokationsLog:[{lokation:"Odense",fra:"2024-11-13",til:null}]},
  {id:76,mcNr:52,reg:"DZ 46 432",stel:"MLHRH02A9M5106443",gps:"",syn:"2026-08-29",km:13015,location:"Odense",beskrivelse:"HONDA CB 650 R RØD METAL",lokationsLog:[{lokation:"Odense",fra:"2025-09-21",til:null}]},
  {id:77,mcNr:53,reg:"EH 49 159",stel:"JH2RH12AXPK016045",gps:"",syn:"2026-12-29",km:1070,location:"Odense",beskrivelse:"HONDA CB 750 HORNET (HVID)",lokationsLog:[{lokation:"Odense",fra:"2024-12-10",til:null}]},
  {id:78,mcNr:50,reg:"EH 50 187",stel:"JH2RH12A4PK020219",gps:"",syn:"2026-02-09",km:371,location:"Odense",beskrivelse:"HONDA 750 HORNET GUL A2",lokationsLog:[{lokation:"Odense",fra:"2025-04-22",til:null}]},
];


const INIT_YDELSER = [
  {id:"Y001",nr:"Y001",navn:"Olieskift",pris:350},
  {id:"Y002",nr:"Y002",navn:"Kædejustering",pris:250},
  {id:"Y003",nr:"Y003",navn:"Bremseservice",pris:480},
  {id:"Y004",nr:"Y004",navn:"Dækmontage",pris:320},
  {id:"V001",nr:"V001",navn:"Motorolie 1L",pris:85},
  {id:"V002",nr:"V002",navn:"Luftfilter",pris:145},
  {id:"V003",nr:"V003",navn:"Bremseklods sæt",pris:290},
  {id:"V004",nr:"V004",navn:"Kæde 520",pris:420},
];

// syn = dato for SIDSTE syn — beregn næste syn (+ 2 år)
const naesteSyn = d => {
  if(!d) return "";
  const dt = new Date(d);
  dt.setFullYear(dt.getFullYear() + 2);
  return dt.toISOString().split("T")[0];
};
const synStatusDato = mc => {
  // Brug mc.naesteSyn (fra Synsbasen) hvis det findes, ellers beregn +2 år
  if(!mc) return "";
  return mc.naesteSyn || naesteSyn(mc.syn) || "";
};
const synStatus = mc => {
  // Accepterer både mc-objekt og string (bagudkompatibilitet)
  const dato = typeof mc === "string" ? naesteSyn(mc) : synStatusDato(mc);
  if(!dato) return "ok";
  const diff = Math.floor((new Date(dato) - today) / 86400000);
  return diff < 0 ? "overskredet" : diff <= 30 ? "snart" : diff <= 60 ? "advarsel" : "ok";
};
const SC = {ok:"#22c55e", advarsel:"#f59e0b", snart:"#ef4444", overskredet:"#ef4444"};
const SL = {ok:"Syn OK", advarsel:"Syn snart (30-60 dage)", snart:"Syn snart (under 30 dage)", overskredet:"Syn overskredet"};

let fakNr=1000;
const nextFakNr=(fakturaer=[])=>{
  // Find højeste eksisterende FAK-nummer og start derfra
  const max=fakturaer.reduce((m,f)=>{
    const n=parseInt((f.id||"").replace("FAK-",""),10);
    return isNaN(n)?m:Math.max(m,n);
  },fakNr);
  fakNr=Math.max(fakNr,max);
  return `FAK-${++fakNr}`;
};

const kmColor = km => km>25000?"#ef4444":km>=20000?"#f59e0b":"#22c55e";

const serviceStatus = mc => {
  const entries = (mc.kmLog||[]).filter(e => e.service);
  if(!entries.length) return null;
  const last = entries[entries.length - 1];
  const kmSiden = (mc.km||0) - (last.km||0);
  const månSiden = (Date.now() - new Date(last.dato)) / (1000*60*60*24*30.44);
  if(kmSiden >= 11000 || månSiden >= 11) return "rød";
  if(kmSiden >= 10000 || månSiden >= 10) return "gul";
  return "grøn";
};

// ── shared style helpers ──
const inp = {padding:"10px 14px",borderRadius:8,border:"1px solid #333",background:"#1a1a1a",color:"#fff",fontSize:14,fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"};
const btnRed = {background:"#cc0000",border:"none",color:"#fff",borderRadius:8,padding:"10px 18px",fontWeight:700,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap"};
const btnGhost = {background:"transparent",border:"1px solid #444",color:"#ccc",borderRadius:8,padding:"9px 16px",fontWeight:600,fontSize:14,cursor:"pointer",whiteSpace:"nowrap"};

// ── Brugersystem ──
const INIT_USERS = [
  {id:1, brugernavn:"admin", adgangskode:"Lisbeth2024", rolle:"admin", navn:"Administrator"},
];

// ── Login skærm ──
function LoginScreen({onLogin, fejl}) {
  const [brugernavn,setBrugernavn]=useState("");
  const [adgangskode,setAdgangskode]=useState("");
  const [vis,setVis]=useState(false);
  const [loginLogoOk,setLoginLogoOk]=useState(true);
  return (
    <div style={{minHeight:"100dvh",background:"#111",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{width:"100%",maxWidth:380}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:8}}>🏍</div>
          <div style={{fontSize:22,fontWeight:800,color:"#fff",letterSpacing:1}}>MCFLEET</div>
          <div style={{width:40,height:3,background:"#cc0000",borderRadius:2,margin:"10px auto 4px"}}/>
          {loginLogoOk ? (
            <img src="/lisbeth-koreskole-logo.png" alt="Lisbeth's Køreskole" onError={()=>setLoginLogoOk(false)}
              style={{display:"block",margin:"0 auto",maxWidth:240,maxHeight:52,objectFit:"contain"}}/>
          ) : (
            <div style={{fontSize:13,color:"#888"}}>Lisbeth's Køreskole</div>
          )}
        </div>
        {/* Formular */}
        <div style={{background:"#1a1a1a",borderRadius:14,border:"1px solid #2a2a2a",padding:"28px 24px"}}>
          <h2 style={{margin:"0 0 22px",fontSize:18,fontWeight:700,color:"#fff"}}>Log ind</h2>
          {fejl&&<div style={{background:"#cc000022",border:"1px solid #cc000066",borderRadius:8,padding:"10px 14px",color:"#f87171",fontSize:13,marginBottom:16}}>{fejl}</div>}
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:11,color:"#888",marginBottom:5,fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Brugernavn</label>
            <input value={brugernavn} onChange={e=>setBrugernavn(e.target.value)} placeholder="Skriv brugernavn..."
              onKeyDown={e=>e.key==="Enter"&&onLogin(brugernavn,adgangskode)}
              style={{...inp,background:"#252525",border:"1px solid #333"}}/>
          </div>
          <div style={{marginBottom:22}}>
            <label style={{display:"block",fontSize:11,color:"#888",marginBottom:5,fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Adgangskode</label>
            <div style={{position:"relative"}}>
              <input type={vis?"text":"password"} value={adgangskode} onChange={e=>setAdgangskode(e.target.value)} placeholder="Skriv adgangskode..."
                onKeyDown={e=>e.key==="Enter"&&onLogin(brugernavn,adgangskode)}
                style={{...inp,background:"#252525",border:"1px solid #333",paddingRight:44}}/>
              <button onClick={()=>setVis(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#888",cursor:"pointer",fontSize:16,padding:0}}>{vis?"🙈":"👁"}</button>
            </div>
          </div>
          <button onClick={()=>onLogin(brugernavn,adgangskode)}
            style={{...btnRed,width:"100%",justifyContent:"center",padding:"13px",fontSize:15}}>
            LOG IND
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Brugerstyring (kun admin) ──
function SlutsedlerView({db,fmt}) {
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(true);
  const [fejl,setFejl]=useState(null);
  const [sending,setSending]=useState({});

  useEffect(()=>{
    db("signatures?select=id,mc_id,mc_reg,buyer_name,buyer_email,buyer_adresse,buyer_postby,buyer_telefon,pris_kr,eco_draft_id,envelope_id,status,created_at,signed_at,mcs(id,reg,beskrivelse,stel)&status=eq.signed&order=signed_at.desc")
      .then(data=>{ setRows(data); setLoading(false); })
      .catch(e=>{ setFejl(e.message); setLoading(false); });
  },[]);

  const fmtDato = (iso) => {
    if(!iso) return "–";
    try{ return new Date(iso).toLocaleDateString("da-DK",{day:"2-digit",month:"2-digit",year:"numeric"}); }
    catch(e){ return iso; }
  };

  const sendEconomicSlutseddel = async (row) => {
    if(!row.pris_kr) {
      alert("Denne slutseddel mangler prisoplysninger.\nOpret fakturaen manuelt i e-conomic.");
      return;
    }
    setSending(s=>({...s,[row.id]:true}));
    try {
      const mc = row.mcs || {};

      // Opret debitor — lad e-conomic auto-tildele kundenummer
      const postbyStr = row.buyer_postby || "";
      const spaceIdx = postbyStr.indexOf(" ");
      const zip  = spaceIdx > 0 ? postbyStr.substring(0, spaceIdx) : postbyStr;
      const city = spaceIdx > 0 ? postbyStr.substring(spaceIdx + 1) : "";

      const newCustomer = await ecoApi("POST", "/customers", {
        name: row.buyer_name || "Ukendt køber",
        address: row.buyer_adresse || "",
        zip,
        city,
        email: row.buyer_email || "",
        phone: row.buyer_telefon || "",
        currency: "DKK",
        customerGroup: { customerGroupNumber: ECO_CUST_GROUP },
        paymentTerms: { paymentTermsNumber: ECO_PAY_TERMS },
        vatZone: { vatZoneNumber: ECO_VAT_ZONE },
      });
      const custNum = newCustomer?.customerNumber;

      // Byg varelinjebeskrivelse
      const beskr = [
        "Salg af MC",
        mc.beskrivelse || "",
        mc.stel ? "Stel: " + mc.stel : "",
        (row.mc_reg || mc.reg) ? "Reg: " + (row.mc_reg || mc.reg) : "",
      ].filter(Boolean).join(" ").substring(0, 250);

      const today = new Date().toISOString().split("T")[0];

      // Opret faktura kladde
      const draft = await ecoApi("POST", "/invoices/drafts", {
        date: today,
        currency: "DKK",
        customer: { customerNumber: custNum },
        recipient: { name: row.buyer_name||"Ukendt", address: row.buyer_adresse||"", zip, city, vatZone: { vatZoneNumber: ECO_VAT_ZONE } },
        paymentTerms: { paymentTermsNumber: ECO_PAY_TERMS },
        layout: { layoutNumber: ECO_LAYOUT },
        lines: [{
          lineNumber: 1,
          sortKey: 1,
          product: { productNumber: String(ECO_MC_PRODUCT) },
          description: beskr,
          quantity: 1,
          unitNetPrice: row.pris_kr,
        }],
      });

      const draftId = String(draft?.draftInvoiceNumber || draft?.invoiceNumber || draft?.self?.split("/").pop() || "?");

      // Gem draft ID på signaturen så knappen viser "Sendt"
      await db("signatures?id=eq." + row.id, {
        method: "PATCH",
        prefer: "return=minimal",
        body: JSON.stringify({ eco_draft_id: draftId }),
      });

      setRows(prev => prev.map(r => r.id === row.id ? { ...r, eco_draft_id: draftId } : r));
      alert("Fakturakladde oprettet i e-conomic\nKladenummer: " + draftId + "\nDebitor: " + (row.buyer_name||""));
    } catch(e) {
      alert("Fejl ved oprettelse i e-conomic:\n" + e.message);
    }
    setSending(s=>({...s,[row.id]:false}));
  };

  const COLS = "80px 110px 1fr 1fr 110px 120px 150px";

  return (
    <div style={{paddingBottom:32}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:700,color:"#fff"}}>Slutsedler</h1>
          <p style={{margin:"4px 0 0",color:"#888",fontSize:13}}>Alle underskrevne slutsedler</p>
        </div>
        {!loading&&!fejl&&(
          <span style={{background:"#1a1a1a",border:"1px solid #2a2a2a",color:"#888",borderRadius:20,padding:"4px 14px",fontSize:13}}>
            {rows.length} stk
          </span>
        )}
      </div>

      {loading&&(
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60,color:"#888",gap:12}}>
          <div style={{width:24,height:24,border:"3px solid #333",borderTop:"3px solid #cc0000",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
          Henter slutsedler...
        </div>
      )}
      {fejl&&<div style={{color:"#f87171",padding:20,background:"#2d0a0a",borderRadius:8,border:"1px solid #cc000033"}}>Fejl: {fejl}</div>}
      {!loading&&!fejl&&rows.length===0&&(
        <div style={{color:"#888",padding:40,textAlign:"center",background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a"}}>Ingen underskrevne slutsedler endnu.</div>
      )}

      {!loading&&!fejl&&rows.length>0&&(
        <div style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",overflow:"hidden"}}>
          {/* Header */}
          <div style={{display:"grid",gridTemplateColumns:COLS,gap:0,padding:"10px 16px",borderBottom:"1px solid #2a2a2a",background:"#141414"}}>
            {["MC nr.","Reg. nr.","Beskrivelse","Køber","Underskrevet","Dokument","E-conomic"].map(h=>(
              <div key={h} style={{fontSize:11,fontWeight:700,color:"#666",textTransform:"uppercase",letterSpacing:.6}}>{h}</div>
            ))}
          </div>
          {/* Rækker */}
          {rows.map((r,i)=>{
            const mc=r.mcs||{};
            const isSending = sending[r.id];
            return (
              <div key={r.id} style={{display:"grid",gridTemplateColumns:COLS,gap:0,padding:"12px 16px",borderBottom:"1px solid #222",background:i%2===0?"#1a1a1a":"#1d1d1d",alignItems:"center"}}>
                <div style={{fontSize:13,color:"#888",fontWeight:600}}>#{mc.id||r.mc_id||"–"}</div>
                <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{r.mc_reg||mc.reg||"–"}</div>
                <div style={{fontSize:13,color:"#ccc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:8}}>{mc.beskrivelse||"–"}</div>
                <div style={{fontSize:13,color:"#ccc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:8}}>
                  <div style={{fontWeight:600,color:"#fff"}}>{r.buyer_name||"–"}</div>
                  <div style={{fontSize:11,color:"#666",marginTop:1}}>{r.buyer_email||""}</div>
                </div>
                <div style={{fontSize:12,color:"#888"}}>{fmtDato(r.signed_at||r.created_at)}</div>
                <div>
                  {r.envelope_id?(
                    <a href={`/.netlify/functions/firma-document?id=${r.envelope_id}`} target="_blank" rel="noopener noreferrer"
                      style={{color:"#7cabff",fontSize:12,textDecoration:"none",padding:"5px 10px",borderRadius:6,border:"1px solid #7cabff33",background:"#1a2a4a",whiteSpace:"nowrap",display:"inline-block"}}>
                      Åbn dokument
                    </a>
                  ):<span style={{color:"#444",fontSize:12}}>–</span>}
                </div>
                <div>
                  {r.eco_draft_id?(
                    <span style={{color:"#4ade80",fontSize:12,padding:"5px 10px",borderRadius:6,border:"1px solid #4ade8033",background:"#0a2a1a",whiteSpace:"nowrap",display:"inline-block"}}>
                      Sendt ✓
                    </span>
                  ):!r.pris_kr?(
                    <span style={{color:"#555",fontSize:12,padding:"5px 10px",borderRadius:6,border:"1px solid #333",background:"#1a1a1a",whiteSpace:"nowrap",display:"inline-block",cursor:"default"}}>
                      Mangler data
                    </span>
                  ):(
                    <button
                      onClick={()=>sendEconomicSlutseddel(r)}
                      disabled={isSending}
                      style={{color:isSending?"#888":"#fff",fontSize:12,padding:"5px 10px",borderRadius:6,border:"1px solid #cc000044",background:isSending?"#2a2a2a":"#cc0000",whiteSpace:"nowrap",cursor:isSending?"not-allowed":"pointer",display:"inline-block"}}>
                      {isSending?"Sender...":"Send til e-conomic"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BrugerAdmin({brugere,setBrugere,notify}) {
  const [ny,setNy]=useState({brugernavn:"",adgangskode:"",navn:"",rolle:"bruger"});
  const [rediger,setRediger]=useState(null);
  const [visKode,setVisKode]=useState({});

  const opret=()=>{
    if(!ny.brugernavn||!ny.adgangskode||!ny.navn){notify("Udfyld alle felter",true);return;}
    if(brugere.find(b=>b.brugernavn===ny.brugernavn)){notify("Brugernavn er taget",true);return;}
    const nyBruger={...ny,id:Date.now()};
    setBrugere(p=>[...p,nyBruger]);
    db("brugere",{method:"POST",body:JSON.stringify(brugerToDb(nyBruger)),prefer:"return=minimal"}).catch(e=>console.error("DB:",e));
    setNy({brugernavn:"",adgangskode:"",navn:"",rolle:"bruger"});
    notify("Bruger oprettet ✓");
  };
  const gem=()=>{
    setBrugere(p=>p.map(b=>b.id===rediger.id?rediger:b));
    db(`brugere?id=eq.${rediger.id}`,{method:"PATCH",body:JSON.stringify(brugerToDb(rediger)),prefer:"return=minimal"}).catch(e=>console.error("DB:",e));
    setRediger(null); notify("Bruger opdateret ✓");
  };
  const slet=(id)=>{
    if(brugere.filter(b=>b.rolle==="admin").length===1&&brugere.find(b=>b.id===id)?.rolle==="admin"){notify("Kan ikke slette den eneste admin",true);return;}
    setBrugere(p=>p.filter(b=>b.id!==id));
    db(`brugere?id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}).catch(e=>console.error("DB:",e));
    notify("Bruger slettet");
  };

  const cur=rediger||ny; const set=rediger?setRediger:setNy;
  const lInp={...inp,background:"#252525",border:"1px solid #333"};
  const lbl={display:"block",fontSize:11,color:"#888",marginBottom:4,fontWeight:600,letterSpacing:.8,textTransform:"uppercase"};

  return (
    <div style={{paddingBottom:24}}>
      <h1 style={{margin:"0 0 18px",fontSize:22,fontWeight:700,color:"#fff"}}>Brugerstyring</h1>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
        {/* Opret/rediger */}
        <div style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid #2a2a2a",fontWeight:700,fontSize:14,color:"#fff"}}>{rediger?"Rediger bruger":"Opret ny bruger"}</div>
          <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
            {[{key:"navn",l:"Fuldt navn"},{key:"brugernavn",l:"Brugernavn"},{key:"adgangskode",l:"Adgangskode"}].map(f=>(
              <div key={f.key}>
                <label style={lbl}>{f.l}</label>
                <input type={f.key==="adgangskode"?(visKode[f.key]?"text":"password"):"text"}
                  value={cur[f.key]} onChange={e=>set(p=>({...p,[f.key]:e.target.value}))}
                  readOnly={!!rediger&&f.key==="brugernavn"}
                  style={{...lInp,opacity:rediger&&f.key==="brugernavn"?0.5:1}}/>
              </div>
            ))}
            <div>
              <label style={lbl}>Rolle</label>
              <select value={cur.rolle} onChange={e=>set(p=>({...p,rolle:e.target.value}))} style={lInp}>
                <option value="bruger">Bruger — kan se og oprette fakturaer</option>
                <option value="admin">Admin — fuld adgang inkl. brugerstyring</option>
              </select>
            </div>
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <button onClick={rediger?gem:opret} style={{...btnRed,flex:1,justifyContent:"center",padding:"11px"}}>{rediger?"GEM":"OPRET"}</button>
              {rediger&&<button onClick={()=>setRediger(null)} style={{...btnGhost,padding:"11px 14px"}}>Annuller</button>}
            </div>
          </div>
        </div>

        {/* Liste */}
        <div style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid #2a2a2a",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontWeight:700,fontSize:14,color:"#fff"}}>Alle brugere</span>
            <span style={{color:"#888",fontSize:12}}>{brugere.length} stk</span>
          </div>
          <div style={{display:"flex",flexDirection:"column"}}>
            {brugere.map((b,i)=>(
              <div key={b.id} style={{padding:"12px 16px",borderBottom:"1px solid #2a2a2a",display:"flex",alignItems:"center",gap:10,background:i%2===0?"#1a1a1a":"#1e1e1e"}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:b.rolle==="admin"?"#cc0000":"#333",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,color:"#fff",flexShrink:0}}>
                  {b.navn.charAt(0).toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.navn}</div>
                  <div style={{fontSize:12,color:"#888"}}>{b.brugernavn} · <span style={{color:b.rolle==="admin"?"#f87171":"#60a5fa"}}>{b.rolle==="admin"?"Admin":"Bruger"}</span></div>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={()=>setRediger({...b})} style={{...btnGhost,padding:"5px 10px",fontSize:12}}>✏️</button>
                  <button onClick={()=>slet(b.id)} style={{background:"#3b1a1a",border:"1px solid #cc000033",color:"#f87171",borderRadius:6,padding:"5px 10px",fontWeight:600,fontSize:12,cursor:"pointer"}}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // ── Auth ──
  const [brugere,setBrugere]=useState([]);
  // Gendan bruger fra localStorage ved refresh — ingen udløb, men valideres mod DB efter load
  const [bruger,setBruger]=useState(()=>{
    try{
      const raw=localStorage.getItem("mcfleet_bruger");
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(e){ return null; }
  });
  const [loginFejl,setLoginFejl]=useState("");
  const [loading,setLoading]=useState(true);

  // ── App state ──
  const [mcs,setMcs]=useState([]);
  const [ydelser,setYdelser]=useState([]);
  const [fakturaer,setFakturaer]=useState([]);
  const [nav,setNav]=useState("oversigt");
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [brandLogoOk,setBrandLogoOk]=useState(true);
  const [note,setNote]=useState(null);
  const [search,setSearch]=useState("");
  const [filterLoc,setFilterLoc]=useState("Alle");
  const [filterType,setFilterType]=useState("MC");
  const [mcModal,setMcModal]=useState(null);
  const [editMc,setEditMc]=useState(null);
  const [nyFak,setNyFak]=useState(null);
  const [fakDetail,setFakDetail]=useState(null);
  const [fakFilterFak,setFakFilterFak]=useState("alle");
  const [fakFilterAfd,setFakFilterAfd]=useState("Alle");
  const [moveModal,setMoveModal]=useState(null);
  const [nyYdelse,setNyYdelse]=useState({nr:"",navn:"",pris:""});
  const [editYdelse,setEditYdelse]=useState(null);
  const [editFakId,setEditFakId]=useState(null);
  const [opgaver,setOpgaver]=useState([]);
  const [visOpgaveForm,setVisOpgaveForm]=useState(false);
  const [synModal,setSynModal]=useState(false);
  const [transportPrompt,setTransportPrompt]=useState(null); // {afdeling, pris, mcId, dato}
  const [gpsModal,setGpsModal]=useState(false);
  const [pladeScanner,setPladeScanner]=useState(false);
  const [fotoModal,setFotoModal]=useState(null); // url til billede der vises i fuld skærm
  // Lokationer som objekter: {navn, transport}
  const [lokationer,setLokationer]=useState(
    LOCATIONS.map(l=>({navn:l, transport:TRANSPORT_TAKSTER[l]??0}))
  );
  const [nyLok,setNyLok]=useState({navn:"",transport:0,dimension:""});
  const [editLok,setEditLok]=useState(null); // {idx, navn, transport, dimension} // {idx, navn, transport}

  // ── Indlæs alt data fra Supabase ved opstart ──
  useEffect(()=>{
    const load = async () => {
      // Garantér at loading altid stopper — selv ved uventet fejl
      const loadTimeout = setTimeout(() => {
        console.warn("Load timeout — tvinger loading=false");
        setLoading(false);
      }, 30000);
      try {
        // ── CACHE: Vis MC'er øjeblikkeligt fra sessionStorage hvis tilgængeligt ──
        const MC_CACHE_TTL = 5 * 60 * 1000; // 5 min
        try {
          const cached = JSON.parse(sessionStorage.getItem('mcfleet_mcs') || 'null');
          if (cached && cached.ts && Date.now() - cached.ts < MC_CACHE_TTL && cached.data?.length > 0) {
            setMcs(cached.data.map(mcFromDb));
            clearTimeout(loadTimeout);
            setLoading(false);
          }
        } catch(e) {}

        // ── FASE 1: Kritisk data — brugere + MC'er ──
        const fetchMcs = async (attempt=1) => {
          try {
            // Henter bevidst IKKE foto/fotos (tunge base64) — kun det lette thumb til oversigten.
            // Fuldstørrelses-fotos hentes lazy når en MC åbnes (onLazyFotoLoad).
            return await db("mcs?select=id,mc_nr,reg,stel,gps,syn,km,location,beskrivelse,thumb,lokations_log,km_log,foerste_reg,naeste_syn,noter,type&order=id");
          } catch(e1) {
            try {
              // Fallback hvis thumb-kolonnen endnu ikke er kørt som migration
              return await db("mcs?select=id,mc_nr,reg,stel,gps,syn,km,location,beskrivelse,lokations_log,km_log,foerste_reg,naeste_syn,noter,type&order=id");
            } catch(e2) {
              if(attempt < 3) {
                await new Promise(r=>setTimeout(r, 2000*attempt));
                return fetchMcs(attempt+1);
              }
              throw e2;
            }
          }
        };
        const [dbBrugere, dbMcs] = await Promise.all([
          db("brugere?order=id"),
          fetchMcs(),
        ]);

        // Gem i sessionStorage-cache til næste load
        try {
          sessionStorage.setItem('mcfleet_mcs', JSON.stringify({ts: Date.now(), data: dbMcs}));
        } catch(e) {}

        setMcs(dbMcs.length>0 ? dbMcs.map(mcFromDb) : INIT_MC);

        // Valider login og sæt loading=false
        const indlæsteBrugere0 = dbBrugere.length===0 ? INIT_USERS : dbBrugere.map(brugerFromDb);
        setBrugere(indlæsteBrugere0);
        setBruger(prev => {
          if(!prev) return null;
          const frisk = indlæsteBrugere0.find(b => String(b.id)===String(prev.id)||b.brugernavn===prev.brugernavn);
          if(!frisk) { localStorage.removeItem("mcfleet_bruger"); return null; }
          const {adgangskode:_pw,...uden}=frisk;
          localStorage.setItem("mcfleet_bruger",JSON.stringify(uden));
          return frisk;
        });
        clearTimeout(loadTimeout);
        setLoading(false);

        // ── FASE 2: Sekundær data + opgaver — alle parallelt i baggrunden ──
        const [dbFak, dbYd, dbLok, dbOpgRaw] = await Promise.all([
          db("fakturaer?order=id"),
          db("ydelser?order=id"),
          db("lokationer?order=id"),
          db("opgaver?order=id").catch(async () => {
            await new Promise(r=>setTimeout(r,3000));
            try { return await db("opgaver?order=id"); } catch(e2) {
              try { return await db("opgaver?order=id&limit=200"); } catch(e3) { return []; }
            }
          }),
        ]);

        const dbFakVar = dbFak;
        const dbYdVar = dbYd;
        const dbLokVar = dbLok;
        setFakturaer(dbFakVar.map(fakFromDb));
        setYdelser(dbYdVar.length>0 ? dbYdVar.map(ydFromDb) : INIT_YDELSER);
        setOpgaver(dbOpgRaw.map(opgFromDb));

        // Seed lokationer hvis DB er tom
        if(dbLokVar.length===0){
          const initLok = LOCATIONS.map(l=>({navn:l, transport:TRANSPORT_TAKSTER[l]??0}));
          for(const l of initLok){
            try{ await db("lokationer",{method:"POST",body:JSON.stringify(lokToDb(l)),prefer:"return=minimal"}); }
            catch(e){ console.error("Lok seed fejl:",e); }
          }
          setLokationer(initLok);
        } else {
          setLokationer(dbLokVar.map(lokFromDb));
        }
        // Seed brugere hvis DB er tom
        if(dbBrugere.length===0){
          await db("brugere",{method:"POST",body:JSON.stringify(INIT_USERS.map(brugerToDb))});
        }
        // Seed MC'er hvis DB er tom — send én ad gangen for at undgå timeout
        if(dbMcs.length===0){
          for(const mc of INIT_MC){
            try{
              await db("mcs",{method:"POST",body:JSON.stringify(mcToDb(mc)),prefer:"return=minimal"});
            }catch(e){ console.error("Seed fejl MC",mc.id,e); }
          }
          // Hent dem tilbage efter seed
          const seeded = await db("mcs?select=id,mc_nr,reg,stel,gps,syn,km,location,beskrivelse,thumb,lokations_log,km_log,foerste_reg,naeste_syn,noter,type&order=id");
          setMcs(seeded.map(mcFromDb));
        }
        // Seed ydelser hvis DB er tom
        if(dbYd.length===0){
          await db("ydelser",{method:"POST",body:JSON.stringify(INIT_YDELSER.map(ydToDb)),prefer:"return=minimal"});
        }

        // ── BACKFILL: generér manglende thumbnails i baggrunden (engangs pr. MC) ──
        // Kører kun for MC'er hvor thumb endnu er NULL. Når en MC har fået sat thumb
        // (en værdi eller ''), matcher den ikke længere og springes over ved næste load.
        (async () => {
          for(let batch=0; batch<60; batch++){
            let rows;
            try { rows = await db("mcs?select=id,foto&thumb=is.null&limit=40"); }
            catch(e){ return; } // thumb-kolonnen findes ikke endnu — migration mangler
            if(!rows || !rows.length) return;
            for(const r of rows){
              const t = r.foto ? await lavThumb(r.foto) : "";
              try {
                await db(`mcs?id=eq.${r.id}`,{method:"PATCH",body:JSON.stringify({thumb: t||""}),prefer:"return=minimal"});
                if(t) setMcs(p=>p.map(m=>String(m.id)===String(r.id)?{...m,thumb:t}:m));
              } catch(e){ return; } // stop ved fejl så vi ikke looper i det uendelige
            }
          }
        })();
      } catch(e){
        console.error("DB load fejl:",e);
        clearTimeout(loadTimeout);
        setLoading(false);
      }
      // Fase 2 fejl stopper ikke appen — loading er allerede false
    };
    load();
  },[]);

  const login=async(brugernavn,adgangskode)=>{
    // Brug lokale brugere hvis de er indlæst, ellers hent fra DB
    let alleBrugere = brugere;
    if(alleBrugere.length === 0) {
      try {
        const dbB = await db("brugere?order=id");
        alleBrugere = dbB.map(brugerFromDb);
        setBrugere(alleBrugere);
      } catch(e) { console.error("Login DB fejl:", e); }
    }
    const b = alleBrugere.find(b => b.brugernavn===brugernavn && b.adgangskode===adgangskode);
    if(b){
      setBruger(b);
      setLoginFejl("");
      try{
        const {adgangskode:_, ...bUdenKode} = b;
        localStorage.setItem("mcfleet_bruger", JSON.stringify(bUdenKode));
      }catch(e){}
    } else setLoginFejl("Forkert brugernavn eller adgangskode");
  };
  const logout=()=>{
    setBruger(null);
    setLoginFejl("");
    try{ localStorage.removeItem("mcfleet_bruger"); }catch(e){}
  };

  const isAdmin=bruger?.rolle==="admin";

  const notify=(msg,err)=>{setNote({msg,err});setTimeout(()=>setNote(null),2600);};

  const downloadBackup = async () => {
    notify("Henter backup...");
    try {
      const [dbMcs, dbFak, dbYd, dbOpg, dbLok, dbBrugere] = await Promise.all([
        db("mcs?order=id"),
        db("fakturaer?order=id"),
        db("ydelser?order=id"),
        db("opgaver?order=id"),
        db("lokationer?order=id"),
        db("brugere?order=id"),
      ]);
      const backup = {
        dato: new Date().toISOString(),
        mcs: dbMcs,
        fakturaer: dbFak,
        ydelser: dbYd,
        opgaver: dbOpg,
        lokationer: dbLok,
        brugere: dbBrugere.map(b => ({ ...b, adgangskode: "***" })),
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mcfleet_backup_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notify("Backup downloadet ✓");
    } catch (e) {
      notify("Backup fejl: " + e.message, true);
    }
  };

  const byLoc=useMemo(()=>{
    const m={};
    // Inkluder alle kendte lokationer + lokationer fra MC'er der ikke matcher (fx gamle navne fra DB)
    const allKnown=[...new Set([...lokationer.map(l=>l.navn),...mcs.map(mc=>mc.location).filter(Boolean)])];
    allKnown.forEach(l=>{m[l]=[];});
    mcs.forEach(mc=>{ if(mc.location) m[mc.location].push(mc); });
    // Sortér hver lokation efter mcNr stigende
    Object.keys(m).forEach(loc => m[loc].sort((a,b) => Number(a.mcNr)-Number(b.mcNr)));
    return m;
  },[mcs,lokationer]);

  const filteredByLoc=useMemo(()=>{
    const q=search.toLowerCase().replace(/\s+/g,"");
    const out={};
    const alleLocs=[...new Set([...lokationer.map(l=>l.navn),...Object.keys(byLoc)])];
    alleLocs.forEach(loc=>{
      let list=byLoc[loc]||[];
      if(filterLoc!=="Alle"&&filterLoc!==loc){out[loc]=[];return;}
      if(filterType!=="Alle") list=list.filter(mc=>(mc.type||"MC")===filterType);
      if(q) list=list.filter(mc=>mc.reg.toLowerCase().replace(/\s+/g,"").includes(q)||mc.stel.toLowerCase().replace(/\s+/g,"").includes(q)||(mc.gps||"").toLowerCase().replace(/\s+/g,"").includes(q)||String(mc.mcNr).includes(q)||(mc.beskrivelse||"").toLowerCase().replace(/\s+/g,"").includes(q));
      out[loc]=[...list].sort((a,b)=>Number(a.mcNr)-Number(b.mcNr));
    });
    return out;
  },[byLoc,search,filterLoc,filterType]);

  const harGPS = mc => !!(mc.gps && mc.gps.trim().length > 0);

  const stats=useMemo(()=>{
    let aktive=mcs.filter(m=>!erSolgt(m));
    if(filterType!=="Alle") aktive=aktive.filter(m=>(m.type||"MC")===filterType);
    return {
      total:aktive.length,
      ov:aktive.filter(m=>synStatus(m)==="overskredet").length,
      uGPS:aktive.filter(m=>!harGPS(m)).length,
      fakTotal:fakturaer.reduce((s,f)=>s+f.total,0),
    };
  },[mcs,fakturaer,filterType]);

  const planData=useMemo(()=>{
    const EKSKLUDER=["Lager / Depot","Solgte MC'er","MC til salg"];
    return LOCATIONS
      .filter(navn=>!EKSKLUDER.includes(navn))
      .map(navn=>{
        const fakI=fakturaer.filter(f=>f.afdeling===navn);
        const seneste=fakI.length>0
          ? fakI.reduce((a,b)=>a.dato>b.dato?a:b).dato
          : null;
        const dage=seneste
          ? Math.floor((Date.now()-new Date(seneste))/86400000)
          : null;
        return {navn,seneste,dage};
      })
      .sort((a,b)=>(b.dage??Infinity)-(a.dage??Infinity));
  },[fakturaer]);

  // ── URL HASH NAVIGATION ──
  // Hash-format: #oversigt | #fakturaer | #opgaver | #administration | #brugere
  //              #mc-{id}  | #mc-{id}-rediger | #mc-{id}-faktura | #mc-{id}-faktura-{fakId}

  const buildHash = (state) => {
    const { nav, mcModal, editMc, nyFak, fakDetail } = state;
    if (fakDetail && mcModal) return `#mc-${mcModal.id}-faktura-${fakDetail.id}`;
    if (fakDetail && nav === "fakturaer") return `#fakturaer`;
    if (nyFak && mcModal)     return `#mc-${mcModal.id}-faktura`;
    if (editMc && mcModal)    return `#mc-${mcModal.id}-rediger`;
    if (mcModal)              return `#mc-${mcModal.id}`;
    return `#${nav || "oversigt"}`;
  };

  const pushNav = (state) => {
    const hash = buildHash(state);
    window.history.pushState(state, "", hash);
  };

  const replaceNav = (state) => {
    const hash = buildHash(state);
    window.history.replaceState(state, "", hash);
  };

  // Opret opgave direkte fra MC
  const opretOpgaveFraMc = (mc, beskrivelse, senestUdfoert, foto) => {
    const titel = `${mc.reg} — ${mc.beskrivelse}`;
    const gemMedFoto = (fotoData) => {
      const ny = {
        id: Date.now(), titel, beskrivelse: (beskrivelse||"").trim(),
        lokation: mc.location||"", senestUdfoert, oprettet: todayStr,
        udfoert: false, udfoertDato: null,
        mcId: mc.id, mcReg: mc.reg, foto: fotoData||"",
      };
      // Optimistisk update — UI opdateres straks
      setOpgaver(p=>[ny,...p]);
      // DB-kald i baggrunden
      db("opgaver",{method:"POST",body:JSON.stringify(opgToDb(ny)),prefer:"return=minimal"})
        .catch(e=>console.error("DB opgave fejl:",e));
      notify("Opgave oprettet ✓");
    };
    // Komprimer billede hvis det er stort
    if(foto && foto.length > 200000) {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        const max = 800;
        const ratio = Math.min(max/img.width, max/img.height, 1);
        c.width = Math.round(img.width*ratio);
        c.height = Math.round(img.height*ratio);
        c.getContext("2d").drawImage(img,0,0,c.width,c.height);
        gemMedFoto(c.toDataURL("image/jpeg",0.7));
      };
      img.src = foto;
    } else {
      gemMedFoto(foto);
    }
  };

  const markerOpgaveUdfoert = (id) => {
    const dato = todayStr;
    setOpgaver(p=>p.map(o=>o.id===id?{...o,udfoert:true,udfoertDato:dato}:o));
    db(`opgaver?id=eq.${id}`,{method:"PATCH",body:JSON.stringify({udfoert:true,udfoert_dato:dato}),prefer:"return=minimal"}).catch(e=>console.error("DB:",e));
  };

  const goNav = (id) => {
    setNav(id); setMcModal(null); setNyFak(null); setFakDetail(null); setEditMc(null); setSidebarOpen(false);
    pushNav({ nav: id, mcModal: null, editMc: null, nyFak: null, fakDetail: null });
  };

  // Lyt på tilbage/frem-knap og gendan state
  React.useEffect(() => {
    // Ved opstart: læs hash og naviger derhen når data er klar
    const applyHash = (hash) => {
      if (!hash || hash === "#" || hash === "#oversigt") {
        setNav("oversigt"); setMcModal(null); setEditMc(null); setNyFak(null); setFakDetail(null);
        return;
      }
      const h = hash.replace("#", "");
      // #fakturaer, #opgaver, #administration, #brugere
      if (["fakturaer","opgaver","administration","brugere","slutsedler"].includes(h)) {
        setNav(h); setMcModal(null); setEditMc(null); setNyFak(null); setFakDetail(null);
        return;
      }
      // #mc-{id}... varianter
      const mcMatch = h.match(/^mc-(\d+)(.*)$/);
      if (mcMatch) {
        const mcId = Number(mcMatch[1]);
        const rest = mcMatch[2];
        // Vent til mcs er indlæst
        setNav("oversigt");
        const mc = mcs.find(m => m.id === mcId);
        if (!mc) return; // data ikke klar endnu — onLoadHash håndterer det
        if (rest === "-rediger") {
          setMcModal(mc); setEditMc({...mc}); setNyFak(null); setFakDetail(null);
        } else if (rest === "-faktura") {
          setMcModal(mc); setEditMc(null); setNyFak({mcId:mc.id,linjer:[],dato:todayStr,note:"",titel:""}); setFakDetail(null);
        } else if (rest.startsWith("-faktura-")) {
          const fakId = rest.replace("-faktura-","");
          const fak = fakturaer.find(f => String(f.id) === fakId);
          setMcModal(mc); setEditMc(null); setNyFak(null); setFakDetail(fak||null);
        } else {
          setMcModal(mc); setEditMc(null); setNyFak(null); setFakDetail(null);
        }
      }
    };

    // Sæt initial history entry med nuværende hash (eller oversigt)
    const initHash = window.location.hash || "#oversigt";
    const TOP_LEVEL_NAVS = ["fakturaer","opgaver","administration","brugere","slutsedler"];
    const initNav = TOP_LEVEL_NAVS.includes(initHash.replace("#","")) ? initHash.replace("#","") : "oversigt";
    window.history.replaceState(
      { nav: initNav, mcModal: null, editMc: null, nyFak: null, fakDetail: null },
      "", initHash
    );

    // Anvend hash ved opstart når data er indlæst
    if (mcs.length > 0) {
      applyHash(window.location.hash);
    }

    const onPop = (e) => {
      const s = e.state;
      if (s) {
        // Gendan fra pushState state-objekt
        setNav(s.nav || "oversigt");
        // Gendan fuld MC objekt fra id (pushState gemmer kun {id})
        const modalId = s.mcModal?.id;
        setMcModal(modalId ? (mcs.find(m=>String(m.id)===String(modalId))||s.mcModal) : null);
        const editId = s.editMc?.id;
        setEditMc(editId ? (mcs.find(m=>String(m.id)===String(editId))||null) : null);
        setNyFak(s.nyFak || null);
        setFakDetail(s.fakDetail || null);
        setSidebarOpen(false);
      } else {
        // Fallback: læs hash direkte
        applyHash(window.location.hash);
      }
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [mcs, fakturaer]);
  const saveMc=async()=>{
    const {_erNy,...rest}=editMc;
    const nyKm=Number(rest.km)||0;
    const opdateret={...rest,km:nyKm,mcNr:Number(rest.mcNr)||0};
    let endelig;
    if(!_erNy){
      const gammel=mcs.find(m=>m.id===opdateret.id);
      const gammelKm=gammel?.km??0;
      let kmLog=[...(gammel?.kmLog||[])];
      if(nyKm!==gammelKm){
        const diff=kmLog.length===0?null:nyKm-gammelKm;
        kmLog.push({dato:todayStr,km:nyKm,diff});
      }
      // Opdater lokationsLog hvis lokation er ændret — samme mønster som kmLog
      let lokationsLog=(gammel?.lokationsLog||[]).map(e=>({...e}));
      if(opdateret.location && opdateret.location!==(gammel?.location||"")){
        // Luk eksisterende åben post
        if(lokationsLog.length>0&&lokationsLog[lokationsLog.length-1].til===null){
          lokationsLog[lokationsLog.length-1]={...lokationsLog[lokationsLog.length-1],til:todayStr};
        }
        // Tilføj ny post
        lokationsLog.push({lokation:opdateret.location,fra:todayStr,til:null});
      }
      endelig={...gammel,...opdateret,kmLog,lokationsLog};
      setMcs(p=>p.map(m=>String(m.id)===String(endelig.id)?endelig:m));
      // Rør IKKE foto/fotos/thumb her — de styres kun af onFotoUpload/backfill.
      // (Vigtigt nu hvor foto hentes lazy: en metadata-rettelse må ikke slette billedet.)
      const {foto:_f, fotos:_fs, thumb:_t, ...patchBody} = mcToDb(endelig);
      try{
        await db(`mcs?id=eq.${endelig.id}`,{method:"PATCH",body:JSON.stringify(patchBody),prefer:"return=minimal"});
      } catch(e){
        // Hvis 500: foerste_reg kolonnen mangler måske — prøv uden den
        if(e.message?.includes("500")) {
          try {
            const {foerste_reg:_fr, ...udenFoerste} = patchBody;
            await db(`mcs?id=eq.${endelig.id}`,{method:"PATCH",body:JSON.stringify(udenFoerste),prefer:"return=minimal"});
            notify("Gem OK — kør SQL: ALTER TABLE mcs ADD COLUMN foerste_reg TEXT DEFAULT ''",true);
          } catch(e2){ notify("DB fejl: "+e2.message,true); }
        } else { notify("DB fejl: "+e.message,true); }
      }
    } else {
      endelig={...opdateret,
        lokationsLog:[{lokation:opdateret.location,fra:todayStr,til:null}],
        kmLog:nyKm>0?[{dato:todayStr,km:nyKm,diff:null}]:[],
      };
      setMcs(p=>[...p,endelig]);
      // thumb udelades ved oprettelse — sættes af onFotoUpload når et billede tilføjes
      const {thumb:_nt, ...nyBody} = mcToDb(endelig);
      try{ await db("mcs",{method:"POST",body:JSON.stringify(nyBody),prefer:"return=minimal"}); }
      catch(e){ notify("DB fejl: "+e.message,true); }
    }
    notify(_erNy?"MC oprettet ✓":"MC opdateret ✓");
    setEditMc(null);
    if(mcModal&&!_erNy) setMcModal({...endelig});
  };
  const onFotoUpload=async(mcId,dataUrl,fotosArr)=>{
    // fotosArr = alle billeder inkl. det nye. dataUrl = primær (første) billede
    const nyFotos = fotosArr || (dataUrl ? [dataUrl] : []);
    const primærFoto = nyFotos[0] || "";
    // Generér lille thumbnail af primærbilledet til oversigten
    const thumb = primærFoto ? await lavThumb(primærFoto) : "";
    setMcs(p=>p.map(m=>m.id===mcId?{...m,foto:primærFoto,fotos:nyFotos,thumb}:m));
    if(mcModal?.id===mcId) setMcModal(p=>({...p,foto:primærFoto,fotos:nyFotos,thumb}));
    try{
      await db(`mcs?id=eq.${mcId}`,{method:"PATCH",body:JSON.stringify({foto:primærFoto,fotos:nyFotos,thumb}),prefer:"return=minimal"});
    }
    catch(e){
      console.error("Foto DB fejl:",e);
      // Hvis thumb-kolonnen mangler (migration ikke kørt): prøv uden thumb
      if(e.message?.includes("thumb")||e.message?.includes("400")||e.message?.includes("PGRST")){
        try{ await db(`mcs?id=eq.${mcId}`,{method:"PATCH",body:JSON.stringify({foto:primærFoto,fotos:nyFotos}),prefer:"return=minimal"}); }
        catch(e2){ console.error("Foto DB fejl (uden thumb):",e2); }
      }
    }
    notify(nyFotos.length>1?`${nyFotos.length} billeder ✓`:"Billede uploadet ✓");
  };

  const onUpdateKm=async(mcId, nytKm, erService=false)=>{
    if(isNaN(nytKm)||nytKm<0) return;
    const mc = mcs.find(m=>m.id===mcId);
    if(!mc) return;
    const gammelKm = mc.km||0;
    const diff = gammelKm===0 ? null : nytKm - gammelKm;
    const entry = {dato:todayStr, km:nytKm, diff, ...(erService&&{service:true})};
    const kmLog = [...(mc.kmLog||[]), entry];
    const opdateret = {...mc, km:nytKm, kmLog};
    setMcs(p=>p.map(m=>m.id===mcId?opdateret:m));
    if(mcModal?.id===mcId) setMcModal(opdateret);
    try{
      await db(`mcs?id=eq.${mcId}`,{method:"PATCH",body:JSON.stringify({km:nytKm, km_log:kmLog}),prefer:"return=minimal"});
      notify("Kilometertal opdateret ✓");
    } catch(e){ notify("DB fejl: "+e.message,true); }
  };
  const onUpdateNoter=async(mcId, tekst)=>{
    const mc = mcs.find(m=>m.id===mcId);
    if(!mc) return;
    const opdateret = {...mc, noter:tekst};
    setMcs(p=>p.map(m=>m.id===mcId?opdateret:m));
    if(mcModal?.id===mcId) setMcModal(opdateret);
    try{
      await db(`mcs?id=eq.${mcId}`,{method:"PATCH",body:JSON.stringify({noter:tekst}),prefer:"return=minimal"});
      notify("Note gemt ✓");
    } catch(e){ notify("DB fejl: "+e.message,true); }
  };
  const doMove=async(loc)=>{
    const mc=mcs.find(m=>String(m.id)===String(moveModal));
    if(!mc){notify(`Fejl: MC ikke fundet (id=${moveModal})`,true);setMoveModal(null);return;}
    if(mc.location===loc){notify("MC er allerede på denne lokation",true);return;}
    const log=(mc.lokationsLog||[]).map(e=>({...e}));
    if(log.length>0&&log[log.length-1].til===null){
      log[log.length-1]={...log[log.length-1],til:todayStr};
    }
    log.push({lokation:loc,fra:todayStr,til:null});
    const updated={...mc,location:loc,lokationsLog:log};
    const payload=mcToDb(updated);
    setMcs(p=>p.map(m=>String(m.id)===String(updated.id)?updated:m));
    setMcModal(updated);
    try{
      await db(`mcs?id=eq.${mc.id}`,{method:"PATCH",body:JSON.stringify(payload),prefer:"return=minimal"});
    }catch(e){
      notify("DB fejl: "+e.message,true);
    }
    notify(`Flyttet til ${loc} ✓`);
    setMoveModal(null);
  };

  const addLinje=(yId)=>{const y=ydelser.find(y=>y.id===yId);if(!y)return;setNyFak(f=>{const e=f.linjer.find(l=>l.yId===yId);if(e)return{...f,linjer:f.linjer.map(l=>l.yId===yId?{...l,antal:l.antal+1}:l)};return{...f,linjer:[...f.linjer,{yId,nr:y.nr,navn:y.navn,pris:y.pris,antal:1}]};});};
  const removeLinje=(yId)=>setNyFak(f=>({...f,linjer:f.linjer.filter(l=>l.yId!==yId)}));
  const setAntal=(yId,v)=>setNyFak(f=>({...f,linjer:f.linjer.map(l=>l.yId===yId?{...l,antal:Math.max(1,Number(v))}:l)}));
  const setPrisL=(yId,v)=>setNyFak(f=>({...f,linjer:f.linjer.map(l=>l.yId===yId?{...l,pris:Number(v)}:l)}));
  const fakTotal=(linjer)=>linjer.reduce((s,l)=>s+l.antal*l.pris,0);
  const gemFak=async()=>{
    if(!nyFak.titel?.trim()){notify("Udfyld reparationstitel",true);return;}
    if(!nyFak.note?.trim()){notify("Udfyld reparationsbeskrivelse",true);return;}
    if(!nyFak.linjer.length){notify("Tilføj mindst én linje",true);return;}
    const mc=mcs.find(m=>m.id===nyFak.mcId);
    if(!mc){notify("MC ikke fundet",true);return;}
    const total=fakTotal(nyFak.linjer);
    if(editFakId){
      const gammel=fakturaer.find(f=>f.id===editFakId);
      if(!gammel){notify("Faktura ikke fundet",true);return;}
      const opdateret={...gammel,dato:nyFak.dato,note:nyFak.note||"",titel:nyFak.titel||"",linjer:nyFak.linjer,total};
      setFakturaer(p=>p.map(f=>f.id===editFakId?opdateret:f));
      setFakDetail(opdateret);
      setNyFak(null); setEditFakId(null);
      try{ await db(`fakturaer?id=eq.${editFakId}`,{method:"PATCH",body:JSON.stringify(fakToDb(opdateret)),prefer:"return=minimal"}); }
      catch(e){ notify("DB fejl: "+e.message,true); }
      notify("Faktura opdateret ✓");
    } else {
      const f={id:nextFakNr(fakturaer),mcId:nyFak.mcId,mcReg:mc.reg,afdeling:mc.location||"",dato:nyFak.dato,note:nyFak.note||"",titel:nyFak.titel||"",linjer:nyFak.linjer,total,faktureret:false,km:nyFak.km||0};
      setFakturaer(p=>[f,...p]);
      setNyFak(null); setEditFakId(null);
      setFakDetail(f);
      try{ await db("fakturaer",{method:"POST",body:JSON.stringify(fakToDb(f)),prefer:"return=minimal"}); }
      catch(e){ notify("DB fejl: "+e.message,true); }
      // Registrer service-km hvis "Olie og Filter ny" er inkluderet, ellers opdater km normalt
      const harService = f.linjer.some(l => l.navn === "Olie og Filter ny");
      const kmFraFak = f.km || mc.km || 0;
      if(harService) {
        await onUpdateKm(f.mcId, kmFraFak, true);
      } else if(f.km && f.km > (mc.km||0)) {
        await onUpdateKm(f.mcId, f.km, false);
      }
      notify(`${f.id} oprettet ✓`);
    }
  };
  const startRedigerFak=(f)=>{setNyFak({mcId:f.mcId,linjer:[...f.linjer],dato:f.dato,note:f.note||"",titel:f.titel||""});setEditFakId(f.id);setFakDetail(null);};
  const sætFaktureret=async(fakId,værdi)=>{
    setFakturaer(p=>p.map(f=>f.id===fakId?{...f,faktureret:værdi}:f));
    if(fakDetail?.id===fakId) setFakDetail(p=>({...p,faktureret:værdi}));
    try{ await db(`fakturaer?id=eq.${fakId}`,{method:"PATCH",body:JSON.stringify({faktureret:værdi}),prefer:"return=minimal"}); }
    catch(e){ notify("DB fejl: "+e.message,true); }
    notify(værdi?"Markeret som faktureret ✓":"Markering fjernet");
  };

  // ── Lokation CRUD ──
  const opretLokation=async()=>{
    const navn=nyLok.navn.trim();
    if(!navn){notify("Skriv et navn",true);return;}
    if(lokationer.some(l=>l.navn===navn)){notify("Lokationen findes allerede",true);return;}
    const ny={navn, transport:nyLok.transport||0, dimension:nyLok.dimension||""};
    setLokationer(p=>[...p,ny]);
    setNyLok({navn:"",transport:0,dimension:""});
    try{ await db("lokationer",{method:"POST",body:JSON.stringify(lokToDb(ny)),prefer:"return=minimal"}); }
    catch(e){ notify("DB fejl: "+e.message,true); }
    notify("Lokation oprettet ✓");
  };
  const gemRedigerLokation=async()=>{
    const navn=editLok.navn.trim();
    if(!navn){notify("Skriv et navn",true);return;}
    if(lokationer.some((l,i)=>l.navn===navn&&i!==editLok.idx)){notify("Navn er taget",true);return;}
    const nyListe=[...lokationer];
    const gammeltNavn=nyListe[editLok.idx].navn;
    const opdateretLok={navn, transport:editLok.transport||0, dimension:editLok.dimension||""};
    nyListe[editLok.idx]=opdateretLok;
    setLokationer(nyListe);
    // Opdater lokationer DB
    try{
      await db(`lokationer?navn=eq.${encodeURIComponent(gammeltNavn)}`,{
        method:"PATCH", body:JSON.stringify({navn, transport:opdateretLok.transport, dimension:opdateretLok.dimension||""}), prefer:"return=minimal"
      });
    }catch(e){ notify("DB fejl: "+e.message,true); }
    if(gammeltNavn!==navn){
      setMcs(p=>p.map(m=>m.location===gammeltNavn?{...m,location:navn}:m));
      try{
        await db(`mcs?location=eq.${encodeURIComponent(gammeltNavn)}`,{
          method:"PATCH", body:JSON.stringify({location:navn}), prefer:"return=minimal"
        });
      }catch(e){ notify("DB fejl: "+e.message,true); }
    }
    notify("Lokation opdateret ✓");
    setEditLok(null);
  };

  const gemYdelse=async()=>{
    if(!nyYdelse.nr||!nyYdelse.navn||!nyYdelse.pris){notify("Udfyld alle felter",true);return;}
    if(ydelser.find(y=>y.nr===nyYdelse.nr)){notify("Nummer findes allerede",true);return;}
    const ny={id:nyYdelse.nr,...nyYdelse,pris:Number(nyYdelse.pris)};
    setYdelser(p=>[...p,ny]);
    setNyYdelse({nr:"",navn:"",pris:""});
    try{ await db("ydelser",{method:"POST",body:JSON.stringify(ydToDb(ny)),prefer:"return=minimal"}); }
    catch(e){ notify("DB fejl: "+e.message,true); }
    notify("Ydelse oprettet");
  };
  const saveYdelse=async()=>{
    const ny={...editYdelse,pris:Number(editYdelse.pris)};
    setYdelser(p=>p.map(y=>y.id===ny.id?ny:y));
    setEditYdelse(null);
    try{ await db(`ydelser?id=eq.${ny.id}`,{method:"PATCH",body:JSON.stringify(ydToDb(ny)),prefer:"return=minimal"}); }
    catch(e){ notify("DB fejl: "+e.message,true); }
    notify("Opdateret");
  };
  const delYdelse=async(id)=>{
    setYdelser(p=>p.filter(y=>y.id!==id));
    try{ await db(`ydelser?id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}); }
    catch(e){ notify("DB fejl: "+e.message,true); }
    notify("Slettet");
  };

  const navItems=[
    {id:"oversigt",icon:"🏍",label:"Oversigt"},
    {id:"opgaver",icon:"📋",label:"Opgaver"},
    {id:"planlægning",icon:"📅",label:"Planlægning"},
    {id:"fakturaer",icon:"🧾",label:"Fakturaer"},
    ...(isAdmin?[{id:"slutsedler",icon:"📄",label:"Slutsedler"}]:[]),
    {id:"administration",icon:"⚙️",label:"Administration"},
    ...(isAdmin?[{id:"brugere",icon:"👥",label:"Brugere"}]:[]),
  ];

  const showingSubpage = mcModal||editMc||nyFak||fakDetail;

  if(loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100dvh",background:"#111",flexDirection:"column",gap:16}}>
      <div style={{width:44,height:44,border:"4px solid #333",borderTop:"4px solid #cc0000",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{color:"#888",fontSize:14}}>Henter data...</div>
    </div>
  );
  if(!bruger) return <LoginScreen onLogin={login} fejl={loginFejl}/>;

  return (
    <div style={{display:"flex",height:"100dvh",background:"#111",color:"#fff",fontFamily:"'Segoe UI',system-ui,sans-serif",overflow:"hidden",position:"relative"}}>
      <style>{`
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:#333;border-radius:2px;}
        .mc-card:hover{border-color:#cc0000!important;}
        .mc-card:active{opacity:0.85;}
        .tap:active{opacity:0.75;}
        textarea{font-family:inherit;}
        @media(max-width:640px){
          .desktop-only{display:none!important;}
          .mobile-grid{grid-template-columns:1fr 1fr!important;}
          .detail-grid{grid-template-columns:1fr!important;}
          .fak-grid{grid-template-columns:1fr!important;}
        }
        @media(min-width:641px){
          .mobile-only{display:none!important;}
          .sidebar{transform:translateX(0)!important;}
        }
      `}</style>

      {/* Notification */}
      {note&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:note.err?"#cc0000":"#22c55e",color:"#fff",padding:"11px 24px",borderRadius:10,fontWeight:700,fontSize:14,boxShadow:"0 4px 24px rgba(0,0,0,.6)",whiteSpace:"nowrap"}}>{note.msg}</div>}

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen&&<div className="mobile-only" onClick={()=>setSidebarOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:199}}/>}

      {/* ── SIDEBAR ── */}
      <div className="sidebar" style={{position:"fixed",top:0,left:0,height:"100%",width:220,background:"#161616",borderRight:"1px solid #2a2a2a",display:"flex",flexDirection:"column",zIndex:200,transform:sidebarOpen?"translateX(0)":"translateX(-100%)",transition:"transform 0.25s ease"}}>
        <div style={{padding:"20px 18px 14px",borderBottom:"1px solid #2a2a2a"}}>
          {brandLogoOk ? (
            <img src="/lisbeth-koreskole-logo.png" alt="Lisbeth's Køreskole" onError={()=>setBrandLogoOk(false)}
              style={{display:"block",width:"100%",height:"auto",maxHeight:56,objectFit:"contain",objectPosition:"left center"}}/>
          ) : (
            <div style={{fontSize:15,fontWeight:700}}>Lisbeth's Køreskole</div>
          )}
          <div style={{width:36,height:3,background:"#cc0000",marginTop:8,borderRadius:2}}/>
        </div>
        <nav style={{flex:1,padding:"10px 8px",display:"flex",flexDirection:"column",gap:2}}>
          {navItems.map(n=>(
            <div key={n.id} onClick={()=>goNav(n.id)} className="tap"
              style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:8,cursor:"pointer",background:nav===n.id?"#cc0000":"transparent",color:nav===n.id?"#fff":"#bbb",fontWeight:nav===n.id?700:400,fontSize:14,transition:"background 0.12s"}}>
              <span>{n.icon}</span>{n.label}
            </div>
          ))}
        </nav>
        <div style={{padding:"14px 18px",borderTop:"1px solid #2a2a2a",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:bruger.rolle==="admin"?"#cc0000":"#333",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,color:"#fff",flexShrink:0}}>
            {bruger.navn.charAt(0).toUpperCase()}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bruger.navn}</div>
            <div style={{fontSize:11,color:bruger.rolle==="admin"?"#f87171":"#60a5fa"}}>{bruger.rolle==="admin"?"Admin":"Bruger"}</div>
          </div>
          {isAdmin&&<button onClick={downloadBackup} title="Download backup" className="tap" style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:16,padding:"4px",lineHeight:1}}>💾</button>}
          <button onClick={logout} title="Log ud" style={{background:"none",border:"none",color:"#666",cursor:"pointer",fontSize:18,padding:"4px",lineHeight:1}} className="tap">⏻</button>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",marginLeft:0,height:"100dvh",overflow:"hidden"}}>

        {/* Top bar (mobile) */}
        <div className="mobile-only" style={{background:"#161616",borderBottom:"1px solid #2a2a2a",padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <button onClick={()=>setSidebarOpen(true)} style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer",padding:"2px 6px",lineHeight:1}}>☰</button>
          {brandLogoOk ? (
            <img src="/lisbeth-koreskole-logo.png" alt="" onError={()=>setBrandLogoOk(false)}
              style={{height:30,maxWidth:170,width:"auto",objectFit:"contain",objectPosition:"left center",flex:1}}/>
          ) : (
            <span style={{fontWeight:700,fontSize:15,flex:1}}>Lisbeth's Køreskole</span>
          )}
          <span style={{fontSize:12,color:bruger.rolle==="admin"?"#f87171":"#60a5fa",fontWeight:600}}>{bruger.navn}</span>
          <button onClick={logout} title="Log ud" style={{background:"none",border:"none",color:"#888",cursor:"pointer",fontSize:18,padding:"2px",lineHeight:1}}>⏻</button>
        </div>

        {/* Desktop sidebar spacer */}
        <div className="desktop-only" style={{position:"absolute",left:220,top:0,bottom:0,width:1}}/>

        {/* Scrollable content */}
        <div style={{flex:1,overflow:"auto",background:"#cc0000",paddingLeft:0}} id="main-scroll">
          <style>{`@media(min-width:641px){#main-scroll{margin-left:220px;}}`}</style>
          <div style={{padding:"20px 16px 32px",maxWidth:1200,margin:"0 auto"}}>

            {/* ── OVERSIGT ── */}
            {nav==="oversigt"&&!showingSubpage&&(
              <>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,gap:10,flexWrap:"wrap"}}>
                  <h1 style={{margin:0,fontSize:22,fontWeight:700,color:"#fff"}}>Oversigt</h1>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {stats.ov>0&&<div onClick={()=>setSynModal(true)} style={{background:"#a80000",borderRadius:6,padding:"5px 12px",fontSize:12,color:"#ffaaaa",fontWeight:600,cursor:"pointer",userSelect:"none"}} title="Klik for at se liste">⚠ {stats.ov} syn overskredet</div>}
                    {stats.uGPS>0&&<div onClick={()=>setGpsModal(true)} style={{background:"#1a3a1a",borderRadius:6,padding:"5px 12px",fontSize:12,color:"#86efac",fontWeight:600,cursor:"pointer",userSelect:"none"}} title="Klik for at se liste">📡 {stats.uGPS} uden GPS</div>}
                    <div style={{background:"#a80000",borderRadius:6,padding:"5px 12px",fontSize:12,color:"#ffdddd",fontWeight:600}}>{stats.total} {filterType==="Alle"?"køretøjer":filterType==="MC"?"MC'er":filterType==="Bil"?"biler":"trailere"}</div>
                  </div>
                </div>

                {/* Type filter */}
                <div style={{display:"flex",gap:4,marginBottom:10}}>
                  {["Alle","MC","Bil","Trailer"].map(t=>(
                    <button key={t} onClick={()=>setFilterType(t)}
                      style={{padding:"6px 14px",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer",border:filterType===t?"1px solid #cc0000":"1px solid #444",
                        background:filterType===t?"#cc0000":"#1a1a1a",color:filterType===t?"#fff":"#aaa",transition:"all 0.15s"}}>
                      {t==="MC"?"🏍 MC":t==="Bil"?"🚗 Bil":t==="Trailer"?"🚛 Trailer":"Alle"}
                    </button>
                  ))}
                </div>

                {/* Search row */}
                <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
                  <div style={{position:"relative",flex:"1 1 180px",minWidth:0}}>
                    <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"#666",fontSize:13}}>🔍</span>
                    <input placeholder="Søg reg. nr., beskrivelse..." value={search} onChange={e=>setSearch(e.target.value)}
                      style={{...inp,paddingLeft:34,paddingRight:search?32:12,background:"#1e1e1e",border:"1px solid #333",borderRadius:8,height:40,fontSize:13}}/>
                    {search&&(
                      <button onClick={()=>setSearch("")}
                        style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#888",fontSize:16,cursor:"pointer",padding:"2px 4px",lineHeight:1}}>✕</button>
                    )}
                  </div>
                  <select value={filterLoc} onChange={e=>setFilterLoc(e.target.value)}
                    style={{...inp,width:"auto",flex:"0 0 auto",height:40,background:"#1e1e1e",border:"1px solid #333",fontSize:13,padding:"0 12px"}}>
                    <option value="Alle">Alle</option>
                    {[...lokationer.map(l=>l.navn)]
                      .sort((a,b)=>{
                        const NEDERST=["Solgte MC\'er","MC til salg","Lager / Depot"];
                        const aLav=NEDERST.includes(a),bLav=NEDERST.includes(b);
                        if(aLav&&!bLav) return 1; if(!aLav&&bLav) return -1;
                        return a.localeCompare(b,"da");
                      })
                      .map(l=><option key={l}>{l}</option>)}
                  </select>
                  <button onClick={()=>setPladeScanner(true)} style={{background:"#1a1a1a",border:"1px solid #444",color:"#fff",borderRadius:8,height:40,padding:"0 14px",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap",fontWeight:700}} title="Scan nummerplade">📷 Scan plade</button>
                  <button style={{...btnRed,height:40,padding:"0 14px",fontSize:13}} onClick={()=>{const n={id:Date.now()+(Math.random()*1000|0),mcNr:"",reg:"",stel:"",gps:"",syn:todayStr,km:0,location:lokationer[0]?.navn||LOCATIONS[0],beskrivelse:"",type:filterType!=="Alle"?filterType:"MC",_erNy:true};setEditMc(n);}}>+ Opret</button>
                </div>

                {/* Groups */}
                <div style={{display:"flex",flexDirection:"column",gap:20}}>
                  {[...new Set([...lokationer.map(l=>l.navn),...Object.keys(filteredByLoc)])]
                  .sort((a,b)=>{
                    const NEDERST=["Solgte MC\'er","MC til salg","Lager / Depot"];
                    const aLav=NEDERST.includes(a), bLav=NEDERST.includes(b);
                    if(aLav&&!bLav) return 1;
                    if(!aLav&&bLav) return -1;
                    return a.localeCompare(b,"da");
                  })
                  .map(loc=>{
                    const list=filteredByLoc[loc]||[];
                    if(!list.length&&(search||filterLoc!=="Alle")) return null;
                    return (
                      <div key={loc}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                          <h2 style={{margin:0,fontSize:16,fontWeight:700,color:"#fff"}}>{loc} — {list.length}</h2>
                        </div>
                        {list.length===0?(
                          <div style={{background:"#1a1a1a44",borderRadius:8,padding:"14px 16px",color:"#ffffff88",fontSize:13}}>{filterType==="Bil"?"Ingen biler":filterType==="Trailer"?"Ingen trailere":"Ingen MC'er"}</div>
                        ):(
                          <div className="mobile-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
                            {list.map(mc=>{
                              const st=synStatus(mc);
                              return (
                                <div key={mc.id} className="mc-card tap" onClick={()=>{setMcModal(mc);pushNav({nav:"oversigt",mcModal:mc,editMc:null,nyFak:null,fakDetail:null});}}
                                  style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",cursor:"pointer",overflow:"hidden",position:"relative",transition:"border-color 0.15s"}}>
                                  <div style={{position:"absolute",top:8,right:8,width:11,height:11,borderRadius:"50%",background:SC[st],boxShadow:`0 0 5px ${SC[st]}`}}/>
                                  {harGPS(mc)&&<div style={{position:"absolute",top:6,right:24,fontSize:12,lineHeight:1}} title={`GPS: ${mc.gps}`}>📡</div>}
                                  {(mc.type||"MC")!=="MC"&&<div style={{position:"absolute",top:6,left:6,fontSize:9,background:"#333",color:"#ddd",padding:"1px 6px",borderRadius:4,fontWeight:700}}>{mc.type==="Bil"?"🚗 Bil":"🚛 Trailer"}</div>}
                                  <div style={{padding:"10px 10px 6px",fontSize:11,lineHeight:1.75,color:"#ccc"}}>
                                    <div><span style={{color:"#666"}}>{(mc.type||"MC")==="MC"?"MC":"Nr"}: </span><strong style={{color:"#fff"}}>{mc.mcNr}</strong></div>
                                    <div><span style={{color:"#666"}}>Reg.nr: </span><strong style={{color:"#fff"}}>{mc.reg}</strong></div>
                                    <div style={{fontSize:10,color:"#888"}}>{mc.gps}</div>
                                    <div style={{fontSize:10,color:"#aaa",fontWeight:600,marginTop:2}}>{mc.beskrivelse}</div>
                                  </div>
                                  <div style={{background:"#111",display:"flex",alignItems:"center",justifyContent:"center",padding:"4px 0"}}>
                                    {(()=>{const bild=mc.thumb||mc.foto;return <img src={bild||MC_SVG} alt="" loading="lazy" style={{width:"100%",maxWidth:150,height:70,objectFit:bild?"cover":"contain",borderRadius:bild?6:0}}/>;})()}
                                  </div>
                                  <div style={{background:"#111",padding:"5px 8px"}}>
                                    <div style={{background:"#222",borderRadius:4,height:16,overflow:"hidden",position:"relative"}}>
                                      <div style={{position:"absolute",inset:0,background:kmColor(mc.km),width:`${Math.min(100,(mc.km/30000)*100)}%`,borderRadius:4}}/>
                                      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",textShadow:"0 1px 2px #000"}}>
                                        {mc.km.toLocaleString("da-DK")} km
                                      </div>
                                    </div>
                                  </div>
                                  {(()=>{const ss=serviceStatus(mc);if(!ss)return null;const c=ss==="grøn"?"#22c55e":ss==="gul"?"#f59e0b":"#ef4444";return(<div style={{background:"#111",padding:"2px 8px 5px",display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:11,color:c}}>🔧</span><span style={{fontSize:9,color:c,fontWeight:700,letterSpacing:.5}}>SERVICE</span></div>);})()}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── MC DETALJE ── */}
            {nav==="oversigt"&&mcModal&&!nyFak&&!fakDetail&&!editMc&&(()=>{
              const liveMc=mcs.find(m=>String(m.id)===String(mcModal.id))||mcModal;
              return <McDetalje mc={liveMc} fakturaer={fakturaer.filter(f=>f.mcId===liveMc.id)} opgaver={opgaver} onOpretOpgave={(besk,dato,foto)=>opretOpgaveFraMc(liveMc,besk,dato,foto)} onMarkerUdfoert={markerOpgaveUdfoert} onFotoKlik={setFotoModal} onBack={()=>{setMcModal(null);pushNav({nav:"oversigt",mcModal:null,editMc:null,nyFak:null,fakDetail:null});}} onEdit={(opdatMc)=>{const base=opdatMc||liveMc;setMcModal(liveMc);setEditMc({...base});pushNav({nav:"oversigt",mcModal:{id:liveMc.id},editMc:{id:base.id},nyFak:null,fakDetail:null});}} onNyFaktura={()=>{
                  // Tjek om transport skal tilbydes
                  const afd = liveMc.location||"";
                  // Slå transport op fra lokationer state (kan være ændret i admin)
                  const lokObj = lokationer.find(l=>l.navn===afd);
                  const takst = lokObj ? (lokObj.transport??0) : (TRANSPORT_TAKSTER[afd]??-1);
                  // Har vi allerede en faktura i dag fra samme afdeling med transport?
                  const harTransportIdagFraAfd = fakturaer.some(f=>
                    f.dato===todayStr && f.afdeling===afd &&
                    f.linjer.some(l=>l.yId==="TRANSPORT")
                  );
                  if(takst > 0 && !harTransportIdagFraAfd){
                    setTransportPrompt({afdeling:afd, pris:takst, mcId:liveMc.id, dato:todayStr});
                  } else {
                    setNyFak({mcId:liveMc.id,linjer:[],dato:todayStr,note:"",titel:""});
                    pushNav({nav:"oversigt",mcModal:liveMc,editMc:null,nyFak:{mcId:liveMc.id},fakDetail:null});
                  }
                }} onVisFaktura={(f)=>{setFakDetail(f);pushNav({nav:"oversigt",mcModal:liveMc,editMc:null,nyFak:null,fakDetail:f});}} onMove={()=>setMoveModal(liveMc.id)} onFotoUpload={onFotoUpload} onUpdateKm={(km)=>onUpdateKm(liveMc.id,km)}
                onLazyFotoLoad={(mcId)=>{
                  db(`mcs?select=foto,fotos,thumb&id=eq.${mcId}`).then(async rows=>{
                    if(rows?.[0]) {
                      const r = rows[0];
                      const nyFotos = Array.isArray(r.fotos)&&r.fotos.length>0 ? r.fotos : (r.foto?[r.foto]:[]);
                      // Backfill thumbnail for gamle MC'er der mangler det
                      let thumb = r.thumb||"";
                      if(!thumb && r.foto){
                        thumb = await lavThumb(r.foto);
                        if(thumb) db(`mcs?id=eq.${mcId}`,{method:"PATCH",body:JSON.stringify({thumb}),prefer:"return=minimal"}).catch(()=>{});
                      }
                      setMcs(p=>p.map(m=>String(m.id)===String(mcId)?{...m,foto:r.foto||"",fotos:nyFotos,thumb:thumb||m.thumb}:m));
                    }
                  }).catch(()=>{});
                }} SC={SC} SL={SL} synStatus={synStatus} fmt={fmt} inp={inp} btnRed={btnRed} btnGhost={btnGhost} MC_SVG={MC_SVG} kmColor={kmColor} notify={notify} isAdmin={isAdmin} onUpdateNoter={(tekst)=>onUpdateNoter(liveMc.id,tekst)}/>;
            })()}

            {/* ── REDIGER MC ── */}
            {nav==="oversigt"&&editMc&&(
              <RedigerMc mc={editMc} setMc={setEditMc} onSave={saveMc} onCancel={()=>{setEditMc(null);window.history.back();}} locations={lokationer.map(l=>l.navn)} inp={inp} btnRed={btnRed} btnGhost={btnGhost}/>
            )}

            {/* ── NY FAKTURA ── */}
            {nav==="oversigt"&&nyFak&&!fakDetail&&(
              <NyFakturaView faktura={nyFak} setFaktura={setNyFak} mc={mcs.find(m=>m.id===nyFak.mcId)} ydelser={ydelser} addLinje={addLinje} removeLinje={removeLinje} setAntal={setAntal} setPrisL={setPrisL} fakTotal={fakTotal} onGem={gemFak} onCancel={()=>{setNyFak(null);setEditFakId(null);window.history.back();}} inp={inp} btnRed={btnRed} btnGhost={btnGhost} fmt={fmt} editMode={!!editFakId}/>
            )}

            {/* ── FAKTURA DETALJE ── */}
            {fakDetail&&(
              <FakturaDetalje faktura={fakDetail} onBack={()=>window.history.back()} onRediger={startRedigerFak} onSætFaktureret={sætFaktureret} fmt={fmt} btnGhost={btnGhost} btnRed={btnRed} lokationer={lokationer} notify={notify} isAdmin={isAdmin}/>
            )}

            {/* ── ALLE FAKTURAER ── */}
            {nav==="fakturaer"&&!fakDetail&&(
              <AlleFakturaer fakturaer={fakturaer} onVis={(f)=>{setFakDetail(f);pushNav({nav:"fakturaer",mcModal:null,editMc:null,nyFak:null,fakDetail:f});}} onSætFaktureret={sætFaktureret} fmt={fmt} inp={inp} btnGhost={btnGhost} filterFak={fakFilterFak} setFilterFak={setFakFilterFak} filterAfd={fakFilterAfd} setFilterAfd={setFakFilterAfd}/>
            )}

            {/* ── ADMINISTRATION ── */}
            {nav==="administration"&&(
              <YdelserView ydelser={ydelser} nyYdelse={nyYdelse} setNyYdelse={setNyYdelse} editYdelse={editYdelse} setEditYdelse={setEditYdelse} onGem={gemYdelse} onSave={saveYdelse} onDel={delYdelse} lokationer={lokationer} nyLok={nyLok} setNyLok={setNyLok} editLok={editLok} setEditLok={setEditLok} onOpretLok={opretLokation} onGemLok={gemRedigerLokation} inp={inp} btnRed={btnRed} btnGhost={btnGhost} fmt={fmt}
                mcs={mcs} onBulkOpdater={async(opdateringer)=>{
                  // Opdater kun de felter der rent faktisk ændrer sig — IKKE hele objektet
                  for(const {mc, data} of opdateringer) {
                    const opdateret = {...mc, ...data};
                    setMcs(p=>p.map(m=>String(m.id)===String(mc.id)?opdateret:m));
                    // Byg et minimalt patch-objekt med kun de ændrede felter
                    const patch = {};
                    if(data.stel       !== undefined) patch.stel        = data.stel||"";
                    if(data.foersteReg !== undefined) patch.foerste_reg = data.foersteReg||"";
                    if(data.syn        !== undefined) patch.syn         = data.syn||"";
                    if(data.naesteSyn  !== undefined) patch.naeste_syn  = data.naesteSyn||"";
                    if(data.beskrivelse!== undefined) patch.beskrivelse = data.beskrivelse||"";
                    if(data.km         !== undefined) patch.km          = data.km||0;
                    if(Object.keys(patch).length === 0) continue;
                    try { await db(`mcs?id=eq.${mc.id}`,{method:"PATCH",body:JSON.stringify(patch),prefer:"return=minimal"}); }
                    catch(e) { console.error("Bulk DB fejl MC",mc.reg,e); }
                  }
                }}
              />
            )}

            {/* ── OPGAVER ── */}
            {nav==="opgaver"&&(
              <OpgaverView opgaver={opgaver} setOpgaver={setOpgaver} locations={lokationer.map(l=>l.navn)} notify={notify} visForm={visOpgaveForm} setVisForm={setVisOpgaveForm} inp={inp} btnRed={btnRed} btnGhost={btnGhost} fmt={fmt} onFotoKlik={setFotoModal}/>
            )}

            {/* ── PLANLÆGNING ── */}
            {nav==="planlægning"&&(
              <div style={{padding:"0 16px 32px"}}>
                <h2 style={{color:"#fff",fontSize:20,fontWeight:700,margin:"24px 0 4px"}}>Planlægning</h2>
                <p style={{color:"#888",fontSize:13,marginBottom:24}}>Oversigt over hvornår der sidst er lavet en faktura i hver afdeling. Sorteret efter længst tid siden besøg.</p>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {planData.map(({navn,seneste,dage})=>{
                    const farve=dage===null?"#555":dage>60?"#cc0000":dage>30?"#e6a817":"#22a06b";
                    const badge=dage===null
                      ? {bg:"#2a2a2a",txt:"#888",label:"Ingen fakturaer"}
                      : dage>60
                        ? {bg:"#2d0a0a",txt:"#ff6b6b",label:`${dage} dage siden`}
                        : dage>30
                          ? {bg:"#2d1f00",txt:"#ffd166",label:`${dage} dage siden`}
                          : {bg:"#0a2d1a",txt:"#6ee7b7",label:`${dage} dage siden`};
                    return (
                      <div key={navn} style={{background:"#1a1a1a",borderRadius:10,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",borderLeft:`4px solid ${farve}`}}>
                        <div>
                          <div style={{color:"#fff",fontWeight:600,fontSize:15}}>{navn}</div>
                          <div style={{color:"#888",fontSize:12,marginTop:3}}>
                            {seneste ? `Seneste faktura: ${seneste.split("-").reverse().join("-")}` : "Ingen fakturaer registreret"}
                          </div>
                        </div>
                        <div style={{background:badge.bg,color:badge.txt,borderRadius:20,padding:"5px 14px",fontSize:13,fontWeight:600,whiteSpace:"nowrap"}}>
                          {badge.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── BRUGERE (kun admin) ── */}
            {nav==="brugere"&&isAdmin&&(
              <BrugerAdmin brugere={brugere} setBrugere={setBrugere} notify={notify}/>
            )}

            {/* ── SLUTSEDLER (kun admin) ── */}
            {nav==="slutsedler"&&isAdmin&&(
              <SlutsedlerView db={db} fmt={fmt}/>
            )}
          </div>
        </div>
      </div>

      {/* ── SYN OVERSKREDET MODAL ── */}
      {synModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setSynModal(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#1e1e1e",borderRadius:14,padding:"20px 0 8px",width:"100%",maxWidth:420,border:"1px solid #cc000066",maxHeight:"80vh",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"0 20px 14px",borderBottom:"1px solid #2a2a2a",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontWeight:700,fontSize:17,color:"#fff"}}>⚠ Syn overskredet</div>
                <div style={{fontSize:13,color:"#888",marginTop:2}}>{mcs.filter(m=>synStatus(m)==="overskredet"&&!erSolgt(m)).length} MC'er kræver syn</div>
              </div>
              <button onClick={()=>setSynModal(false)} style={{background:"none",border:"none",color:"#666",fontSize:22,cursor:"pointer",lineHeight:1,padding:"0 4px"}}>✕</button>
            </div>
            <div style={{overflowY:"auto",padding:"8px 0"}}>
              {mcs.filter(m=>synStatus(m)==="overskredet"&&!erSolgt(m)).sort((a,b)=>synStatusDato(a).localeCompare(synStatusDato(b))).map(mc=>{
                const dage=Math.floor((new Date(mc.naesteSyn||naesteSyn(mc.syn))-new Date())/86400000);
                return (
                  <div key={mc.id} onClick={()=>{
                      setSynModal(false);
                      setMcModal(mc);
                      setEditMc(null); setNyFak(null); setFakDetail(null);
                      pushNav({nav:"oversigt",mcModal:{id:mc.id},editMc:null,nyFak:null,fakDetail:null});
                    }}
                    style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 20px",borderBottom:"1px solid #2a2a2a",cursor:"pointer",gap:12}}
                    className="tap">
                    <div>
                      <div style={{fontWeight:700,fontSize:14,color:"#fff"}}>{mc.reg}</div>
                      <div style={{fontSize:12,color:"#888",marginTop:1}}>{mc.beskrivelse} · {mc.location}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{background:"#3a1a1a",color:"#f87171",border:"1px solid #ef444444",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>
                        {Math.abs(dage)} dag{Math.abs(dage)===1?"":"e"} overskredet
                      </div>
                      <div style={{fontSize:11,color:"#777",marginTop:3}}>Næste syn: {fmtDato(synStatusDato(mc))}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── GPS MODAL ── */}
      {gpsModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}} onClick={()=>setGpsModal(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#1e1e1e",borderRadius:14,padding:"20px 0 8px",width:"100%",maxWidth:420,border:"1px solid #22c55e33",maxHeight:"80vh",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"0 20px 14px",borderBottom:"1px solid #2a2a2a",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontWeight:700,fontSize:17,color:"#fff"}}>📡 MC'er uden GPS</div>
                <div style={{fontSize:13,color:"#888",marginTop:2}}>{mcs.filter(m=>!harGPS(m)&&!erSolgt(m)).length} MC'er mangler GPS</div>
              </div>
              <button onClick={()=>setGpsModal(false)} style={{background:"none",border:"none",color:"#666",fontSize:22,cursor:"pointer",lineHeight:1,padding:"0 4px"}}>✕</button>
            </div>
            <div style={{overflowY:"auto",padding:"8px 0"}}>
              {mcs.filter(m=>!harGPS(m)&&!erSolgt(m)).sort((a,b)=>a.location.localeCompare(b.location)).map(mc=>(
                <div key={mc.id} onClick={()=>{
                    setGpsModal(false);
                    setMcModal(mc);
                    setEditMc(null); setNyFak(null); setFakDetail(null);
                    pushNav({nav:"oversigt",mcModal:{id:mc.id},editMc:null,nyFak:null,fakDetail:null});
                  }}
                  style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 20px",borderBottom:"1px solid #2a2a2a",cursor:"pointer",gap:12}}
                  className="tap">
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:"#fff"}}>{mc.reg}</div>
                    <div style={{fontSize:12,color:"#888",marginTop:1}}>{mc.beskrivelse} · {mc.location}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{background:"#1a3a1a",color:"#86efac",border:"1px solid #22c55e33",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>
                      Ingen GPS
                    </div>
                    <div style={{fontSize:11,color:"#777",marginTop:3}}>MC Nr: {mc.mcNr}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TRANSPORT PROMPT ── */}
      {transportPrompt&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}}>
          <div style={{background:"#1e1e1e",borderRadius:14,padding:24,width:"100%",maxWidth:380,border:"1px solid #333"}}>
            <div style={{fontWeight:700,fontSize:17,color:"#fff",marginBottom:6}}>🚐 Transport</div>
            <div style={{fontSize:13,color:"#888",marginBottom:20}}>
              Første faktura i dag fra <strong style={{color:"#fff"}}>{transportPrompt.afdeling}</strong> — skal der transport på?
            </div>
            {/* Pris-felt der kan redigeres */}
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:11,color:"#777",marginBottom:4,fontWeight:600,textTransform:"uppercase"}}>Transport pris (kr)</label>
              <input type="number" value={transportPrompt.pris}
                onChange={e=>setTransportPrompt(p=>({...p,pris:Number(e.target.value)}))}
                style={{padding:"10px 14px",borderRadius:8,border:"1px solid #444",background:"#252525",color:"#fff",fontSize:15,width:"100%",boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button onClick={()=>{
                // Tilføj transport som første linje
                const transportLinje={yId:"TRANSPORT",nr:"T001",navn:`Transport ${transportPrompt.afdeling}`,pris:transportPrompt.pris,antal:1,divers:true};
                setNyFak({mcId:transportPrompt.mcId,linjer:[transportLinje],dato:transportPrompt.dato,note:"",titel:""});
                setTransportPrompt(null);
              }} style={{background:"#cc0000",border:"none",color:"#fff",borderRadius:8,padding:"12px",fontWeight:700,fontSize:14,cursor:"pointer"}}>
                ✓ Ja, tilføj transport ({transportPrompt.pris.toLocaleString("da-DK")} kr)
              </button>
              <button onClick={()=>{
                setNyFak({mcId:transportPrompt.mcId,linjer:[],dato:transportPrompt.dato,note:"",titel:""});
                setTransportPrompt(null);
              }} style={{background:"transparent",border:"1px solid #444",color:"#888",borderRadius:8,padding:"12px",fontWeight:600,fontSize:14,cursor:"pointer"}}>
                ✕ Nej, ingen transport
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FOTO MODAL ── */}
      {fotoModal&&<FotoModal src={fotoModal} onClose={()=>setFotoModal(null)}/>}

      {/* ── NUMMERPLADE SCANNER ── */}
      {pladeScanner&&<NummerpladeScanner mcs={mcs} onResult={(mc)=>{
              // Sæt state + push history så popstate ikke nulstiller MC-visningen
              setPladeScanner(false);
              setMcModal(mc);
              setEditMc(null); setNyFak(null); setFakDetail(null);
              pushNav({nav:"oversigt", mcModal:{id:mc.id}, editMc:null, nyFak:null, fakDetail:null});
            }} onClose={()=>setPladeScanner(false)}/>}

      {/* ── FLYT MODAL ── */}
      {moveModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:500}} onClick={()=>setMoveModal(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#1e1e1e",borderRadius:"16px 16px 0 0",padding:"20px 16px 32px",width:"100%",maxWidth:480,border:"1px solid #333"}}>
            <div style={{width:40,height:4,background:"#444",borderRadius:2,margin:"0 auto 18px"}}/>
            <h3 style={{margin:"0 0 4px",fontSize:17,fontWeight:700}}>Flyt MC</h3>
            <p style={{color:"#888",fontSize:13,margin:"0 0 16px"}}>Ny lokation for <strong style={{color:"#fff"}}>{mcs.find(m=>m.id==moveModal)?.reg}</strong></p>
            <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:300,overflowY:"auto"}}>
              {lokationer.map(l=>{ const l_navn=l.navn||l;
                // eslint-disable-next-line eqeqeq
                const erNuvaerende=mcs.find(m=>m.id==moveModal)?.location===l_navn;
                return (
                  <div key={l} className={erNuvaerende?"":"tap"}
                    onClick={()=>{if(!erNuvaerende)doMove(l_navn);}}
                    style={{padding:"12px 14px",borderRadius:8,cursor:erNuvaerende?"default":"pointer",
                      background:erNuvaerende?"#1a3a1a":"#252525",
                      border:`1px solid ${erNuvaerende?"#22c55e55":"#333"}`,
                      fontSize:14,color:erNuvaerende?"#22c55e":"#ddd",fontWeight:erNuvaerende?700:500}}>
                    {erNuvaerende?"✓":"📍"} {l_navn}{erNuvaerende?" (nuværende)":""}
                  </div>
                );
              })}
            </div>
            <button onClick={()=>setMoveModal(null)} style={{...btnGhost,width:"100%",justifyContent:"center",marginTop:12,padding:"12px"}}>Annuller</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SUB COMPONENTS ────────────────────────────────────────────────────────────

function McDetalje({mc,fakturaer,opgaver,onOpretOpgave,onMarkerUdfoert,onFotoKlik,onBack,onEdit,onNyFaktura,onVisFaktura,onMove,onFotoUpload,onUpdateKm,onUpdateNoter,onLazyFotoLoad,SC,SL,synStatus,fmt,inp,btnRed,btnGhost,MC_SVG,kmColor,notify,isAdmin}) {
  const [kmInlineEdit, setKmInlineEdit] = React.useState(false);
  const [kmInlineVal, setKmInlineVal] = React.useState("");
  const [noteText, setNoteText] = React.useState(mc.noter||"");
  const [slutseddelModal, setSlutseddelModal] = React.useState(false);
  const [resendSigId, setResendSigId] = React.useState(null);
  const [køberForm, setKøberForm] = React.useState({
    navn:"", adresse:"", postby:"", telefon:"", email:"", cpr:"", pris:"", km:"",
    s1:"nej", s2:"nej", s3:"nej", s4:"nej", s5:"skolekørsel",
    s6:"nej", s6b:"nej", s7:"nej", s8:"nej", s9:"nej",
    proevekørt:"ja",
    forsForsikrAnsvar:false, forsForsikrKasko:true,
    forsPolicenr:"", forsTegnetI:"Lokal forsikring",
    køberOmregForsikring:"kasko", køberOmregSelskab:"",
  });

  // Lazy load foto — hentes kun når MC-detalje åbnes
  React.useEffect(() => {
    if(mc && !mc.foto && onLazyFotoLoad) {
      onLazyFotoLoad(mc.id);
    }
  }, [mc?.id]);
  const st=synStatus(mc);
  const [sigStatus, setSigStatus]=React.useState(null);
  React.useEffect(()=>{
    db("signatures?mc_id=eq."+mc.id+"&order=created_at.desc&limit=1")
      .then(rows=>setSigStatus(rows.length>0?rows[0]:null))
      .catch(()=>{});
  },[mc.id]);
  const [signers, setSigners]=React.useState(null);
  const [signersLoading, setSignersLoading]=React.useState(false);
  const [signersError, setSignersError]=React.useState(null);
  const hentUnderskrivere=async(envelopeId)=>{
    setSignersLoading(true);
    setSignersError(null);
    setSigners(null);
    try{
      const r=await fetch(`/.netlify/functions/firma-signers?id=${envelopeId}`);
      const json=await r.json();
      if(json.error){setSignersError(json.error);}
      else{setSigners(json.signers||[]);}
    }catch(e){setSignersError("Netværksfejl");}
    finally{setSignersLoading(false);}
  };
  const [visOpgForm,setVisOpgForm]=React.useState(false);
  const [opgForm,setOpgForm]=React.useState({beskrivelse:"",senestUdfoert:new Date().toISOString().split("T")[0],foto:""});

  const [gemmerOpgave,setGemmerOpgave]=React.useState(false);

  const gemOpgave=()=>{
    setGemmerOpgave(true);
    // Komprimer billede før gemning
    let fotoData = opgForm.foto;
    if(fotoData && fotoData.length > 200000) {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        const max = 800;
        const ratio = Math.min(max/img.width, max/img.height, 1);
        c.width = Math.round(img.width*ratio);
        c.height = Math.round(img.height*ratio);
        c.getContext("2d").drawImage(img,0,0,c.width,c.height);
        onOpretOpgave(opgForm.beskrivelse,opgForm.senestUdfoert,c.toDataURL("image/jpeg",0.7));
        setOpgForm({beskrivelse:"",senestUdfoert:new Date().toISOString().split("T")[0],foto:""});
        setVisOpgForm(false);
        setGemmerOpgave(false);
      };
      img.src = fotoData;
    } else {
      onOpretOpgave(opgForm.beskrivelse,opgForm.senestUdfoert,fotoData);
      setOpgForm({beskrivelse:"",senestUdfoert:new Date().toISOString().split("T")[0],foto:""});
      setVisOpgForm(false);
      setGemmerOpgave(false);
    }
  };

  return (
    <div style={{paddingBottom:20}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <button onClick={onBack} style={{...btnGhost,padding:"8px 14px",fontSize:13}}>← Tilbage</button>
        <h1 style={{margin:0,fontSize:20,fontWeight:700,color:"#fff",flex:1,minWidth:0}}>{mc.reg}</h1>
        <span style={{background:SC[st]+"33",color:SC[st],padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,border:`1px solid ${SC[st]}55`,flexShrink:0}}>{SL[st]}</span>
      </div>
      {/* Action buttons */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <button onClick={onMove} style={{...btnGhost,fontSize:13,padding:"8px 14px"}}>📍 Flyt</button>
        <button onClick={()=>onEdit()} style={{...btnGhost,fontSize:13,padding:"8px 14px"}}>✏️ Rediger</button>
        <button onClick={onNyFaktura} style={{...btnGhost,fontSize:13,padding:"8px 14px"}}>🧾 Ny Faktura</button>
        <button onClick={()=>{setVisOpgForm(true);setTimeout(()=>document.getElementById(`mc-opg-sektion-${mc.id}`)?.scrollIntoView({behavior:"smooth",block:"end"}),50);}} style={{...btnGhost,fontSize:13,padding:"8px 14px"}}>📋 Opgave</button>
        {isAdmin&&<button onClick={()=>{setKøberForm(p=>({...p,km:String(mc.km||"")}));setSlutseddelModal(true);}} style={{...btnGhost,fontSize:13,padding:"8px 14px"}}>📄 Slutseddel</button>}
      </div>

      {sigStatus&&(
        <>
          <div style={{marginBottom:signers||signersError?4:14,padding:"10px 14px",borderRadius:8,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",
            background:sigStatus.status==="signed"?"#0a2d1a":sigStatus.status==="cancelled"?"#2d0a0a":sigStatus.status==="expired"?"#2d1a0a":"#2d1f00",
            border:`1px solid ${sigStatus.status==="signed"?"#22a06b55":sigStatus.status==="cancelled"?"#cc000055":sigStatus.status==="expired"?"#cc660055":"#e6a81755"}`}}>
            <span style={{fontSize:14}}>{sigStatus.status==="signed"?"✅":sigStatus.status==="cancelled"?"❌":sigStatus.status==="expired"?"⏰":"✍️"}</span>
            <div style={{flex:1}}>
              <div style={{color:sigStatus.status==="signed"?"#6ee7b7":sigStatus.status==="cancelled"?"#f87171":sigStatus.status==="expired"?"#ffa366":"#ffd166",fontSize:13,fontWeight:600}}>
                {sigStatus.status==="signed"?"Slutseddel underskrevet":sigStatus.status==="cancelled"?"Underskrift annulleret":sigStatus.status==="expired"?"Underskrift udløbet":"Afventer underskrift"}
              </div>
              <div style={{color:"#888",fontSize:11,marginTop:1}}>
                {sigStatus.buyer_email} · {new Date(sigStatus.created_at).toLocaleDateString("da-DK")}
              </div>
            </div>
            {(sigStatus.status==="expired"||sigStatus.status==="cancelled")&&isAdmin&&(
              <button onClick={()=>{
                setResendSigId(sigStatus.id);
                setKøberForm(p=>({
                  ...p,
                  km:String(mc.km||""),
                  navn:sigStatus.buyer_name||"",
                  email:sigStatus.buyer_email||"",
                  adresse:sigStatus.buyer_adresse||"",
                  postby:sigStatus.buyer_postby||"",
                  telefon:sigStatus.buyer_telefon||"",
                  pris:sigStatus.pris_kr?String(sigStatus.pris_kr):"",
                }));
                setSlutseddelModal(true);
              }} style={{color:"#ffa366",fontSize:12,padding:"5px 10px",borderRadius:6,border:"1px solid #ffa36655",background:"#2d1a0a",cursor:"pointer",whiteSpace:"nowrap",fontWeight:600}}>
                🔄 Gensend
              </button>
            )}
            {sigStatus.envelope_id&&sigStatus.status!=="expired"&&sigStatus.status!=="cancelled"&&(
              <a href={`/.netlify/functions/firma-document?id=${sigStatus.envelope_id}`} target="_blank" rel="noopener noreferrer"
                style={{color:"#7cabff",fontSize:12,textDecoration:"none",padding:"5px 10px",borderRadius:6,border:"1px solid #7cabff33",background:"#1a2a4a",whiteSpace:"nowrap"}}>
                {sigStatus.status==="signed"?"📄 Åbn dokument":"📄 Se status"}
              </a>
            )}
            {sigStatus.status==="pending"&&isAdmin&&sigStatus.envelope_id&&(
              <button onClick={()=>hentUnderskrivere(sigStatus.envelope_id)}
                style={{color:"#ffd166",fontSize:12,padding:"5px 10px",borderRadius:6,border:"1px solid #ffd16655",background:"#2d1f00",cursor:"pointer",whiteSpace:"nowrap",fontWeight:600}}>
                {signersLoading?"⏳ Henter...":"👥 Hvem mangler?"}
              </button>
            )}
          </div>
          {signers&&signers.length>0&&(
            <div style={{marginBottom:14,padding:"8px 12px",borderRadius:6,background:"#111",border:"1px solid #333"}}>
              {signers.map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",borderBottom:i<signers.length-1?"1px solid #222":"none"}}>
                  <span style={{fontSize:14}}>{s.declined?"❌":s.signed?"✅":"⏳"}</span>
                  <div>
                    <div style={{color:s.declined?"#f87171":s.signed?"#6ee7b7":"#ffd166",fontSize:12,fontWeight:600}}>{s.name}</div>
                    <div style={{color:"#666",fontSize:11}}>{s.email}{s.signed&&s.signed_at?" · underskrevet "+new Date(s.signed_at).toLocaleDateString("da-DK"):s.declined?" · afslog underskrift":""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {signersError&&(
            <div style={{marginBottom:14,color:"#f87171",fontSize:11,padding:"4px 12px"}}>Fejl: {signersError}</div>
          )}
          {signers&&signers.length===0&&(
            <div style={{marginBottom:14,color:"#888",fontSize:11,padding:"4px 12px"}}>Ingen underskriverdata tilgængelig fra Firma.dev.</div>
          )}
        </>
      )}

      <div className="detail-grid" style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:16}}>
        {/* MC card */}
        <div style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",overflow:"hidden"}}>
          {/* ── Multi-foto slideshow ── */}
          {(()=>{
            const alleFotos = mc.fotos&&mc.fotos.length>0 ? mc.fotos : (mc.foto ? [mc.foto] : []);
            const [fotoIdx, setFotoIdx] = React.useState(0);
            const aktivFoto = alleFotos[Math.min(fotoIdx, alleFotos.length-1)] || null;
            return (
              <div style={{background:"#111",position:"relative"}}>
                <img src={aktivFoto||MC_SVG} alt=""
                  onClick={()=>aktivFoto&&onFotoKlik&&onFotoKlik(aktivFoto)}
                  style={{width:"100%",height:160,objectFit:aktivFoto?"cover":"contain",display:"block",cursor:aktivFoto?"zoom-in":"default"}}/>
                {/* Pile til at navigere mellem billeder */}
                {alleFotos.length>1&&(
                  <>
                    <button onClick={e=>{e.stopPropagation();setFotoIdx(i=>Math.max(0,i-1));}}
                      style={{position:"absolute",left:6,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.6)",border:"none",color:"#fff",borderRadius:"50%",width:28,height:28,fontSize:16,cursor:"pointer",display:fotoIdx>0?"flex":"none",alignItems:"center",justifyContent:"center"}}>‹</button>
                    <button onClick={e=>{e.stopPropagation();setFotoIdx(i=>Math.min(alleFotos.length-1,i+1));}}
                      style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.6)",border:"none",color:"#fff",borderRadius:"50%",width:28,height:28,fontSize:16,cursor:"pointer",display:fotoIdx<alleFotos.length-1?"flex":"none",alignItems:"center",justifyContent:"center"}}>›</button>
                    <div style={{position:"absolute",top:6,right:8,background:"rgba(0,0,0,0.6)",color:"#fff",fontSize:10,padding:"2px 7px",borderRadius:10}}>{fotoIdx+1}/{alleFotos.length}</div>
                  </>
                )}
                {/* Dot indicators */}
                {alleFotos.length>1&&(
                  <div style={{position:"absolute",bottom:28,left:0,right:0,display:"flex",justifyContent:"center",gap:4}}>
                    {alleFotos.map((_,i)=>(
                      <div key={i} onClick={e=>{e.stopPropagation();setFotoIdx(i);}}
                        style={{width:6,height:6,borderRadius:"50%",background:i===fotoIdx?"#fff":"rgba(255,255,255,0.4)",cursor:"pointer"}}/>
                    ))}
                  </div>
                )}
                <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.65)",padding:"8px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                  <button onClick={()=>document.getElementById(`foto-input-${mc.id}`).click()}
                    style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",color:"#fff",borderRadius:8,padding:"7px 16px",fontSize:13,fontWeight:600,cursor:"pointer",flex:1}}>
                    📷 Tilføj billede
                  </button>
                  {alleFotos.length>0&&aktivFoto&&(
                    <button onClick={()=>{
                      const nyFotos=alleFotos.filter((_,i)=>i!==fotoIdx);
                      onFotoUpload&&onFotoUpload(mc.id, nyFotos[0]||"", nyFotos);
                      setFotoIdx(0);
                    }} style={{background:"rgba(204,0,0,0.7)",border:"1px solid rgba(255,100,100,0.4)",color:"#fff",borderRadius:8,padding:"7px 16px",fontSize:13,fontWeight:600,cursor:"pointer",flex:1}}>
                      🗑 Slet
                    </button>
                  )}
                </div>
                <input id={`foto-input-${mc.id}`} type="file" accept="image/*" multiple style={{display:"none"}}
                  onChange={e=>{
                    const files=Array.from(e.target.files); if(!files.length) return;
                    files.forEach(file=>{
                      fixOgKomprimer(file, dataUrl=>{
                        const nyFotos=[...alleFotos, dataUrl];
                        onFotoUpload&&onFotoUpload(mc.id, nyFotos[0], nyFotos);
                        setFotoIdx(nyFotos.length-1);
                      });
                    });
                    e.target.value="";
                  }}/>
              </div>
            );
          })()}
          <div style={{padding:16,display:"flex",flexDirection:"column",gap:0}}>
            {[{l:"MC Nr",v:mc.mcNr},{l:"Reg.nr",v:mc.reg},{l:"Stelnummer",v:mc.stel},{l:"GPS Nr",v:mc.gps},{l:"Beskrivelse",v:mc.beskrivelse},{l:"Lokation",v:mc.location},{l:"1. indregistrering",v:fmtDato(mc.foersteReg)},{l:"Sidst syn",v:fmtDato(mc.syn)},{l:"Næste syn",v:fmtDato(mc.naesteSyn||naesteSyn(mc.syn))}].map(r=>(
              <div key={r.l} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"8px 0",borderBottom:"1px solid #222"}}>
                <span style={{color:"#777",fontSize:13,flexShrink:0}}>{r.l}</span>
                <span style={{fontWeight:600,fontSize:13,color:"#fff",textAlign:"right",wordBreak:"break-all"}}>{r.v||"—"}</span>
              </div>
            ))}
            {/* Kilometertal — klikbart for hurtig opdatering */}
            <div style={{display:"flex",justifyContent:"space-between",gap:10,padding:"8px 0",borderBottom:"1px solid #222",alignItems:"center"}}>
              <span style={{color:"#777",fontSize:13,flexShrink:0}}>Kilometertal</span>
              {kmInlineEdit ? (
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input type="number" value={kmInlineVal} onChange={e=>setKmInlineVal(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"){onUpdateKm&&onUpdateKm(Number(kmInlineVal));setKmInlineEdit(false);}if(e.key==="Escape")setKmInlineEdit(false);}}
                    autoFocus style={{...inp,width:110,padding:"4px 8px",fontSize:13,textAlign:"right"}}/>
                  <button onClick={()=>{onUpdateKm&&onUpdateKm(Number(kmInlineVal));setKmInlineEdit(false);}}
                    style={{background:"#cc0000",border:"none",color:"#fff",borderRadius:6,padding:"4px 10px",fontSize:12,fontWeight:700,cursor:"pointer"}}>✓</button>
                  <button onClick={()=>setKmInlineEdit(false)}
                    style={{background:"#252525",border:"1px solid #444",color:"#888",borderRadius:6,padding:"4px 8px",fontSize:12,cursor:"pointer"}}>✕</button>
                </div>
              ) : (
                <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>{setKmInlineVal(String(mc.km||0));setKmInlineEdit(true);}}>
                  <span style={{fontWeight:600,fontSize:13,color:"#fff"}}>{(mc.km||0).toLocaleString("da-DK")} km</span>
                  <span style={{fontSize:11,color:"#555",background:"#222",padding:"2px 6px",borderRadius:4}}>✏️</span>
                </div>
              )}
            </div>
            {/* MotorAPI opslag */}
            <MotorApiKnap reg={mc.reg} mc={mc} onOverskriv={(opdateringer)=>{
              onEdit({...mc,...opdateringer});
            }} btnGhost={btnGhost}/>
            <div style={{background:"#222",borderRadius:4,height:18,overflow:"hidden",position:"relative",marginTop:10}}>
              <div style={{position:"absolute",inset:0,background:kmColor(mc.km),width:`${Math.min(100,(mc.km/30000)*100)}%`,borderRadius:4}}/>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",textShadow:"0 1px 3px #000"}}>
                {mc.km.toLocaleString("da-DK")} km
              </div>
            </div>
          </div>
        </div>

        {/* Fakturaer */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",overflow:"hidden"}}>
            <div style={{padding:"13px 16px",borderBottom:"1px solid #2a2a2a",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:700,fontSize:15}}>Fakturaer</span>
              <span style={{color:"#888",fontSize:12}}>{fakturaer.length} stk · {fmt(fakturaer.reduce((s,f)=>s+f.total,0))} kr</span>
            </div>
            {fakturaer.length===0?(
              <div style={{padding:32,textAlign:"center",color:"#555",fontSize:13}}>Ingen fakturaer endnu</div>
            ):(
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:360}}>
                  <thead><tr style={{background:"#222"}}>
                    {["Faktura nr","Dato","Total",""].map(h=>(
                      <th key={h} style={{padding:"9px 14px",textAlign:"left",fontSize:11,letterSpacing:.8,color:"#777",fontWeight:700,textTransform:"uppercase"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {fakturaer.map((f,i)=>(
                      <tr key={f.id} className="tap" style={{background:i%2===0?"#1a1a1a":"#1e1e1e",borderBottom:"1px solid #222",cursor:"pointer"}} onClick={()=>onVisFaktura(f)}>
                        <td style={{padding:"10px 14px",fontWeight:700,color:"#f87171",fontSize:13}}>{f.id}</td>
                        <td style={{padding:"10px 14px",fontSize:13,color:"#ccc"}}>{fmtDato(f.dato)}{f.km?<span style={{fontSize:11,color:"#888",marginLeft:6}}>({f.km.toLocaleString("da-DK")} km)</span>:null}</td>
                        <td style={{padding:"10px 14px",fontWeight:700,color:"#4ade80",fontSize:13}}>{fmt(f.total)} kr</td>
                        <td style={{padding:"10px 14px"}}><span style={{color:"#888",fontSize:12}}>›</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {/* ── NOTER ── */}
          <div style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",overflow:"hidden"}}>
            <div style={{padding:"13px 16px",borderBottom:"1px solid #2a2a2a"}}>
              <span style={{fontWeight:700,fontSize:15}}>📝 Noter vedrørende MC'en</span>
            </div>
            <div style={{padding:"12px 16px"}}>
              <textarea
                value={noteText}
                onChange={e=>setNoteText(e.target.value)}
                placeholder="Tilføj noter om denne motorcykel..."
                rows={3}
                style={{...inp,width:"100%",padding:"10px 12px",fontSize:13,borderRadius:6,resize:"vertical",minHeight:60,fontFamily:"inherit"}}/>
              {noteText!==(mc.noter||"")&&(
                <div style={{marginTop:8,display:"flex",justifyContent:"flex-end"}}>
                  <button onClick={()=>{onUpdateNoter&&onUpdateNoter(noteText);}}
                    style={{background:"#cc0000",border:"none",color:"#fff",borderRadius:6,padding:"7px 18px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                    Gem note
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── OPGAVER PÅ MC ── */}
      <div id={`mc-opg-sektion-${mc.id}`} style={{marginTop:16,background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",overflow:"hidden"}}>
        <div style={{padding:"13px 16px",borderBottom:"1px solid #2a2a2a",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:700,fontSize:15}}>📋 Opgaver</span>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{color:"#888",fontSize:12}}>{(opgaver||[]).filter(o=>String(o.mcId)===String(mc.id)&&!o.udfoert).length} aktive</span>
          </div>
        </div>
        {/* Kun aktive opgaver for denne MC */}
        {(()=>{const mcOpgaver=(opgaver||[]).filter(o=>String(o.mcId)===String(mc.id)&&!o.udfoert);return mcOpgaver.length===0&&!visOpgForm?(
          <div style={{padding:24,textAlign:"center",color:"#555",fontSize:13}}>Ingen aktive opgaver</div>
        ):(
          <div style={{display:"flex",flexDirection:"column"}}>
            {mcOpgaver.map((o,i)=>{
              const idag=new Date().toISOString().split("T")[0];
              const dage=Math.floor((new Date(o.senestUdfoert)-new Date(idag))/86400000);
              const udloebet=dage<0;
              const snart=dage>=0&&dage<=3;
              const fristFarve=udloebet?"#ef4444":snart?"#f59e0b":"#4ade80";
              const fristTekst=udloebet?`Udløbet ${Math.abs(dage)}d siden`:dage===0?"Udløber i dag":`${dage} dage tilbage`;
              return (
                <div key={o.id} style={{padding:"14px 16px",borderBottom:"1px solid #2a2a2a",background:i%2===0?"#1a1a1a":"#1e1e1e"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:14,color:"#fff",marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.titel}</div>
                      {o.beskrivelse&&<div style={{fontSize:13,color:"#aaa",marginBottom:6,lineHeight:1.4}}>{o.beskrivelse}</div>}
                      {o.foto&&<img src={o.foto} alt="" onClick={()=>onFotoKlik&&onFotoKlik(o.foto)} style={{width:"100%",maxHeight:120,objectFit:"cover",borderRadius:6,marginBottom:6,cursor:"zoom-in"}}/>}
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:11,color:"#555"}}>Senest: {fmtDato(o.senestUdfoert)}</span>
                        <span style={{fontSize:11,color:fristFarve,fontWeight:700}}>{fristTekst}</span>
                      </div>
                    </div>
                    <button onClick={()=>onMarkerUdfoert(o.id)}
                      style={{background:"#1a3a2a",border:"1px solid #22c55e44",color:"#22c55e",borderRadius:6,padding:"7px 12px",cursor:"pointer",fontSize:12,fontWeight:700,flexShrink:0,whiteSpace:"nowrap"}}>
                      ✓ Udført
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )})()}
        {/* Opret opgave form — kan åbnes nederst i sektionen */}
        {visOpgForm?(
          <div style={{padding:"16px",borderTop:"1px solid #2a2a2a"}}>
            <div style={{fontWeight:700,fontSize:14,color:"#fff",marginBottom:12}}>Ny opgave — {mc.reg}</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div>
                <label style={{display:"block",fontSize:11,color:"#777",marginBottom:3,fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>Beskrivelse</label>
                <textarea value={opgForm.beskrivelse} onChange={e=>setOpgForm(p=>({...p,beskrivelse:e.target.value}))}
                  placeholder="Beskriv opgaven..." rows={3} style={{...inp,resize:"vertical"}}/>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,color:"#777",marginBottom:3,fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>Senest udført d.</label>
                <input type="date" value={opgForm.senestUdfoert} onChange={e=>setOpgForm(p=>({...p,senestUdfoert:e.target.value}))}
                  style={{...inp,WebkitAppearance:"none",colorScheme:"dark"}}/>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,color:"#777",marginBottom:3,fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>Billede (valgfrit)</label>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <button onClick={()=>document.getElementById(`mc-opg-foto2-${mc.id}`).click()}
                    style={{background:"transparent",border:"1px solid #444",color:"#ccc",borderRadius:8,padding:"8px 14px",fontSize:13,cursor:"pointer",flexShrink:0}}>
                    📷 {opgForm.foto?"Skift":"Upload billede"}
                  </button>
                  {opgForm.foto&&<button onClick={()=>setOpgForm(p=>({...p,foto:""}))} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:13}}>✕ Fjern</button>}
                  <input id={`mc-opg-foto2-${mc.id}`} type="file" accept="image/*" capture="environment" style={{display:"none"}}
                    onChange={e=>{
                      const file=e.target.files[0]; if(!file) return;
                      fixOgKomprimer(file, dataUrl => setOpgForm(p=>({...p,foto:dataUrl})));
                      e.target.value="";
                    }}/>
                </div>
                {opgForm.foto&&<img src={opgForm.foto} alt="" style={{marginTop:8,width:"100%",maxHeight:120,objectFit:"cover",borderRadius:6}}/>}
              </div>
              <div style={{display:"flex",gap:8,marginTop:4}}>
                <button onClick={gemOpgave} disabled={gemmerOpgave} style={{...btnRed,flex:1,justifyContent:"center",padding:"11px",opacity:gemmerOpgave?0.6:1}}>
                  {gemmerOpgave?"Gemmer...":"Gem opgave"}
                </button>
                <button onClick={()=>setVisOpgForm(false)} style={{background:"transparent",border:"1px solid #444",color:"#ccc",borderRadius:8,padding:"11px 14px",fontSize:14,cursor:"pointer"}}>Annuller</button>
              </div>
            </div>
          </div>
        ):(
          <div style={{padding:"12px 16px",borderTop:"1px solid #2a2a2a"}}>
            <button onClick={()=>setVisOpgForm(true)}
              style={{background:"#cc0000",border:"none",color:"#fff",borderRadius:8,padding:"10px 16px",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6,width:"100%",justifyContent:"center"}}>
              + Tilføj opgave
            </button>
          </div>
        )}
      </div>
      {/* Lokationslog */}
      <div style={{marginTop:16,background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",overflow:"hidden"}}>
        <div style={{padding:"13px 16px",borderBottom:"1px solid #2a2a2a",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:700,fontSize:15}}>📍 Lokationshistorik</span>
          <span style={{color:"#888",fontSize:12}}>{Math.max(0,(mc.lokationsLog||[]).length-1)} flytninger</span>
        </div>
        {(!mc.lokationsLog||mc.lokationsLog.length===0)?(
          <div style={{padding:24,textAlign:"center",color:"#555",fontSize:13}}>Ingen historik</div>
        ):(
          <div style={{padding:"8px 0"}}>
            {[...(mc.lokationsLog||[])].reverse().map((entry,i,arr)=>{
              const erAktuel=entry.til===null;
              const dage=erAktuel
                ? Math.floor((new Date()-new Date(entry.fra))/86400000)
                : Math.floor((new Date(entry.til)-new Date(entry.fra))/86400000);
              return (
                <div key={i} style={{display:"flex",alignItems:"stretch",padding:"0 16px",marginBottom: i<arr.length-1?0:8}}>
                  {/* Tidslinje */}
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginRight:14,flexShrink:0}}>
                    <div style={{width:12,height:12,borderRadius:"50%",background:erAktuel?"#cc0000":"#444",border:erAktuel?"2px solid #ff4444":"2px solid #555",marginTop:14,flexShrink:0}}/>
                    {i<arr.length-1&&<div style={{width:2,flex:1,background:"#2a2a2a",marginTop:2}}/>}
                  </div>
                  {/* Indhold */}
                  <div style={{flex:1,padding:"10px 0",borderBottom:i<arr.length-1?"1px solid #222":"none"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:14,color:erAktuel?"#fff":"#ccc"}}>{entry.lokation}</div>
                        <div style={{fontSize:12,color:"#777",marginTop:2}}>
                          {fmtDato(entry.fra)}
                          {entry.til ? ` → ${fmtDato(entry.til)}` : " → nu"}
                        </div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        {erAktuel&&<span style={{background:"#cc000022",color:"#ff6666",border:"1px solid #cc000044",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>NUVÆRENDE</span>}
                        <div style={{fontSize:12,color:"#888",marginTop:erAktuel?4:0}}>{dage} {dage===1?"dag":"dage"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Km-historik */}
      <div style={{marginTop:16,background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",overflow:"hidden"}}>
        <div style={{padding:"13px 16px",borderBottom:"1px solid #2a2a2a",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:700,fontSize:15}}>🛣️ Kilometerhistorik</span>
          <span style={{color:"#888",fontSize:12}}>{(mc.kmLog||[]).length} aflæsninger</span>
        </div>
        {(!(mc.kmLog)||mc.kmLog.length===0)?(
          <div style={{padding:24,textAlign:"center",color:"#555",fontSize:13}}>Ingen historik — opdater kilometertallet for at starte</div>
        ):(
          <div style={{padding:"8px 0"}}>
            {[...(mc.kmLog||[])].reverse().map((entry,i,arr)=>{
              const erSenest=i===0;
              return (
                <div key={i} style={{display:"flex",alignItems:"stretch",padding:"0 16px",marginBottom:i<arr.length-1?0:8}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginRight:14,flexShrink:0}}>
                    <div style={{width:12,height:12,borderRadius:"50%",background:erSenest?"#3b82f6":"#444",border:erSenest?"2px solid #60a5fa":"2px solid #555",marginTop:14,flexShrink:0}}/>
                    {i<arr.length-1&&<div style={{width:2,flex:1,background:"#2a2a2a",marginTop:2}}/>}
                  </div>
                  <div style={{flex:1,padding:"10px 0",borderBottom:i<arr.length-1?"1px solid #222":"none"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:14,color:erSenest?"#fff":"#ccc"}}>{entry.km.toLocaleString("da-DK")} km</div>
                        <div style={{fontSize:12,color:"#777",marginTop:2}}>{fmtDato(entry.dato)}</div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        {entry.diff!==null&&entry.diff!==undefined?(
                          <span style={{
                            background:entry.diff>=0?"#1a3a2a":"#3a1a1a",
                            color:entry.diff>=0?"#4ade80":"#f87171",
                            border:`1px solid ${entry.diff>=0?"#22c55e44":"#ef444444"}`,
                            borderRadius:20,padding:"2px 10px",fontSize:12,fontWeight:700
                          }}>
                            {entry.diff>=0?"+":""}{entry.diff.toLocaleString("da-DK")} km
                          </span>
                        ):(
                          <span style={{background:"#1e2a3a",color:"#60a5fa",border:"1px solid #3b82f644",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>START</span>
                        )}
                        {erSenest&&<div style={{fontSize:11,color:"#888",marginTop:4}}>SENESTE</div>}
                        {entry.service&&<div style={{fontSize:11,color:"#4ade80",background:"#1a2e1a",border:"1px solid #22c55e44",borderRadius:20,padding:"2px 8px",fontWeight:700,marginTop:4,textAlign:"center"}}>🔧 SERVICE</div>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Km indtastningsfelt i bunden af historik — duplet af feltet oppe i MC-data */}
        <div style={{padding:"12px 16px",borderTop:"1px solid #2a2a2a",display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:12,color:"#777",flexShrink:0}}>Ny aflæsning:</span>
          <input id="km-inline-field" type="number"
            value={kmInlineEdit ? kmInlineVal : ""}
            placeholder={`${(mc.km||0).toLocaleString("da-DK")} km`}
            onChange={e=>{ setKmInlineVal(e.target.value); setKmInlineEdit(true); }}
            onKeyDown={e=>{ if(e.key==="Enter"&&kmInlineVal){onUpdateKm&&onUpdateKm(Number(kmInlineVal));setKmInlineEdit(false);setKmInlineVal("");} }}
            style={{...inp,flex:1,padding:"7px 10px",fontSize:13}}/>
          <button onClick={()=>{ if(kmInlineVal){onUpdateKm&&onUpdateKm(Number(kmInlineVal));setKmInlineEdit(false);setKmInlineVal("");} }}
            style={{background:"#cc0000",border:"none",color:"#fff",borderRadius:6,padding:"7px 14px",fontSize:13,fontWeight:700,cursor:"pointer",flexShrink:0}}>
            Gem
          </button>
        </div>
      </div>

    {/* ── SLUTSEDDEL MODAL ── */}
    {slutseddelModal&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,padding:16}}
        onClick={()=>{setSlutseddelModal(false);setResendSigId(null);}}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#1a1a1a",borderRadius:12,border:"1px solid #333",padding:24,width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <div>
              <div style={{fontWeight:700,fontSize:16,color:"#fff"}}>📄 Slutseddel</div>
              <div style={{fontSize:12,color:"#888",marginTop:2}}>{mc.reg} · {mc.beskrivelse}</div>
            </div>
            <button onClick={()=>{setSlutseddelModal(false);setResendSigId(null);}} style={{background:"transparent",border:"none",color:"#888",fontSize:20,cursor:"pointer"}}>✕</button>
          </div>

          {resendSigId&&(
            <div style={{background:"#2d1a0a",border:"1px solid #ffa36655",borderRadius:8,padding:"8px 12px",marginBottom:16,fontSize:12,color:"#ffa366"}}>
              🔄 Gensendelse — den tidligere underskriftsanmodning annulleres automatisk. Udfyld og bekræft købers oplysninger nedenfor.
            </div>
          )}

          {/* Auto-udfyldte MC-data */}
          <div style={{background:"#111",borderRadius:8,padding:12,marginBottom:16,fontSize:12,color:"#888"}}>
            <div style={{fontWeight:600,color:"#aaa",marginBottom:8}}>Auto-udfyldt fra systemet:</div>
            {[
              {l:"Mærke/model", v:mc.beskrivelse},
              {l:"Reg.nr.", v:mc.reg},
              {l:"Stelnummer", v:mc.stel},
              {l:"1. indregistrering", v:mc.foersteReg},
              {l:"Sidst syn", v:mc.syn},
              {l:"Kørte km", v:mc.km?(mc.km.toLocaleString("da-DK")+" km"):""},
            ].map(r=>r.v?(
              <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"1px solid #222"}}>
                <span style={{color:"#666"}}>{r.l}</span>
                <span style={{color:"#ccc",fontWeight:600}}>{r.v}</span>
              </div>
            ):null)}
          </div>

          {/* Køber formular */}
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
            <div style={{fontWeight:600,fontSize:13,color:"#ccc",marginBottom:4}}>Købers oplysninger:</div>
            {[
              {key:"navn",label:"Navn *",placeholder:"Fulde navn"},
              {key:"adresse",label:"Adresse *",placeholder:"Vejnavn og husnr."},
              {key:"postby",label:"Postnr./by *",placeholder:"f.eks. 6000 Kolding"},
              {key:"telefon",label:"Telefon",placeholder:""},
              {key:"email",label:"Email",placeholder:"f.eks. navn@mail.dk"},
              {key:"cpr",label:"CPR nr. *",placeholder:"f.eks. 010190-1234"},
              {key:"km",label:"Kørte km (bekræft eller ret)",placeholder:"f.eks. 12500",type:"number"},
              {key:"pris",label:"Købesum kr. *",placeholder:"f.eks. 45000",type:"number"},
            ].map(f=>(
              <div key={f.key}>
                <label style={{display:"block",fontSize:11,color:"#777",marginBottom:3,textTransform:"uppercase",letterSpacing:.5}}>{f.label}</label>
                <input type={f.type||"text"} value={køberForm[f.key]} placeholder={f.placeholder}
                  onChange={e=>setKøberForm(p=>({...p,[f.key]:e.target.value}))}
                  style={{...inp,width:"100%",boxSizing:"border-box"}}/>
              </div>
            ))}
          </div>

          {/* Sælger oplyser */}
          {(()=>{
            const jnv = (key) => (
              <div style={{display:"flex",gap:4,marginTop:4}}>
                {[["ja","Ja"],["nej","Nej"],["vednot","Ved ikke"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setKøberForm(p=>({...p,[key]:v}))}
                    style={{flex:1,padding:"4px 0",fontSize:11,fontWeight:600,borderRadius:5,border:"1px solid #444",cursor:"pointer",
                      background:køberForm[key]===v?"#cc0000":"#2a2a2a",
                      color:køberForm[key]===v?"#fff":"#aaa"}}>
                    {l}
                  </button>
                ))}
              </div>
            );
            const sektionHdr = (t) => (
              <div style={{background:"#2a2a2a",borderRadius:6,padding:"7px 10px",fontWeight:700,fontSize:12,color:"#ddd",marginTop:14,marginBottom:6}}>{t}</div>
            );
            const spg = (nr, tekst, key, extra) => (
              <div key={key} style={{marginBottom:8}}>
                <div style={{fontSize:11,color:"#bbb"}}><span style={{color:"#888",marginRight:4}}>{nr}</span>{tekst}</div>
                {extra || jnv(key)}
              </div>
            );
            return (
              <>
                {sektionHdr("Sælger oplyser")}
                {spg("1)","Er motoren udskiftet?","s1")}
                {spg("2)","Fortsat fabriksgaranti?","s2")}
                {spg("3)","Dok. for serviceeftersyn hos aut. forhandler?","s3")}
                {spg("4)","Dok. for regelmæssig eftersyn på værksted?","s4")}
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:11,color:"#bbb",marginBottom:4}}><span style={{color:"#888",marginRight:4}}>5)</span>Tidligere anvendelse</div>
                  <div style={{display:"flex",gap:4}}>
                    {[["privat","Privat"],["motorsport","Motorsport"],["skolekørsel","Skolekørsel"]].map(([v,l])=>(
                      <button key={v} onClick={()=>setKøberForm(p=>({...p,s5:v}))}
                        style={{flex:1,padding:"4px 0",fontSize:11,fontWeight:600,borderRadius:5,border:"1px solid #444",cursor:"pointer",
                          background:køberForm.s5===v?"#cc0000":"#2a2a2a",
                          color:køberForm.s5===v?"#fff":"#aaa"}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                {spg("6)","Har motorcyklen været skadet?","s6")}
                {spg("6b)","Større reparationer?","s6b")}
                {spg("7)","Er motorcyklen helt/delvis omlakeret?","s7")}
                {spg("8)","Har motorcyklen kørt om vinteren?","s8")}
                {spg("9)","Dok. for vinteropbevaring hos forhandler?","s9")}

                {sektionHdr("Prøvekørsel")}
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:11,color:"#bbb",marginBottom:4}}>Motorcyklen er prøvekørt af køber</div>
                  <div style={{display:"flex",gap:4}}>
                    {[["ja","Ja"],["nej","Nej"]].map(([v,l])=>(
                      <button key={v} onClick={()=>setKøberForm(p=>({...p,proevekørt:v}))}
                        style={{flex:1,padding:"4px 0",fontSize:11,fontWeight:600,borderRadius:5,border:"1px solid #444",cursor:"pointer",
                          background:køberForm.proevekørt===v?"#cc0000":"#2a2a2a",
                          color:køberForm.proevekørt===v?"#fff":"#aaa"}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {sektionHdr("Vi har forsikret MC'en med:")}
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  {[["forsForsikrAnsvar","Ansvar"],["forsForsikrKasko","Kasko"]].map(([key,l])=>(
                    <button key={key} onClick={()=>setKøberForm(p=>({...p,[key]:!p[key]}))}
                      style={{flex:1,padding:"5px 0",fontSize:11,fontWeight:600,borderRadius:5,border:"1px solid #444",cursor:"pointer",
                        background:køberForm[key]?"#cc0000":"#2a2a2a",
                        color:køberForm[key]?"#fff":"#aaa"}}>
                      {l}
                    </button>
                  ))}
                </div>

                {sektionHdr("Omregistrering – købers forsikring")}
                <div style={{marginBottom:8}}>
                  <label style={{display:"block",fontSize:11,color:"#777",marginBottom:3,textTransform:"uppercase",letterSpacing:.5}}>Angiv købers forsikringsselskab *</label>
                  <input value={køberForm.køberOmregSelskab} placeholder="f.eks. Tryg Forsikring"
                    onChange={e=>setKøberForm(p=>({...p,køberOmregSelskab:e.target.value}))}
                    style={{...inp,width:"100%",boxSizing:"border-box"}}/>
                </div>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  {[["kasko","Kasko"],["ansvar","Ansvar"]].map(([val,label])=>(
                    <button key={val} onClick={()=>setKøberForm(p=>({...p,køberOmregForsikring:val}))}
                      style={{flex:1,padding:"5px 0",fontSize:11,fontWeight:600,borderRadius:5,border:"1px solid #444",cursor:"pointer",
                        background:køberForm.køberOmregForsikring===val?"#cc0000":"#2a2a2a",
                        color:køberForm.køberOmregForsikring===val?"#fff":"#aaa"}}>
                      {label}
                    </button>
                  ))}
                </div>
              </>
            );
          })()}

          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button onClick={async()=>{
              if(!køberForm.navn||!køberForm.adresse||!køberForm.postby||!køberForm.pris){
                alert("Udfyld venligst navn, adresse, postnr./by og købesum");
                return;
              }
              if(!køberForm.email){
                alert("Email er påkrævet for digital underskrift");
                return;
              }
              if(!køberForm.cpr){
                alert("CPR nr. er påkrævet");
                return;
              }
              if(!køberForm.køberOmregSelskab){
                alert("Angiv købers forsikringsselskab");
                return;
              }
              const result = await genSlutseddel(mc, køberForm);
              if(!result) return;
              const currentResendId = resendSigId;
              setSlutseddelModal(false);
              setResendSigId(null);
              notify("Sender til digital underskrift...");
              try {
                const resp = await fetch("/.netlify/functions/firma-sign", {
                  method:"POST",
                  headers:{"Content-Type":"application/json"},
                  body:JSON.stringify({
                    pdfBase64: result.base64,
                    buyerEmail: køberForm.email,
                    buyerName: køberForm.navn,
                    mcReg: mc.reg,
                    mcId: mc.id,
                    sigPage: result.totalPages,
                    buyerAdresse: køberForm.adresse,
                    buyerPostby: køberForm.postby,
                    buyerTelefon: køberForm.telefon,
                    prisKr: Number(String(køberForm.pris||"0").replace(/[^0-9]/g,"")),
                    ...(currentResendId ? { oldSigId: currentResendId } : {}),
                  }),
                });
                const data = await resp.json();
                if(data.success) {
                  notify(currentResendId ? "Slutseddel gensendt til underskrift! Tjek email." : "Slutseddel sendt til underskrift! Tjek email.");
                  db("signatures?mc_id=eq."+mc.id+"&order=created_at.desc&limit=1")
                    .then(rows=>setSigStatus(rows.length>0?rows[0]:null))
                    .catch(()=>{});
                } else {
                  notify("Fejl ved afsendelse: "+(data.error||"ukendt fejl"));
                }
              } catch(e) {
                notify("Kunne ikke sende til underskrift: "+e.message);
              }
            }} style={{...btnRed,flex:1,justifyContent:"center",padding:"12px"}}>
              {resendSigId ? "🔄 Gensend til underskrift" : "✍ Generer og send til underskrift"}
            </button>
            <button onClick={()=>{setSlutseddelModal(false);setResendSigId(null);}} style={{...btnGhost,padding:"12px 16px"}}>Annuller</button>
          </div>
        </div>
      </div>
    )}

    </div>
  );
}

// Klik-for-fuld-skærm billede modal
function FotoModal({src, onClose}) {
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9998,padding:16,cursor:"zoom-out"}}>
      <img src={src} alt="" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain",borderRadius:8,boxShadow:"0 8px 40px rgba(0,0,0,0.8)"}}/>
      <button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"rgba(0,0,0,0.6)",border:"1px solid #555",color:"#fff",borderRadius:8,padding:"8px 14px",fontSize:14,cursor:"pointer",fontWeight:600}}>✕ Luk</button>
    </div>
  );
}

function NummerpladeScanner({onResult, onClose, mcs=[]}) {
  React.useEffect(() => {
    const doneRef = {current: false};
    let stream = null;

    // Debug log
    const debugLog = [];
    const addDebug = (label, val) => {
      const line = `${label}: ${typeof val==="object"?JSON.stringify(val):val}`;
      debugLog.push(line);
      console.log("[Scanner]", line);
      const el = document.getElementById("debug-lines");
      if(el) el.innerHTML = [...debugLog].reverse().slice(0,15).map(l =>
        `<div style="border-bottom:1px solid #1a1a1a;padding:2px 0;${l.includes("FEJL")?"color:#f87171;":l.includes("Claude")?"color:#4ade80;":""}">${l}</div>`
      ).join("");
    };

    // ── Portal ──
    const portal = document.createElement("div");
    portal.style.cssText = "position:fixed;inset:0;z-index:9999;background:#000;font-family:system-ui,sans-serif;overflow:hidden;";
    document.body.appendChild(portal);

    // ── Video ──
    const video = document.createElement("video");
    video.setAttribute("playsinline","");
    video.setAttribute("muted","");
    video.setAttribute("autoplay","");
    video.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;";
    portal.appendChild(video);

    // ── Ramme ──
    const BOX_W = Math.min(window.innerWidth * 0.82, 340);
    const BOX_H = Math.round(BOX_W * 0.9);
    const BOX_TOP = Math.round(window.innerHeight * 0.20);

    const dimCanvas = document.createElement("canvas");
    dimCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:5;pointer-events:none;";
    portal.appendChild(dimCanvas);

    function drawDim() {
      const W = window.innerWidth, H = window.innerHeight;
      dimCanvas.width = W; dimCanvas.height = H;
      const ctx = dimCanvas.getContext("2d");
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0,0,W,H);
      const bx=(W-BOX_W)/2, by=BOX_TOP;
      ctx.clearRect(bx,by,BOX_W,BOX_H);
      ctx.strokeStyle="#cc0000"; ctx.lineWidth=3;
      const cSize=28;
      [[bx,by],[bx+BOX_W,by],[bx,by+BOX_H],[bx+BOX_W,by+BOX_H]].forEach(([x,y],i)=>{
        const dx=i%2===0?1:-1, dy=i<2?1:-1;
        ctx.beginPath();
        ctx.moveTo(x+dx*cSize,y); ctx.lineTo(x,y); ctx.lineTo(x,y+dy*cSize);
        ctx.stroke();
      });
    }
    drawDim();

    // ── Vejledning ──
    const vejEl = document.createElement("div");
    vejEl.style.cssText = `position:absolute;top:${BOX_TOP-48}px;left:50%;transform:translateX(-50%);color:#fff;font-size:14px;text-align:center;z-index:10;width:90%;`;
    vejEl.textContent = "Ret kameraet mod nummerpladen";
    portal.appendChild(vejEl);

    // ── Status ──
    const statusEl = document.createElement("div");
    statusEl.style.cssText = `position:absolute;left:50%;transform:translateX(-50%);top:${BOX_TOP+BOX_H+16}px;color:#fff;font-size:14px;text-align:center;padding:8px 20px;background:rgba(0,0,0,0.7);border-radius:8px;width:88%;z-index:10;`;
    statusEl.textContent = "Starter kamera...";
    portal.appendChild(statusEl);
    function setStatus(txt,color="#fff"){statusEl.textContent=txt;statusEl.style.color=color;}

    // ── Foto-knap (stor, central) ──
    const fotoBtn = document.createElement("button");
    fotoBtn.style.cssText = `position:absolute;left:50%;transform:translateX(-50%);bottom:${window.innerHeight-BOX_TOP-BOX_H-180 < 80 ? 20 : window.innerHeight-BOX_TOP-BOX_H-160}px;width:72px;height:72px;border-radius:50%;background:#cc0000;border:4px solid #fff;z-index:20;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:28px;box-shadow:0 4px 20px rgba(0,0,0,0.5);`;
    fotoBtn.innerHTML = "📸";
    fotoBtn.title = "Tag billede af nummerpladen";
    // Placér knappen under rammen
    fotoBtn.style.top = `${BOX_TOP + BOX_H + 70}px`;
    fotoBtn.style.bottom = "";
    portal.appendChild(fotoBtn);

    // ── Forslag ──
    const forslagDiv = document.createElement("div");
    forslagDiv.style.cssText = `position:absolute;inset:0;background:rgba(0,0,0,0.92);z-index:30;display:none;flex-direction:column;align-items:center;justify-content:center;padding:24px;`;
    portal.appendChild(forslagDiv);

    // ── Debug panel ──
    const debugPanel = document.createElement("div");
    debugPanel.style.cssText = "position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.9);z-index:25;padding:8px 10px;max-height:35vh;overflow-y:auto;display:none;";
    debugPanel.innerHTML = `<div style="color:#888;font-size:10px;margin-bottom:4px;display:flex;justify-content:space-between;"><span>🔍 DEBUG</span><button id="debug-close" style="background:none;border:1px solid #555;color:#888;border-radius:4px;padding:2px 8px;font-size:10px;cursor:pointer;">Luk</button></div><div id="debug-lines" style="font-size:11px;color:#4ade80;font-family:monospace;line-height:1.6;"></div>`;
    portal.appendChild(debugPanel);
    const debugBtn = document.createElement("button");
    debugBtn.textContent="🐛";
    debugBtn.style.cssText="position:absolute;top:16px;left:16px;background:rgba(0,0,0,0.5);border:1px solid #444;color:#666;border-radius:6px;padding:6px 10px;font-size:14px;cursor:pointer;z-index:26;";
    debugBtn.onclick=()=>{debugPanel.style.display=debugPanel.style.display==="none"?"block":"none";};
    portal.appendChild(debugBtn);
    setTimeout(()=>{ const el=document.getElementById("debug-close"); if(el) el.onclick=()=>{debugPanel.style.display="none";}; },100);

    // ── Annuller ──
    // Preview billede — vises kort inden Claude svarer
    const previewEl = document.createElement("img");
    previewEl.style.cssText = `position:absolute;left:${(window.innerWidth-BOX_W)/2}px;top:${BOX_TOP}px;width:${BOX_W}px;height:${BOX_H}px;object-fit:cover;z-index:8;display:none;border:3px solid #fff;border-radius:4px;opacity:0.9;`;
    portal.appendChild(previewEl);

    const btnClose = document.createElement("button");
    btnClose.textContent="✕ Annuller";
    btnClose.style.cssText="position:absolute;top:16px;right:16px;background:rgba(0,0,0,0.7);border:1px solid #555;color:#fff;border-radius:8px;padding:10px 16px;font-size:14px;cursor:pointer;font-weight:600;z-index:30;";
    btnClose.onclick=()=>{cleanup();onClose();};
    portal.appendChild(btnClose);

    // ── Levenshtein + matching (samme som før) ──
    const levenshtein=(a,b)=>{
      const m=a.length,n=b.length;
      const dp=Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(_,j)=>i===0?j:j===0?i:0));
      for(let i=1;i<=m;i++) for(let j=1;j<=n;j++)
        dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
      return dp[m][n];
    };
    const normReg=s=>(s||"").toUpperCase().replace(/\s+/g,"");
    const rettCifre=s=>s.replace(/O/g,"0").replace(/Q/g,"0")
      .replace(/I/g,"1").replace(/L/g,"1").replace(/H/g,"1")
      .replace(/S/g,"5").replace(/B/g,"8").replace(/G/g,"6").replace(/Z/g,"2");
    const rettBogstaver=s=>s.replace(/0/g,"O").replace(/1/g,"I").replace(/5/g,"S").replace(/8/g,"B");

    const scoreMod=(oc,rn)=>{
      if(!oc||oc.length<3) return Infinity;
      const ocBog=oc.substring(0,2), ocTal=oc.substring(2);
      const rnBog=rn.substring(0,2), rnTal=rn.substring(2);
      const bogDist=Math.min(
        levenshtein(ocBog,rnBog),
        levenshtein(rettBogstaver(ocBog),rnBog),
        levenshtein(ocBog.replace(/E/g,"F").replace(/F/g,"E"),rnBog)
      );
      const ocTalRet=rettCifre(ocTal);
      const talDist=Math.min(
        levenshtein(ocTal,rnTal),
        levenshtein(ocTalRet,rnTal),
        ocTalRet.length<rnTal.length?Math.min(...Array.from({length:rnTal.length-ocTalRet.length+1},(_,i)=>levenshtein(ocTalRet,rnTal.substring(i,i+ocTalRet.length)))):Infinity
      );
      return bogDist*1.5+talDist;
    };

    const findBedsteMC=(ocrTekst)=>{
      const ren=ocrTekst.toUpperCase().replace(/[^A-Z0-9]/g,"");
      if(ren.length<3) return null;

      // ── Trin 1: Eksakt match i ALLE MC'er (inkl. solgte) — Claude er præcis ──
      const eksakt = mcs.find(m => normReg(m.reg) === ren);
      if(eksakt) {
        addDebug("Match", `EKSAKT: ${eksakt.reg} (${eksakt.location})`);
        return {mc:eksakt, score:0, usikker:false, top3:[{mc:eksakt,score:0}]};
      }

      // ── Trin 2: Fuzzy match — kun aktive MC'er ──
      const alleMcs=mcs.filter(m=>m.location&&!["Solgte MC'er","MC til salg"].includes(m.location));
      const kandidater=new Set();
      for(let L=3;L<=9;L++) for(let i=0;i<=ren.length-L;i++) kandidater.add(ren.substring(i,i+L));
      const scores=alleMcs.map(mc=>{
        const rn=normReg(mc.reg);
        if(rn.length<5) return {mc,score:Infinity};
        let best=Infinity;
        for(const k of kandidater){
          const s=scoreMod(k.substring(0,rn.length),rn);
          if(s<best) best=s;
        }
        return {mc,score:best};
      }).sort((a,b)=>a.score-b.score);
      const top5=scores.slice(0,5).map(s=>`${s.mc.reg}(${s.score.toFixed(1)})`);
      addDebug("Top 5",top5.join(", "));
      const bedste=scores[0], anden=scores[1];
      if(!bedste||bedste.score>3.5){addDebug("Match",`afvist score=${bedste?.score?.toFixed(1)}`);return null;}
      if(anden&&(anden.score-bedste.score)<0.3){
        return {mc:bedste.mc,score:bedste.score,usikker:true,top3:scores.slice(0,3)};
      }
      addDebug("Match",`fuzzy: ${bedste.mc.reg} score=${bedste.score.toFixed(1)}`);
      return {mc:bedste.mc,score:bedste.score,usikker:false,top3:scores.slice(0,3)};
    };

    // ── Claude Vision via Netlify Function (API-nøgle er server-side) ──
    async function claudeOCR(base64img) {
      const resp = await fetch("/.netlify/functions/plate-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64img, mode: "strict" }),
      });
      if (!resp.ok) {
        const errTxt = await resp.text().catch(()=>"");
        throw new Error("OCR fejl " + resp.status + " " + errTxt.substring(0,100));
      }
      const data = await resp.json();
      return data.tekst || "";
    }

    // Blød fallback OCR — bedste gæt selv ved delvist synlig/sløret plade
    async function claudeOCRBlød(base64img) {
      const resp = await fetch("/.netlify/functions/plate-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64img, mode: "blød" }),
      });
      if (!resp.ok) throw new Error("OCR fejl " + resp.status);
      const data = await resp.json();
      return data.tekst || "";
    }


    // Beregn crop-koordinater fra skærm-ramme til video-pixels
    function beregnCrop(vw, vh) {
      const rect=video.getBoundingClientRect();
      const scaleX=rect.width/vw, scaleY=rect.height/vh;
      const bx=(window.innerWidth-BOX_W)/2, by=BOX_TOP;
      const padding=0.05;
      const s2vX=sx=>Math.round((sx-rect.left)/scaleX);
      const s2vY=sy=>Math.round((sy-rect.top)/scaleY);
      return {
        cropX: Math.max(0,s2vX(bx-BOX_W*padding)),
        cropY: Math.max(0,s2vY(by-BOX_H*padding)),
        cropW: Math.max(50,Math.min(vw,s2vX(bx+BOX_W*(1+padding)))-Math.max(0,s2vX(bx-BOX_W*padding))),
        cropH: Math.max(50,Math.min(vh,s2vY(by+BOX_H*(1+padding)))-Math.max(0,s2vY(by-BOX_H*padding))),
      };
    }

    async function tagOgAnalyser() {
      if(doneRef.current) return;
      fotoBtn.disabled=true;
      fotoBtn.style.opacity="0.5";
      setStatus("📸 Tager billede...");

      try {
        let base64Fuld = null;
        let base64Crop = null;

        // ── Metode A: ImageCapture.takePhoto() — autofokus stillbillede ──
        const track = stream?.getVideoTracks?.()?.[0];
        if(track && typeof ImageCapture !== "undefined") {
          try {
            setStatus("📸 Fokuserer...");
            const imageCapture = new ImageCapture(track);
            const caps = track.getCapabilities?.();
            const photoSettings = {};
            if(caps?.imageWidth?.max) photoSettings.imageWidth = caps.imageWidth.max;
            if(caps?.imageHeight?.max) photoSettings.imageHeight = caps.imageHeight.max;
            const blob = await imageCapture.takePhoto(photoSettings);
            addDebug("ImageCapture", `${Math.round(blob.size/1024)}KB`);
            const img = await createImageBitmap(blob);
            // Fuld billede skaleret til max 1920px
            const scale = Math.min(1, 1920/Math.max(img.width, img.height));
            const cF=document.createElement("canvas");
            cF.width=Math.round(img.width*scale); cF.height=Math.round(img.height*scale);
            cF.getContext("2d").drawImage(img,0,0,cF.width,cF.height);
            base64Fuld=cF.toDataURL("image/jpeg",0.92);
            // Crop til preview
            const {cropX,cropY,cropW,cropH}=beregnCrop(img.width,img.height);
            const cC=document.createElement("canvas");
            cC.width=cropW; cC.height=cropH;
            cC.getContext("2d").drawImage(img,cropX,cropY,cropW,cropH,0,0,cropW,cropH);
            base64Crop=cC.toDataURL("image/jpeg",0.92);
            addDebug("Foto",`${cF.width}x${cF.height}px fuld, crop:${cropW}x${cropH}`);
          } catch(icErr) {
            addDebug("ImageCapture fejl",icErr.message);
          }
        }

        // ── Metode B: Video-frame fallback ──
        if(!base64Fuld) {
          const vw=video.videoWidth, vh=video.videoHeight;
          if(!vw||!vh) throw new Error("Kamera ikke klar");
          const scale=Math.min(1,1920/Math.max(vw,vh));
          const cF=document.createElement("canvas");
          cF.width=Math.round(vw*scale); cF.height=Math.round(vh*scale);
          cF.getContext("2d").drawImage(video,0,0,cF.width,cF.height);
          base64Fuld=cF.toDataURL("image/jpeg",0.92);
          const {cropX,cropY,cropW,cropH}=beregnCrop(vw,vh);
          const cC=document.createElement("canvas");
          cC.width=cropW; cC.height=cropH;
          cC.getContext("2d").drawImage(video,cropX,cropY,cropW,cropH,0,0,cropW,cropH);
          base64Crop=cC.toDataURL("image/jpeg",0.92);
          addDebug("Foto (video)",`${cF.width}x${cF.height}px`);
        }

        // Vis crop-preview
        if(base64Crop){previewEl.src=base64Crop;previewEl.style.display="block";}

        // ── Send HELE billedet til Claude Sonnet ──
        setStatus("🔍 Analyserer nummerplate...");
        const claudeTekst=await claudeOCR(base64Fuld);
        addDebug("Claude",claudeTekst);

        // Hvis INGEN — prøv med blødere prompt
        if(!claudeTekst||claudeTekst.toUpperCase().includes("INGEN")||claudeTekst.length<3){
          setStatus("🔍 Prøver igen...");
          const tekst2=await claudeOCRBlød(base64Fuld);
          addDebug("Claude blød",tekst2);
          if(tekst2&&tekst2.length>=3&&!tekst2.toUpperCase().includes("INGEN")){
            const r2=findBedsteMC(tekst2);
            if(r2){doneRef.current=true;visForslagUI(r2,tekst2);return;}
          }
          setStatus("Ingen plade fundet — ret kameraet mod pladen");
          fotoBtn.disabled=false;fotoBtn.style.opacity="1";
          return;
        }

        const resultat=findBedsteMC(claudeTekst);
        if(!resultat){
          setStatus(`OCR: ${claudeTekst} — ingen match i systemet`);
          fotoBtn.disabled=false;fotoBtn.style.opacity="1";
          return;
        }
        doneRef.current=true;
        visForslagUI(resultat,claudeTekst);

      } catch(e) {
        addDebug("FEJL",e.message);
        setStatus("Fejl: "+e.message);
        previewEl.style.display="none";
        fotoBtn.disabled=false;fotoBtn.style.opacity="1";
        doneRef.current=false;
      }
    }


    function visForslagUI(resultat,ocrRaa) {
      const mc=resultat.mc||resultat;
      const usikker=resultat.usikker||false;
      const top3=resultat.top3||[];

      const altHtml=usikker&&top3.length>1?`
        <div style="font-size:11px;color:#888;margin-bottom:10px;text-align:left;border-top:1px solid #333;padding-top:10px;">Vælg alternativ:
          ${top3.slice(1,3).map((t,i)=>`
            <div id="alt-btn-${i}" style="padding:10px 12px;margin-top:6px;background:#252525;border:1px solid #444;border-radius:8px;cursor:pointer;">
              <div style="font-family:monospace;font-size:15px;font-weight:700;color:#fff;letter-spacing:2px;">${t.mc.reg}</div>
              <div style="font-size:11px;color:#888;margin-top:2px;">${t.mc.beskrivelse||""} · ${t.mc.location||""}</div>
            </div>`).join("")}
        </div>`:"";

      forslagDiv.style.display="flex";
      forslagDiv.innerHTML=`
        <div style="background:#1a1a1a;border:2px solid ${usikker?"#f59e0b":"#cc0000"};border-radius:16px;padding:24px;text-align:center;width:100%;max-width:320px;">
          <div style="font-size:11px;color:${usikker?"#f59e0b":"#4ade80"};font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
            ${usikker?"⚠ Usikkert — bekræft":"✓ MC fundet i systemet"}
          </div>
          <div style="font-size:32px;font-weight:900;color:#fff;letter-spacing:4px;font-family:monospace;margin-bottom:4px;">${mc.reg}</div>
          <div style="font-size:13px;color:#aaa;margin-bottom:3px;">${mc.beskrivelse||""}</div>
          <div style="font-size:12px;color:#cc6666;margin-bottom:10px;">📍 ${mc.location||""}</div>
          ${ocrRaa?`<div style="font-size:10px;color:#555;margin-bottom:12px;">Claude læste: ${String(ocrRaa).substring(0,20)}</div>`:""}
          ${altHtml}
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:8px;">
            <button id="btn-accept" style="background:#cc0000;border:none;color:#fff;border-radius:8px;padding:13px 24px;font-size:15px;font-weight:700;cursor:pointer;">✓ Åbn denne MC</button>
            <button id="btn-retry" style="background:#252525;border:1px solid #444;color:#ccc;border-radius:8px;padding:13px 16px;font-size:13px;font-weight:600;cursor:pointer;">📸 Prøv igen</button>
          </div>
        </div>`;

      document.getElementById("btn-accept").onclick=()=>{cleanup();onResult(mc);};
      document.getElementById("btn-retry").onclick=()=>{
        forslagDiv.style.display="none";
        previewEl.style.display="none";
        doneRef.current=false;
        fotoBtn.disabled=false;
        fotoBtn.style.opacity="1";
        setStatus("Ret kameraet mod pladen og tryk 📸");
      };
      top3.slice(1,3).forEach((t,i)=>{
        const el=document.getElementById(`alt-btn-${i}`);
        if(el) el.onclick=()=>{cleanup();onResult(t.mc);};
      });
    }

    function cleanup() {
      if(stream) stream.getTracks().forEach(t=>t.stop());
      if(portal.parentNode) portal.parentNode.removeChild(portal);
    }

    fotoBtn.onclick=tagOgAnalyser;

    // Start kamera
    navigator.mediaDevices.getUserMedia({
      video:{facingMode:"environment",width:{ideal:1920},height:{ideal:1080}}
    }).then(s=>{
      stream=s;
      video.srcObject=s;
      video.play();
      setStatus("Klar — ret mod pladen og tryk 📸");
    }).catch(e=>{
      setStatus("Kamera fejl: "+e.message);
      addDebug("Kamera FEJL",e.message);
    });

    return ()=>{ cleanup(); };
  },[]);
  return null;
}

function QrScanner({onResult,onClose}) {
  React.useEffect(()=>{
    const doneRef={current:false};
    let sc=null;

    // Portal
    const portal=document.createElement("div");
    portal.style.cssText="position:fixed;inset:0;z-index:9999;font-family:system-ui,sans-serif;overflow:hidden;background:#000;";
    document.body.appendChild(portal);

    // html5-qrcode scan container — fylder hele portalen
    const scanDiv=document.createElement("div");
    scanDiv.id="qr-h5-area";
    scanDiv.style.cssText="position:absolute;inset:0;";
    portal.appendChild(scanDiv);

    // Vores custom overlay med sigte-hjørner — ligger OVER scanDiv
    const overlay=document.createElement("div");
    overlay.style.cssText="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;z-index:10;";
    overlay.innerHTML=`
      <div style="width:200px;height:200px;position:relative;">
        <div style="position:absolute;top:0;left:0;width:28px;height:28px;border-top:3px solid #fff;border-left:3px solid #fff;border-radius:2px 0 0 0;"></div>
        <div style="position:absolute;top:0;right:0;width:28px;height:28px;border-top:3px solid #fff;border-right:3px solid #fff;border-radius:0 2px 0 0;"></div>
        <div style="position:absolute;bottom:0;left:0;width:28px;height:28px;border-bottom:3px solid #fff;border-left:3px solid #fff;border-radius:0 0 0 2px;"></div>
        <div style="position:absolute;bottom:0;right:0;width:28px;height:28px;border-bottom:3px solid #fff;border-right:3px solid #fff;border-radius:0 0 2px 0;"></div>
      </div>
      <div id="qr-status-txt" style="margin-top:18px;color:#ccc;font-size:14px;text-align:center;padding:0 20px;">Hold QR-koden inden for rammen</div>
    `;
    portal.appendChild(overlay);

    // Annuller knap
    const btn=document.createElement("button");
    btn.textContent="Annuller";
    btn.style.cssText="position:absolute;bottom:48px;left:50%;transform:translateX(-50%);background:#cc0000;border:none;color:#fff;border-radius:10px;padding:14px 40px;font-size:16px;cursor:pointer;font-weight:700;z-index:11;";
    btn.onclick=()=>{ cleanup(); onClose(); };
    portal.appendChild(btn);

    // CSS: tving html5-qrcode's interne video til fuld skærm og skjul library's egne UI-elementer
    // Bruger !important på ALLE dimensioner så inline styles fra library overskrives
    const style=document.createElement("style");
    style.id="qr-hide-lib-ui";
    style.textContent=`
      #qr-h5-area, #qr-h5-area > div {
        position:absolute !important; top:0 !important; left:0 !important;
        width:100% !important; height:100% !important;
        overflow:hidden !important;
      }
      #qr-h5-area video {
        position:absolute !important; top:0 !important; left:0 !important;
        width:100% !important; height:100% !important;
        object-fit:cover !important; opacity:1 !important;
        display:block !important; visibility:visible !important;
      }
      #qr-h5-area span, #qr-h5-area img,
      #qr-h5-area div[style*="border:"] { display:none !important; }
    `;
    document.head.appendChild(style);

    function cleanup(){
      doneRef.current=true;
      if(sc){ try{ sc.stop().catch(()=>{}); sc.clear(); }catch(e){} sc=null; }
      if(portal.parentNode) portal.parentNode.removeChild(portal);
      const st=document.getElementById("qr-hide-lib-ui");
      if(st&&st.parentNode) st.parentNode.removeChild(st);
    }

    // Skjult canvas til center-crop decode
    const cropCanvas=document.createElement("canvas");
    cropCanvas.style.display="none";
    portal.appendChild(cropCanvas);
    let cropLoop=null;
    let nativeDetector=null;
    try{ if(window.BarcodeDetector) nativeDetector=new window.BarcodeDetector({formats:["qr_code"]}); }catch(e){}

    // Decode én center-crop: henter video-frame, cropper den centrale 200px-region,
    // skalerer op til 400px og forsøger native BarcodeDetector → Html5Qrcode.scanFile fallback
    function decodeCrop(video){
      if(doneRef.current||!video||video.readyState<2) return;
      const vw=video.videoWidth, vh=video.videoHeight;
      if(!vw||!vh) return;
      // Beregn crop-region svarende til vores 200px overlay-ramme i video-koordinater
      const screenW=window.innerWidth, screenH=window.innerHeight;
      const scaleX=vw/screenW, scaleY=vh/screenH;
      const cropPx=200; // matcher overlay-rammen
      const cropW=Math.round(cropPx*scaleX), cropH=Math.round(cropPx*scaleY);
      const cropX=Math.round((vw-cropW)/2), cropY=Math.round((vh-cropH)/2);
      // Skaler crop op til 400px for at give decoder flere pixels per QR-modul
      const OUT=400;
      cropCanvas.width=OUT; cropCanvas.height=OUT;
      const ctx=cropCanvas.getContext("2d");
      ctx.drawImage(video, cropX,cropY,cropW,cropH, 0,0,OUT,OUT);

      if(nativeDetector){
        nativeDetector.detect(cropCanvas).then(codes=>{
          if(codes.length>0) onDecoded(codes[0].rawValue);
        }).catch(()=>{});
      } else if(window.Html5Qrcode){
        // Brug scanFile API til at decode én canvas-frame
        cropCanvas.toBlob(blob=>{
          if(!blob||doneRef.current) return;
          const file=new File([blob],"frame.jpg",{type:"image/jpeg"});
          const tmp=new window.Html5Qrcode("qr-tmp-decode",{verbose:false});
          tmp.scanFile(file,false).then(decoded=>{ tmp.clear(); onDecoded(decoded); }).catch(()=>{ try{tmp.clear();}catch(e){} });
        },"image/jpeg",0.92);
      }
    }

    function startCropLoop(video){
      // Kør crop-decode hvert 800ms — færre men skarpere forsøg
      cropLoop=setInterval(()=>decodeCrop(video),800);
    }

    function onDecoded(value){
      if(doneRef.current) return;
      doneRef.current=true;
      if(cropLoop){clearInterval(cropLoop);cropLoop=null;}
      const el=portal.querySelector("#qr-status-txt");
      if(el){el.style.color="#22c55e";el.textContent="✓ "+value;}
      setTimeout(()=>{ cleanup(); onResult(value); },500);
    }

    function cleanup(){
      doneRef.current=true;
      if(cropLoop){clearInterval(cropLoop);cropLoop=null;}
      if(sc){ try{ sc.stop().catch(()=>{}); sc.clear(); }catch(e){} sc=null; }
      if(portal.parentNode) portal.parentNode.removeChild(portal);
      const st=document.getElementById("qr-hide-lib-ui");
      if(st&&st.parentNode) st.parentNode.removeChild(st);
      const tmp=document.getElementById("qr-tmp-decode");
      if(tmp&&tmp.parentNode) tmp.parentNode.removeChild(tmp);
    }

    // Skjult div til Html5Qrcode.scanFile (kræver et DOM-element med id)
    const tmpDiv=document.createElement("div");
    tmpDiv.id="qr-tmp-decode";
    tmpDiv.style.display="none";
    document.body.appendChild(tmpDiv);

    function startScanner(){
      if(!window.Html5Qrcode){
        const el=portal.querySelector("#qr-status-txt");
        if(el) el.textContent="❌ Scanner ikke indlæst";
        return;
      }
      const W=window.innerWidth, H=window.innerHeight;
      scanDiv.style.cssText=`position:absolute;top:0;left:0;width:${W}px;height:${H}px;`;
      sc=new window.Html5Qrcode("qr-h5-area",{verbose:false});
      // qrbox=1px: library scanner stadig hele frame, men viser ingen synlig scan-boks
      // (vores custom overlay viser rammen)
      sc.start(
        {facingMode:"environment"},
        {fps:6, qrbox:{width:1,height:1}, videoConstraints:{facingMode:"environment",width:{ideal:1920},height:{ideal:1080}}, experimentalFeatures:{useBarCodeDetectorIfSupported:false}},
        (decoded)=>{ onDecoded(decoded); },
        ()=>{}
      ).then(()=>{
        // Når library kører: find dens interne video-element og start crop-loop
        const vid=scanDiv.querySelector("video");
        if(vid){
          if(vid.readyState>=2){ startCropLoop(vid); }
          else{ vid.addEventListener("loadeddata",()=>startCropLoop(vid),{once:true}); }
        }
      }).catch(e=>{
        const el=portal.querySelector("#qr-status-txt");
        if(el) el.textContent="❌ "+String(e).slice(0,80);
      });
    }

    if(window.Html5Qrcode){
      requestAnimationFrame(startScanner);
    } else {
      const s=document.createElement("script");
      s.src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
      s.onload=()=>requestAnimationFrame(startScanner);
      s.onerror=()=>{
        const el=portal.querySelector("#qr-status-txt");
        if(el) el.textContent="❌ Netværksfejl";
      };
      document.head.appendChild(s);
    }

    return ()=>{ cleanup(); };
  },[]);

  return null;
}


// Udtræk sammenlignbare felter fra MotorAPI svar
// Feltnavne bekræftet fra live API-svar:
// first_registration = "2020-12-15+01:00" (rod-niveau)
// mot_info.date = "2025-02-18" (sidst syn)
// mot_info.next_inspection_date = null eller dato
function getFelterFraData(data, mc, synsData) {
  if(!data && !synsData) return [];

  const norm = raw => raw ? raw.split("+")[0].split("T")[0] : "";

  // ── Synsbasen felter (primær kilde) ──
  const sb = synsData ? synsbasenFelter(synsData) : {};

  // ── MotorAPI felter (fallback hvis Synsbasen mangler) ──
  const motorStel       = data?.vin || "";
  const motorFoerste    = norm(data?.first_registration || data?.first_registration_date || "");
  const motorSyn        = norm(data?.mot_info?.date || "");
  const motorNaesteSyn  = data?._naesteSyn || "";
  const motorBeskr      = [data?.make, data?.model, data?.variant].filter(Boolean).join(" ").toUpperCase();

  // Brug Synsbasen hvis den har data, ellers MotorAPI
  const stel       = sb.stel       || motorStel;
  const foerste    = sb.foersteReg || motorFoerste;
  const synDato    = sb.syn        || motorSyn;
  const naesteSyn  = sb.naesteSyn  || motorNaesteSyn;
  const beskr      = sb.beskrivelse|| motorBeskr;

  return [
    {felt:"stel",       label:"Stelnummer (VIN)",      api:stel,       mc:mc?.stel||""},
    {felt:"beskrivelse",label:"Beskrivelse",            api:beskr,      mc:mc?.beskrivelse||""},
    {felt:"foersteReg", label:"1. indregistrering",    api:foerste,    mc:mc?.foersteReg||""},
    {felt:"syn",        label:"Sidst syn",              api:synDato,    mc:mc?.syn||""},
    {felt:"naesteSyn",  label:"Næste syn",              api:naesteSyn,  mc:mc?.naesteSyn||""},
  ].filter(f => f.api);
}

function MotorApiKnap({reg, mc, onOverskriv, btnGhost}) {
  // Alle hooks SKAL stå øverst — ingen hooks efter conditional return (React regel)
  const [loading, setLoading] = React.useState(false);
  const [apiData, setApiData] = React.useState(null);
  const [fejl, setFejl] = React.useState("");
  const [vis, setVis] = React.useState(false);
  const [valgte, setValgte] = React.useState({});

  // Log rå API-data til konsol så vi kan se feltnavne
  React.useEffect(() => {
    if(!apiData) return;
    console.log("MotorAPI rå svar:", JSON.stringify(apiData, null, 2));
    const felter = getFelterFraData(apiData, mc, synsData);
    setValgte(Object.fromEntries(felter.map(f=>[f.felt, f.api!==f.mc])));
  }, [apiData]);

  const [synsData, setSynsData] = React.useState(null);
  const slaaOp = async () => {
    if(!reg||reg.trim().length<5) { setFejl("Indtast reg.nr først"); return; }
    setLoading(true); setFejl(""); setApiData(null); setSynsData(null); setVis(false);
    try {
      // Hent MotorAPI og Synsbasen parallelt
      const [motorRes, synsRes] = await Promise.allSettled([
        motorApi(reg),
        synsbasenApi(reg),
      ]);
      const data = motorRes.status==="fulfilled" ? motorRes.value : null;
      const sdata = synsRes.status==="fulfilled" ? synsRes.value : null;
      // Kræv mindst én af dem
      if(!data && !sdata) { setFejl("Ingen data fundet for dette reg.nr"); setLoading(false); return; }
      if(data && sdata?.next_inspection_date_estimate) data._naesteSyn = sdata.next_inspection_date_estimate;
      setApiData(data);
      setSynsData(sdata);
      setVis(true);
    } catch(e) { setFejl("Fejl: "+e.message); }
    setLoading(false);
  };

  // Beregn felter til visning
  const getFelter = () => getFelterFraData(apiData, mc);

  const anvend = () => {
    const felter = getFelter();
    const opdateringer = {};
    felter.forEach(f=>{ if(valgte[f.felt]&&f.api) opdateringer[f.felt]=f.api; });
    if(Object.keys(opdateringer).length>0&&onOverskriv) onOverskriv(opdateringer);
    setVis(false);
  };

  if(!vis||!apiData) return (
    <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #222"}}>
      <button onClick={slaaOp} disabled={loading} style={{...btnGhost,fontSize:12,padding:"7px 14px",opacity:loading?0.6:1}}>
        {loading?"⏳ Henter...":"🔍 Slå op i motorregistret"}
      </button>
      {fejl&&<div style={{marginTop:6,fontSize:12,color:"#f87171"}}>{fejl}</div>}
    </div>
  );

  const felter = getFelter();
  const apiStatus = apiData.registration?.status||"";

  return (
    <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #222"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{fontSize:12,color:"#60a5fa",fontWeight:700}}>
          🔍 {[apiData.make,apiData.model].filter(Boolean).join(" ")||"Motorregistret"}
          {apiStatus&&<span style={{marginLeft:6,color:apiStatus==="registreret"?"#4ade80":"#f87171",fontSize:11}}>({apiStatus})</span>}
        </span>
        <button onClick={()=>setVis(false)} style={{background:"none",border:"none",color:"#666",cursor:"pointer",fontSize:16}}>✕</button>
      </div>

      {felter.map(f=>{
        const forskel=f.api!==f.mc;
        return (
          <div key={f.felt} style={{padding:"8px 0",borderBottom:"1px solid #1a1a1a"}}>
            <div style={{fontSize:11,color:"#666",marginBottom:3}}>{f.label}</div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:0}}>
                {f.mc&&<div style={{fontSize:11,color:"#888",marginBottom:1}}>Nuværende: <span style={{color:"#aaa"}}>{f.mc}</span></div>}
                <div style={{fontSize:12,color:forskel?"#f59e0b":"#4ade80",fontWeight:600}}>API: {f.api}</div>
              </div>
              {forskel&&<label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",flexShrink:0}}>
                <input type="checkbox" checked={valgte[f.felt]||false}
                  onChange={e=>setValgte(p=>({...p,[f.felt]:e.target.checked}))}
                  style={{accentColor:"#cc0000",width:16,height:16}}/>
                <span style={{fontSize:11,color:"#ccc"}}>Brug API</span>
              </label>}
              {!forskel&&<span style={{fontSize:11,color:"#4ade80",fontSize:11}}>✓ Ens</span>}
            </div>
          </div>
        );
      })}

      <div style={{marginTop:12,display:"flex",gap:8}}>
        <button onClick={anvend} style={{background:"#cc0000",border:"none",color:"#fff",borderRadius:7,padding:"9px 18px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          Anvend valgte
        </button>
        <button onClick={()=>{setVis(false);setApiData(null);}} style={{...btnGhost,fontSize:12,padding:"9px 14px"}}>Annuller</button>
        <button onClick={slaaOp} disabled={loading} style={{...btnGhost,fontSize:12,padding:"9px 14px",marginLeft:"auto",opacity:loading?0.6:1}}>
          {loading?"⏳":"↺"} Opdater
        </button>
      </div>
    </div>
  );
}

function RedigerMc({mc,setMc,onSave,onCancel,locations,inp,btnRed,btnGhost}) {
  const [scannerOpen,setScannerOpen]=useState(false);


  return (
    <div style={{paddingBottom:20}}>
      {scannerOpen&&<QrScanner
        onResult={val=>{ setMc(p=>({...p,gps:val})); setScannerOpen(false); }}
        onClose={()=>setScannerOpen(false)}
      />}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
        <button onClick={onCancel} style={{...btnGhost,fontSize:13,padding:"8px 14px"}}>← Tilbage</button>
        <h1 style={{margin:0,fontSize:20,fontWeight:700,color:"#fff"}}>{mc.reg||("Ny "+(mc.type||"MC"))}</h1>

      </div>

      <div style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",padding:"18px 16px",display:"flex",flexDirection:"column",gap:14}}>
        {/* MC Nummer */}
        {[{key:"mcNr",l:"MC Nummer",type:"number"}].map(f=>(
          <div key={f.key}>
            <label style={{display:"block",fontSize:11,color:"#777",letterSpacing:.8,marginBottom:4,fontWeight:600,textTransform:"uppercase"}}>{f.l}</label>
            <input type={f.type||"text"} value={mc[f.key]||""} onChange={e=>setMc(p=>({...p,[f.key]:e.target.value}))} style={{...inp,WebkitAppearance:"none",appearance:"none",maxWidth:"100%"}}/>
          </div>
        ))}

        {/* Reg.nr + MotorAPI knap direkte under */}
        <div>
          <label style={{display:"block",fontSize:11,color:"#777",letterSpacing:.8,marginBottom:4,fontWeight:600,textTransform:"uppercase"}}>Registreringsnummer</label>
          <input type="text" value={mc.reg||""} onChange={e=>setMc(p=>({...p,reg:e.target.value}))} style={{...inp,WebkitAppearance:"none",appearance:"none",maxWidth:"100%"}}/>
        </div>
        {/* MotorAPI opslag — placeret lige under reg.nr */}
        <MotorApiKnap reg={mc.reg} mc={mc} onOverskriv={(opdateringer)=>{
          setMc(p=>({...p,...opdateringer}));
        }} btnGhost={btnGhost}/>

        {/* Øvrige felter */}
        {[{key:"stel",l:"Stelnummer"},{key:"beskrivelse",l:"Beskrivelse"},{key:"foersteReg",l:"1. indregistrering",type:"date"},{key:"syn",l:"Sidst syn — næste beregnes automatisk (+2 år)",type:"date"},{key:"km",l:"Kilometertal",type:"number"}].map(f=>(
          <div key={f.key}>
            <label style={{display:"block",fontSize:11,color:"#777",letterSpacing:.8,marginBottom:4,fontWeight:600,textTransform:"uppercase"}}>{f.l}</label>
            <input type={f.type||"text"} value={mc[f.key]||""} onChange={e=>setMc(p=>({...p,[f.key]:e.target.value}))} style={{...inp,WebkitAppearance:"none",appearance:"none",maxWidth:"100%"}}/>
          </div>
        ))}

        {/* GPS felt med QR-scanner */}
        <div>
          <label style={{display:"block",fontSize:11,color:"#777",letterSpacing:.8,marginBottom:4,fontWeight:600,textTransform:"uppercase"}}>GPS NUMMER</label>
          <div style={{display:"flex",gap:8}}>
            <input type="text" value={mc.gps||""} onChange={e=>setMc(p=>({...p,gps:e.target.value}))}
              placeholder="Manuelt eller scan QR..." style={{...inp,flex:1}}/>
            <button onClick={()=>setScannerOpen(true)}
              title="Scan QR-kode"
              style={{...btnRed,padding:"0 14px",fontSize:20,flexShrink:0,borderRadius:8}}>
              ▦
            </button>
          </div>
          {mc.gps&&<div style={{fontSize:11,color:"#22c55e",marginTop:4}}>✓ {mc.gps}</div>}
        </div>

        <div>
          <label style={{display:"block",fontSize:11,color:"#777",letterSpacing:.8,marginBottom:4,fontWeight:600,textTransform:"uppercase"}}>KØRETØJSTYPE</label>
          <select value={mc.type||"MC"} onChange={e=>setMc(p=>({...p,type:e.target.value}))} style={inp}>
            <option value="MC">🏍 MC</option>
            <option value="Bil">🚗 Bil</option>
            <option value="Trailer">🚛 Trailer</option>
          </select>
        </div>
        <div>
          <label style={{display:"block",fontSize:11,color:"#777",letterSpacing:.8,marginBottom:4,fontWeight:600,textTransform:"uppercase"}}>LOKATION</label>
          <select value={mc.location} onChange={e=>setMc(p=>({...p,location:e.target.value}))} style={inp}>
            {locations.map(l=><option key={l}>{l}</option>)}
          </select>
        </div>
        <div style={{display:"flex",gap:10,marginTop:4}}>
          <button onClick={onSave} style={{...btnRed,flex:1,justifyContent:"center",padding:"12px"}}>GEM</button>
          <button onClick={onCancel} style={{...btnGhost,padding:"12px 18px"}}>Annuller</button>
        </div>
      </div>
    </div>
  );
}

// ── Stepper button ─────────────────────────────────────────────────────────────
function Stepper({value,onChange,min=0}) {
  const s={background:"#cc0000",border:"none",color:"#fff",width:28,height:28,borderRadius:5,fontWeight:700,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0};
  return (
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <button style={s} onClick={()=>onChange(Math.max(min,value-1))}>−</button>
      <span style={{minWidth:28,textAlign:"center",fontWeight:700,fontSize:14}}>{value}</span>
      <button style={s} onClick={()=>onChange(value+1)}>+</button>
    </div>
  );
}

function NyFakturaView({faktura,setFaktura,mc,ydelser,addLinje,removeLinje,setAntal,setPrisL,fakTotal,onGem,onCancel,inp,btnRed,btnGhost,fmt,editMode}) {
  // Diverse dele state
  const [divBeskrivelse,setDivBeskrivelse]=useState("");
  const [divPris,setDivPris]=useState("");
  const [divAntal,setDivAntal]=useState(1);

  const total=fakTotal(faktura.linjer);

  const addDivers=()=>{
    if(!divBeskrivelse||!divPris) return;
    const yId="DIV_"+Date.now();
    setFaktura(f=>({...f,linjer:[...f.linjer,{yId,nr:"DIV",navn:divBeskrivelse,pris:Number(divPris),antal:divAntal,divers:true}]}));
    setDivBeskrivelse(""); setDivPris(""); setDivAntal(1);
  };

  const sectionHead = (title) => (
    <div style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:10}}>{title}</div>
  );

  const card = (children, extraStyle={}) => (
    <div style={{background:"#b30000",borderRadius:10,padding:"14px 14px",marginBottom:12,...extraStyle}}>
      {children}
    </div>
  );

  return (
    <div style={{paddingBottom:24}}>
      {/* Header */}
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
        <button onClick={onCancel} style={{...btnGhost,fontSize:13,padding:"8px 14px"}}>← Tilbage</button>
        <h1 style={{margin:0,fontSize:18,fontWeight:700,color:"#fff"}}>{editMode?"Rediger faktura":"Tilføj reparation"} — {mc.reg}</h1>
      </div>

      {/* Dato + km row */}
      <div style={{display:"flex",gap:12,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{minWidth:160}}>
          <label style={{display:"block",fontSize:11,color:"#ffdddd",marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>Dato</label>
          <input type="date" value={faktura.dato} onChange={e=>setFaktura(p=>({...p,dato:e.target.value}))} style={{...inp,background:"#b30000",border:"1px solid #ff4444",color:"#fff"}}/>
        </div>
        <div style={{minWidth:130}}>
          <label style={{display:"block",fontSize:11,color:"#ffdddd",marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>Km ved service</label>
          <input type="number" value={faktura.km||""} placeholder={mc?.km||""}
            onChange={e=>setFaktura(p=>({...p,km:Number(e.target.value)||0}))}
            style={{...inp,background:"#b30000",border:"1px solid #ff4444",color:"#fff"}}/>
        </div>
      </div>

      {/* Responsive layout - 1 col mobile, 2 col desktop */}
      <style>{`.fak-form{display:flex;flex-direction:column;gap:12px;}@media(min-width:600px){.fak-form{display:grid;grid-template-columns:1fr 1fr;}}`}</style>
      <div className="fak-form">

        {/* ── Basis dele ── */}
        <div>
          {card(<>
            {sectionHead("Basis dele")}
            <div style={{display:"flex",flexDirection:"column",gap:2,marginBottom:10}}>
              {ydelser.map(y=>{
                const linje=faktura.linjer.find(l=>l.yId===y.id&&!l.divers);
                const antal=linje?linje.antal:0;
                return (
                  <div key={y.id} style={{display:"flex",alignItems:"center",padding:"9px 0",borderBottom:"1px solid #cc000088",gap:10}}>
                    <span style={{flex:1,fontSize:14,color:"#fff",minWidth:0,wordBreak:"break-word"}}>{y.navn}</span>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      {antal>0&&<span style={{fontSize:13,color:"#4ade80",fontWeight:700,minWidth:56,textAlign:"right"}}>{fmt(antal*y.pris)} kr</span>}
                      <Stepper value={antal} min={0} onChange={v=>{
                        if(v===0){ removeLinje(y.id); return; }
                        if(!linje){ addLinje(y.id); if(v>1) setTimeout(()=>setAntal(y.id,v),0); }
                        else setAntal(y.id,v);
                      }}/>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reparationstitel - obligatorisk */}
            <div style={{marginBottom:8}}>
              <label style={{display:"block",fontSize:11,color:"#ffdddd",marginBottom:3,fontWeight:600}}>
                Reparationstitel <span style={{color:"#ff9999"}}>*</span>
              </label>
              <input placeholder="Skriv titel..." value={faktura.titel||""} onChange={e=>setFaktura(p=>({...p,titel:e.target.value}))}
                style={{...inp,background:"#cc0000",border:`1px solid ${faktura.titel?.trim()?"#ff6666":"#ff0000"}`,color:"#fff",
                  boxShadow:faktura.titel?.trim()?"none":"0 0 0 2px #ff000044"}}/>
              {!faktura.titel?.trim()&&<div style={{fontSize:11,color:"#ff9999",marginTop:3}}>Påkrævet</div>}
            </div>
            {/* Reparationsbeskrivelse - obligatorisk */}
            <div>
              <label style={{display:"block",fontSize:11,color:"#ffdddd",marginBottom:3,fontWeight:600}}>
                Reparationsbeskrivelse <span style={{color:"#ff9999"}}>*</span>
              </label>
              <textarea placeholder="Beskriv hændelse..." value={faktura.note} onChange={e=>setFaktura(p=>({...p,note:e.target.value}))} rows={3}
                style={{...inp,background:"#cc0000",border:`1px solid ${faktura.note?.trim()?"#ff6666":"#ff0000"}`,color:"#fff",resize:"vertical",
                  boxShadow:faktura.note?.trim()?"none":"0 0 0 2px #ff000044"}}/>
              {!faktura.note?.trim()&&<div style={{fontSize:11,color:"#ff9999",marginTop:3}}>Påkrævet</div>}
            </div>
          </>)}
        </div>

        {/* ── Diverse dele ── */}
        <div>
          {card(<>
            {sectionHead("Diverse dele")}
            <div style={{marginBottom:8}}>
              <label style={{display:"block",fontSize:11,color:"#ffdddd",marginBottom:3,fontWeight:600}}>Beskrivelse</label>
              <input placeholder="Skriv beskrivelse..." value={divBeskrivelse} onChange={e=>setDivBeskrivelse(e.target.value)}
                style={{...inp,background:"#cc0000",border:"1px solid #ff6666",color:"#fff"}}/>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"flex-end",marginBottom:12,flexWrap:"wrap"}}>
              <div style={{flex:"1 1 100px",minWidth:80}}>
                <label style={{display:"block",fontSize:11,color:"#ffdddd",marginBottom:3,fontWeight:600}}>Pris (kr)</label>
                <input placeholder="0" type="number" value={divPris} onChange={e=>setDivPris(e.target.value)}
                  style={{...inp,background:"#cc0000",border:"1px solid #ff6666",color:"#fff"}}/>
              </div>
              <div style={{flexShrink:0}}>
                <label style={{display:"block",fontSize:11,color:"#ffdddd",marginBottom:3,fontWeight:600}}>Antal</label>
                <Stepper value={divAntal} onChange={setDivAntal} min={1}/>
              </div>
              <button onClick={addDivers} disabled={!divBeskrivelse||!divPris}
                style={{...btnRed,background:divBeskrivelse&&divPris?"#1a1a1a":"#555",padding:"10px 14px",fontSize:13,flexShrink:0,whiteSpace:"nowrap"}}>
                + TILFØJ
              </button>
            </div>
            {faktura.linjer.filter(l=>l.divers).length>0&&(
              <div style={{background:"#1a1a1a",borderRadius:8,overflow:"hidden"}}>
                {faktura.linjer.filter(l=>l.divers).map((l,i)=>(
                  <div key={l.yId} style={{display:"flex",alignItems:"center",padding:"9px 12px",borderBottom:"1px solid #2a2a2a",gap:8}}>
                    <button onClick={()=>removeLinje(l.yId)} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:16,padding:0,lineHeight:1,flexShrink:0}}>✕</button>
                    <span style={{flex:1,fontSize:13,fontWeight:600,minWidth:0}}>{l.antal>1?`${l.antal}× `:""}{l.navn}</span>
                    <span style={{fontSize:12,color:"#ccc",flexShrink:0}}>{fmt(l.pris)} kr</span>
                    <span style={{fontSize:13,color:"#4ade80",fontWeight:700,minWidth:56,textAlign:"right",flexShrink:0}}>{fmt(l.antal*l.pris)} kr</span>
                  </div>
                ))}
              </div>
            )}
          </>)}
        </div>
      </div>

      {/* Total + Gem */}
      <div style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",padding:"14px 16px"}}>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,color:"#777",marginBottom:2,fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>Total</div>
          <div style={{fontWeight:800,fontSize:22,color:"#4ade80"}}>{fmt(total)} kr</div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{...btnGhost,flex:1,justifyContent:"center",padding:"12px"}}>Annuller</button>
          <button onClick={onGem} style={{...btnRed,flex:2,justifyContent:"center",padding:"12px",fontSize:14}}>{editMode?"GEM ÆNDRINGER":"TILFØJ REPARATION"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Opgaver ───────────────────────────────────────────────────────────────────
function OpgaverView({opgaver,setOpgaver,locations,notify,visForm,setVisForm,inp,btnRed,btnGhost,onFotoKlik}) {
  const [search,setSearch]=useState("");
  const [filterLoc,setFilterLoc]=useState("Alle");
  const [filterStatus,setFilterStatus]=useState("aktive");
  const [form,setForm]=useState({titel:"",beskrivelse:"",lokation:locations[0],senestUdfoert:new Date().toISOString().split("T")[0],foto:""});

  const tilfoej=()=>{
    if(!form.titel.trim()){notify("Skriv en titel",true);return;}
    const ny={id:Date.now(),titel:form.titel.trim(),beskrivelse:form.beskrivelse.trim(),lokation:form.lokation,senestUdfoert:form.senestUdfoert,oprettet:new Date().toISOString().split("T")[0],udfoert:false,udfoertDato:null,mcId:null,mcReg:"",foto:form.foto||""};
    setOpgaver(p=>[ny,...p]);
    db("opgaver",{method:"POST",body:JSON.stringify(opgToDb(ny)),prefer:"return=minimal"}).catch(e=>console.error("DB:",e));
    setForm({titel:"",beskrivelse:"",lokation:locations[0],senestUdfoert:new Date().toISOString().split("T")[0],foto:""});
    setVisForm(false);
    notify("Opgave oprettet ✓");
  };

  const markerUdfoert=(id)=>{
    const dato=new Date().toISOString().split("T")[0];
    setOpgaver(p=>p.map(o=>o.id===id?{...o,udfoert:true,udfoertDato:dato}:o));
    db(`opgaver?id=eq.${id}`,{method:"PATCH",body:JSON.stringify({udfoert:true,udfoert_dato:dato}),prefer:"return=minimal"}).catch(e=>console.error("DB:",e));
    notify("Opgave markeret som udført ✓");
  };

  const slet=(id)=>{
    setOpgaver(p=>p.filter(o=>o.id!==id));
    db(`opgaver?id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}).catch(e=>console.error("DB:",e));
    notify("Opgave slettet");
  };

  const genaktiver=(id)=>{
    setOpgaver(p=>p.map(o=>o.id===id?{...o,udfoert:false,udfoertDato:null}:o));
    db(`opgaver?id=eq.${id}`,{method:"PATCH",body:JSON.stringify({udfoert:false,udfoert_dato:""}),prefer:"return=minimal"}).catch(e=>console.error("DB:",e));
    notify("Opgave genaktiveret");
  };

  const idag=new Date().toISOString().split("T")[0];
  const dageTil=(dato)=>Math.floor((new Date(dato)-new Date(idag))/86400000);

  const filtreret=opgaver.filter(o=>{
    if(filterStatus==="aktive"&&o.udfoert) return false;
    if(filterStatus==="udfoerte"&&!o.udfoert) return false;
    if(filterLoc!=="Alle"&&o.lokation!==filterLoc) return false;
    if(search&&!o.titel.toLowerCase().includes(search.toLowerCase())&&!o.beskrivelse.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sel={...inp,background:"#1e1e1e",border:"1px solid #333",height:38,padding:"0 10px",fontSize:13,width:"auto"};

  return (
    <div style={{paddingBottom:24}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,gap:10,flexWrap:"wrap"}}>
        <h1 style={{margin:0,fontSize:22,fontWeight:700,color:"#fff"}}>Opgaver</h1>
        <button onClick={()=>setVisForm(v=>!v)} style={{...btnRed,gap:8}}>
          <span style={{fontSize:18,lineHeight:1}}>+</span> Tilføj opgave
        </button>
      </div>

      {/* Opret form */}
      {visForm&&(
        <div style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #cc000055",padding:"18px 16px",marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:15,color:"#fff",marginBottom:14}}>Tilføj opgave</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <label style={{display:"block",fontSize:11,color:"#888",marginBottom:4,fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Titel</label>
              <input value={form.titel} onChange={e=>setForm(p=>({...p,titel:e.target.value}))} placeholder="Skriv titel..." style={inp}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,color:"#888",marginBottom:4,fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Beskrivelse</label>
              <textarea value={form.beskrivelse} onChange={e=>setForm(p=>({...p,beskrivelse:e.target.value}))} placeholder="Beskriv opgaven..." rows={3}
                style={{...inp,resize:"vertical"}}/>
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <div style={{flex:"1 1 140px"}}>
                <label style={{display:"block",fontSize:11,color:"#888",marginBottom:4,fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Senest udført d.</label>
                <input type="date" value={form.senestUdfoert} onChange={e=>setForm(p=>({...p,senestUdfoert:e.target.value}))} style={{...inp,WebkitAppearance:"none",colorScheme:"dark"}}/>
              </div>
              <div style={{flex:"1 1 140px"}}>
                <label style={{display:"block",fontSize:11,color:"#888",marginBottom:4,fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Lokation</label>
                <select value={form.lokation} onChange={e=>setForm(p=>({...p,lokation:e.target.value}))} style={inp}>
                  {locations.map(l=><option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
            {/* Foto upload */}
            <div>
              <label style={{display:"block",fontSize:11,color:"#888",marginBottom:4,fontWeight:600,letterSpacing:.8,textTransform:"uppercase"}}>Billede (valgfrit)</label>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <button onClick={()=>document.getElementById("opg-foto-input").click()}
                  style={{...btnGhost,fontSize:13,padding:"8px 14px",flexShrink:0}}>
                  📷 {form.foto?"Skift billede":"Upload billede"}
                </button>
                {form.foto&&<button onClick={()=>setForm(p=>({...p,foto:""}))} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:13}}>✕ Fjern</button>}
                <input id="opg-foto-input" type="file" accept="image/*" capture="environment" style={{display:"none"}}
                  onChange={e=>{
                    const file=e.target.files[0]; if(!file) return;
                    fixOgKomprimer(file, dataUrl => setForm(p=>({...p,foto:dataUrl})));
                    e.target.value="";
                  }}/>
              </div>
              {form.foto&&<img src={form.foto} alt="" style={{marginTop:8,width:"100%",maxHeight:120,objectFit:"cover",borderRadius:6}}/>}
            </div>
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <button onClick={tilfoej} style={{...btnRed,flex:1,justifyContent:"center",padding:"11px"}}>Tilføj opgave</button>
              <button onClick={()=>setVisForm(false)} style={{...btnGhost,padding:"11px 16px"}}>Annuller</button>
            </div>
          </div>
        </div>
      )}

      {/* Filtre */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:"1 1 180px",minWidth:0}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#666",fontSize:13,pointerEvents:"none"}}>🔍</span>
          <input placeholder="Søg efter opgave..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{...inp,paddingLeft:32,background:"#1e1e1e",border:"1px solid #333",height:38,fontSize:13}}/>
        </div>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={sel}>
          <option value="aktive">Aktive</option>
          <option value="udfoerte">Udførte</option>
          <option value="alle">Alle</option>
        </select>
        <select value={filterLoc} onChange={e=>setFilterLoc(e.target.value)} style={sel}>
          <option value="Alle">Alle afdelinger</option>
          {[...locations].sort((a,b)=>{
            const NEDERST=["Solgte MC'er","MC til salg","Lager / Depot"];
            const aLav=NEDERST.includes(a),bLav=NEDERST.includes(b);
            if(aLav&&!bLav) return 1; if(!aLav&&bLav) return -1;
            return a.localeCompare(b,"da");
          }).map(l=><option key={l}>{l}</option>)}
        </select>
      </div>

      {/* Liste */}
      {filtreret.length===0?(
        <div style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",padding:"40px 20px",textAlign:"center",color:"#555",fontSize:14}}>
          {opgaver.length===0?"Ingen opgaver endnu — tryk + Tilføj opgave":"Ingen opgaver matcher filteret"}
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtreret.map(o=>{
            const dage=dageTil(o.senestUdfoert);
            const udloebet=dage<0;
            const snart=dage>=0&&dage<=3;
            const fristFarve=o.udfoert?"#22c55e":udloebet?"#ef4444":snart?"#f59e0b":"#4ade80";
            const fristTekst=o.udfoert?`Udført ${fmtDato(o.udfoertDato)||""}`:udloebet?`Udløbet for ${Math.abs(dage)} dag${Math.abs(dage)===1?"":"e"} siden`:dage===0?"Udløber i dag":`${dage} dag${dage===1?"":"e"} tilbage`;
            return (
              <div key={o.id} style={{background:"#1a1a1a",borderRadius:10,border:`1px solid ${o.udfoert?"#22c55e22":udloebet?"#ef444433":snart?"#f59e0b33":"#2a2a2a"}`,overflow:"hidden",opacity:o.udfoert?0.7:1}}>
                <div style={{padding:"14px 16px"}}>
                  {/* Titel + lokation */}
                  <div style={{fontWeight:700,fontSize:15,color:o.udfoert?"#888":"#fff",marginBottom:4}}>{o.titel}</div>
                  <div style={{fontSize:12,color:"#cc6666",marginBottom:o.beskrivelse?6:0,fontWeight:600}}>📍 {o.lokation}</div>
                  {o.beskrivelse&&<div style={{fontSize:13,color:"#aaa",lineHeight:1.5,marginBottom:o.foto?8:10}}>{o.beskrivelse}</div>}
                  {o.foto&&<img src={o.foto} alt="" onClick={()=>onFotoKlik&&onFotoKlik(o.foto)} style={{width:"100%",maxHeight:160,objectFit:"cover",borderRadius:8,marginBottom:10,cursor:"zoom-in"}}/>}
                  {o.mcReg&&<div style={{fontSize:11,color:"#555",marginBottom:6,fontWeight:600}}>🏍 MC: {o.mcReg}</div>}
                  {/* Bund: dato boks + knapper */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginTop:10,flexWrap:"wrap"}}>
                    <div style={{background:"#252525",borderRadius:8,padding:"7px 12px",textAlign:"center"}}>
                      <div style={{fontSize:10,color:"#777",fontWeight:600,textTransform:"uppercase",marginBottom:1}}>Senest udført</div>
                      <div style={{fontSize:12,color:"#ccc",fontWeight:600}}>{fmtDato(o.senestUdfoert)}</div>
                      <div style={{fontSize:11,color:fristFarve,fontWeight:700,marginTop:3}}>{fristTekst}</div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0}}>
                      {!o.udfoert&&(
                        <button onClick={()=>markerUdfoert(o.id)} title="Marker som udført"
                          style={{background:"#1a3a2a",border:"1px solid #22c55e44",color:"#22c55e",borderRadius:6,padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:700}}>
                          ✓ Udført
                        </button>
                      )}
                      {o.udfoert&&(
                        <button onClick={()=>genaktiver(o.id)} title="Genaktiver"
                          style={{background:"#252525",border:"1px solid #444",color:"#888",borderRadius:6,padding:"8px 14px",cursor:"pointer",fontSize:12}}>
                          ↺ Genaktiver
                        </button>
                      )}
                      {o.udfoert&&(
                        <button onClick={()=>slet(o.id)} title="Slet"
                          style={{background:"#3b1a1a",border:"1px solid #cc000033",color:"#f87171",borderRadius:6,padding:"8px 12px",cursor:"pointer",fontSize:13}}>
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


function AlleFakturaer({fakturaer,onVis,onSætFaktureret,fmt,inp,btnGhost,filterFak,setFilterFak,filterAfd,setFilterAfd}) {
  const [search,setSearch]=useState("");
  const afdelinger=["Alle",...new Set(fakturaer.map(f=>f.afdeling).filter(Boolean))];
  const fil=fakturaer.filter(f=>{
    if(search&&!f.id.toLowerCase().includes(search.toLowerCase())&&!f.mcReg.toLowerCase().includes(search.toLowerCase())&&!(f.afdeling||"").toLowerCase().includes(search.toLowerCase())) return false;
    if(filterAfd!=="Alle"&&f.afdeling!==filterAfd) return false;
    if(filterFak==="faktureret"&&!f.faktureret) return false;
    if(filterFak==="ikkeFaktureret"&&f.faktureret) return false;
    return true;
  });
  const total=fil.reduce((s,f)=>s+f.total,0);
  return (
    <div style={{paddingBottom:20}}>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
        <h1 style={{margin:0,fontSize:22,fontWeight:700,color:"#fff"}}>Fakturaer</h1>
        <div style={{marginLeft:"auto",background:"#1a3a2a",borderRadius:8,padding:"7px 14px",border:"1px solid #22c55e33"}}>
          <span style={{color:"#888",fontSize:11}}>TOTAL: </span>
          <span style={{fontWeight:800,color:"#4ade80",fontSize:16}}>{fmt(total)} kr</span>
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <input placeholder="🔍  Søg..." value={search} onChange={e=>setSearch(e.target.value)} style={{...inp,maxWidth:220,background:"#1e1e1e",border:"1px solid #333",flex:"1 1 160px"}}/>
        <select value={filterAfd} onChange={e=>setFilterAfd(e.target.value)} style={{...inp,maxWidth:180,background:"#1e1e1e",border:"1px solid #333",flex:"1 1 140px"}}>
          {afdelinger.map(a=><option key={a}>{a}</option>)}
        </select>
        <select value={filterFak} onChange={e=>setFilterFak(e.target.value)} style={{...inp,maxWidth:200,background:"#1e1e1e",border:"1px solid #333",flex:"1 1 150px"}}>
          <option value="alle">Alle fakturaer</option>
          <option value="ikkeFaktureret">Ikke faktureret</option>
          <option value="faktureret">Faktureret</option>
        </select>
      </div>
      <div style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",overflow:"hidden"}}>
        {fil.length===0?(
          <div style={{padding:40,textAlign:"center",color:"#555",fontSize:14}}>{fakturaer.length===0?"Ingen fakturaer — opret fra en MC":"Ingen resultater"}</div>
        ):(
          <div>
            {fil.map((f,i)=>(
              <div key={f.id} className="tap"
                style={{background:i%2===0?"#1a1a1a":"#1e1e1e",borderBottom:"1px solid #222",padding:"11px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}
                onClick={()=>onVis(f)}>
                {/* Venstre: faktura nr + MC + afdeling */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                    <span style={{fontWeight:700,color:"#f87171",fontSize:13}}>{f.id}</span>
                    <span style={{fontWeight:600,fontSize:13,color:"#fff"}}>{f.mcReg}</span>
                  </div>
                  <div style={{fontSize:11,color:"#888",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {f.afdeling||"-"} · {fmtDato(f.dato)}{f.km?<span> · {f.km.toLocaleString("da-DK")} km</span>:null}
                  </div>
                </div>
                {/* Højre: total + status + pdf */}
                <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                  <span style={{fontWeight:700,color:"#4ade80",fontSize:13,whiteSpace:"nowrap"}}>{fmt(f.total)} kr</span>
                  <button onClick={e=>{e.stopPropagation();onSætFaktureret(f.id,!f.faktureret);}}
                    style={{background:f.faktureret?"#1a3a2a":"#2a2a2a",border:`1px solid ${f.faktureret?"#22c55e55":"#444"}`,
                      color:f.faktureret?"#4ade80":"#888",borderRadius:6,padding:"4px 8px",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                    {f.faktureret?"✓ Fak.":"○ Afv."}
                  </button>
                  <button onClick={e=>{e.stopPropagation();genPDF(f);}}
                    style={{background:"#252525",border:"1px solid #444",color:"#ccc",borderRadius:6,padding:"4px 8px",fontSize:10,fontWeight:700,cursor:"pointer"}}>
                    ⬇
                  </button>
                  <span style={{color:"#555",fontSize:14}}>›</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FakturaDetalje({faktura,onBack,onRediger,onSætFaktureret,fmt,btnGhost,btnRed,lokationer=[],notify,isAdmin=false}) {
  const [sender,setSender] = React.useState(false);
  const [sendtStatus,setSendtStatus] = React.useState(null);

  const sendEconomic = async () => {
    setSender(true); setSendtStatus(null);
    try {
      const lok = lokationer.find(l => l.navn === faktura.afdeling);
      const dim = lok?.dimension ? Number(lok.dimension) : (ECO_DIM[faktura.afdeling] ?? 99);
      // Konverter dato til ISO format (YYYY-MM-DD) som e-conomic kræver
      // Databasen gemmer i DD-MM-YYYY (dansk format)
      const normToIso = d => {
        if(!d) return new Date().toISOString().split("T")[0];
        const s = d.split("T")[0]; // fjern evt. tid
        const p = s.split("-");
        if(p.length === 3 && p[0].length === 2) {
          // DD-MM-YYYY -> YYYY-MM-DD
          return p[2] + "-" + p[1] + "-" + p[0];
        }
        return s; // allerede ISO format
      };
      const dato = normToIso(faktura.dato);
      const tekst = (faktura.id + " - " + (faktura.mcReg||"") + " - " + (faktura.titel||faktura.afdeling||"")).substring(0,255);
      const total = Number(faktura.total) || 0;

      // Korrekt format for restapi.e-conomic.com/journals-experimental
      // To finanslinjer i én postering:
      // Linje 1: Debit afdeling  → positiv med departmentNumber
      // Linje 2: Kredit modkonto → negativ, contraAccount
      // Byg voucher — prøv først uden department for at isolere fejl
      // To posteringslinjer der balancerer:
      // Linje 1: Debit (-) på afd. 99 — kredit/indtægt til Hovedafdelingen
      // Linje 2: Kredit (+) på den relevante afdeling — debit/omkostning
      const linje1 = {
        date: dato, text: tekst,
        account: { accountNumber: ECO_KONTO },
        amount: -total,
        departmentalDistribution: { departmentalDistributionNumber: 99, distributionType: "department" },
      };
      const linje2 = {
        date: dato, text: tekst,
        account: { accountNumber: ECO_KONTO },
        amount: total,
        departmentalDistribution: { departmentalDistributionNumber: dim, distributionType: "department" },
      };

      const voucher = {
        date: dato,
        journal: { journalNumber: ECO_KLADDE },
        entries: { financeVouchers: [linje1, linje2] },
      };

      // Hent åbent regnskabsår der matcher fakturadatoen
      const years = await ecoApi("GET", "/accounting-years");
      const alleAar = years?.collection || [];
      const matchendeAar = alleAar.find(y => {
        if(y.closed) return false;
        return dato >= y.fromDate && dato <= y.toDate;
      });
      if(!matchendeAar) {
        throw new Error("Intet åbent regnskabsår dækker datoen " + dato + ". Tjek Regnskab → Regnskabsår i e-conomic.");
      }
      console.log("Bruger regnskabsår:", matchendeAar.year, matchendeAar.fromDate, "→", matchendeAar.toDate);

      // Tilføj regnskabsår på voucher-niveau
      voucher.accountingYear = { year: matchendeAar.year };

      console.log("e-conomic payload:", JSON.stringify(voucher, null, 2));
      const res = await ecoApi("POST", "/journals-experimental/" + ECO_KLADDE + "/vouchers", voucher);
      console.log("e-conomic svar:", JSON.stringify(res, null, 2));
      // Svaret er et array — tag første element
      const resItem = Array.isArray(res) ? res[0] : res;
      const vNr = resItem?.voucherNumber || null;
      // Hent den fulde attachment URL direkte fra svaret (format: 2026-1000008)
      const attachmentUrl = resItem?.attachment || null;
      const voucherSelf = resItem?.self || null;
      console.log("voucherNumber:", vNr, "attachmentUrl:", attachmentUrl);

      // Vedhæft PDF til bilag via multipart/form-data (krævet af e-conomic)
      if(vNr) {
        try {
          // Generer PDF med jsPDF
          const jsPDFLoaded = await new Promise((res, rej) => {
            if(window.jspdf) { res(window.jspdf.jsPDF); return; }
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
            s.onload = () => res(window.jspdf.jsPDF);
            s.onerror = rej;
            document.head.appendChild(s);
          });
          const doc = new jsPDFLoaded({orientation:"portrait",unit:"mm",format:"a4"});
          const W=210,M=18;
          let y=20;
          doc.setFontSize(16); doc.setFont("helvetica","bold"); doc.setTextColor(180,0,0);
          doc.text("FAKTURA " + faktura.id, M, y); y+=8;
          doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(60,60,60);
          doc.text("MC: " + (faktura.mcReg||"") + "   Dato: " + (faktura.dato||"") + "   Afdeling: " + (faktura.afdeling||""), M, y); y+=5;
          if(faktura.titel) { doc.text("Titel: " + faktura.titel, M, y); y+=5; }
          if(faktura.note)  { doc.text("Note: " + faktura.note, M, y); y+=5; }
          y+=3;
          doc.setFontSize(8); doc.setTextColor(120,120,120);
          doc.text("Beskrivelse", M, y); doc.text("Antal", M+110, y); doc.text("Pris", M+140, y); doc.text("Total", M+165, y);
          y+=3; doc.setDrawColor(200,200,200); doc.line(M,y,W-M,y); y+=4;
          doc.setTextColor(40,40,40);
          (faktura.linjer||[]).forEach(l => {
            const navn = String(l.navn||"").substring(0,55);
            const lTotal = Number((l.antal||1)*(l.pris||0));
            doc.text(navn, M, y);
            doc.text(String(l.antal||1), M+110, y);
            doc.text(Number(l.pris||0).toLocaleString("da-DK",{minimumFractionDigits:2}) + " kr", M+155, y, {align:"right"});
            doc.text(lTotal.toLocaleString("da-DK",{minimumFractionDigits:2}) + " kr", M+178, y, {align:"right"});
            y+=5; if(y>270){doc.addPage();y=20;}
          });
          y+=3; doc.line(M,y,W-M,y); y+=6;
          doc.setFontSize(11); doc.setFont("helvetica","bold");
          doc.text("TOTAL:", M+115, y);
          doc.text(Number(faktura.total||0).toLocaleString("da-DK",{minimumFractionDigits:2}) + " kr", M+178, y, {align:"right"});

          // Konverter til Blob
          const pdfBlob = doc.output("blob");
          const attachBase = attachmentUrl || (ECO_BASE + "/journals-experimental/" + ECO_KLADDE + "/vouchers/" + vNr + "/attachment");
          console.log("PDF attachment URL:", attachBase);

          // e-conomic journals attachment — prøv alle kendte metoder
          const ecoHeaders = {
            "X-AppSecretToken": ECO_APP,
            "X-AgreementGrantToken": ECO_GRANT,
          };

          // Metode A: PATCH med multipart/form-data (journals-bloggen nævner PATCH til vedhæftninger)
          const formA = new FormData();
          formA.append("file", pdfBlob, faktura.id + ".pdf");
          let uploadOk = false;
          let uploadRes = await fetch(attachBase, {
            method: "PATCH", headers: ecoHeaders, body: formA,
          }).catch(e => ({ ok: false, status: "net-err", text: () => Promise.resolve(e.message) }));
          console.log("PATCH attachment:", uploadRes.status);

          if(uploadRes.ok) {
            uploadOk = true;
            console.log("PDF vedhæftet via PATCH til bilag", vNr);
          }

          // Metode B: PUT med raw PDF binary (Content-Type: application/pdf)
          if(!uploadOk) {
            uploadRes = await fetch(attachBase, {
              method: "PUT",
              headers: { ...ecoHeaders, "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=\"" + faktura.id + ".pdf\"" },
              body: pdfBlob,
            }).catch(e => ({ ok: false, status: "net-err", text: () => Promise.resolve(e.message) }));
            console.log("PUT raw PDF attachment:", uploadRes.status);
            if(uploadRes.ok) {
              uploadOk = true;
              console.log("PDF vedhæftet via PUT raw til bilag", vNr);
            }
          }

          // Metode C: POST til /file med multipart
          if(!uploadOk) {
            const formC = new FormData();
            formC.append("file", pdfBlob, faktura.id + ".pdf");
            uploadRes = await fetch(attachBase + "/file", {
              method: "POST", headers: ecoHeaders, body: formC,
            }).catch(e => ({ ok: false, status: "net-err", text: () => Promise.resolve(e.message) }));
            console.log("POST /file attachment:", uploadRes.status);
            if(uploadRes.ok) {
              uploadOk = true;
              console.log("PDF vedhæftet via POST /file til bilag", vNr);
            }
          }

          // Metode D: PUT med multipart/form-data
          if(!uploadOk) {
            const formD = new FormData();
            formD.append("file", pdfBlob, faktura.id + ".pdf");
            uploadRes = await fetch(attachBase, {
              method: "PUT", headers: ecoHeaders, body: formD,
            }).catch(e => ({ ok: false, status: "net-err", text: () => Promise.resolve(e.message) }));
            console.log("PUT multipart attachment:", uploadRes.status);
            if(uploadRes.ok) {
              uploadOk = true;
              console.log("PDF vedhæftet via PUT multipart til bilag", vNr);
            }
          }

          if(!uploadOk) {
            const errTxt = await uploadRes.text?.().catch(()=>"") || "";
            console.warn("PDF vedhæftning fejlede med alle metoder. Sidste svar:", uploadRes.status, errTxt);
          }
        } catch(pdfErr) {
          console.warn("PDF vedhæftning fejlede:", pdfErr.message);
          // Postering er stadig oprettet
        }
      }

      setSendtStatus("ok");
      notify && notify("✓ Sendt til e-conomic — bilag " + (vNr||"?") + " i kassekladde " + ECO_KLADDE);
      await onSætFaktureret(faktura.id, true);
      setTimeout(() => onBack(), 1200);
    } catch(e) {
      setSendtStatus("fejl");
      notify && notify("e-conomic fejl: " + e.message, true);
    }
    setSender(false);
  };

  return (
    <div style={{paddingBottom:20}}>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
        <button onClick={onBack} style={{...btnGhost,fontSize:13,padding:"8px 14px"}}>← Tilbage</button>
        <h1 style={{margin:0,fontSize:18,fontWeight:700,color:"#fff",flex:1,minWidth:0}}>{faktura.id} — {faktura.mcReg}</h1>
        {isAdmin && <button onClick={()=>onSætFaktureret(faktura.id,!faktura.faktureret)}
          style={{background:faktura.faktureret?"#1a3a2a":"#2a1a1a",border:`1px solid ${faktura.faktureret?"#22c55e55":"#cc000055"}`,
            color:faktura.faktureret?"#4ade80":"#f87171",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          {faktura.faktureret?"✓ Faktureret":"○ Marker faktureret"}
        </button>}
        <button onClick={()=>genPDF(faktura)} style={{background:"#1a3a2a",border:"1px solid #22c55e44",color:"#4ade80",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:700,cursor:"pointer"}}>⬇ PDF</button>
        {isAdmin && <button onClick={sendEconomic} disabled={sender}
          style={{background:sendtStatus==="ok"?"#1a3a2a":sendtStatus==="fejl"?"#3a1a1a":"#1a2a3a",
            border:"1px solid "+(sendtStatus==="ok"?"#22c55e44":sendtStatus==="fejl"?"#ef444444":"#3b82f644"),
            color:sendtStatus==="ok"?"#4ade80":sendtStatus==="fejl"?"#f87171":"#60a5fa",
            borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:700,cursor:"pointer",opacity:sender?0.6:1}}>
          {sender?"⏳ Sender...":sendtStatus==="ok"?"✓ Sendt":sendtStatus==="fejl"?"✗ Fejl — prøv igen":"📤 Send til e-conomic"}
        </button>}
        <button onClick={()=>onRediger(faktura)} style={{...btnRed,fontSize:13,padding:"8px 16px"}}>✏️ Rediger</button>
      </div>
      <div style={{background:"#b30000",borderRadius:10,padding:"16px 14px",marginBottom:12}}>
        <div style={{display:"flex",gap:20,flexWrap:"wrap",marginBottom:faktura.note?12:0}}>
          {[{l:"Faktura nr",v:faktura.id},{l:"MC",v:faktura.mcReg},{l:"Dato",v:fmtDato(faktura.dato)},{l:"Km ved service",v:faktura.km?(faktura.km.toLocaleString("da-DK")+" km"):null}].filter(r=>r.v).map(r=>(
            <div key={r.l}><div style={{fontSize:11,color:"#ffdddd",letterSpacing:.8,marginBottom:2,fontWeight:600,textTransform:"uppercase"}}>{r.l}</div><div style={{fontWeight:700,fontSize:14,color:"#fff"}}>{r.v}</div></div>
          ))}
          {faktura.afdeling&&<div><div style={{fontSize:11,color:"#ffdddd",letterSpacing:.8,marginBottom:2,fontWeight:600,textTransform:"uppercase"}}>Afdeling</div><div style={{fontWeight:700,fontSize:14,color:"#fff"}}>{faktura.afdeling}</div></div>}
          {faktura.titel&&<div><div style={{fontSize:11,color:"#ffdddd",letterSpacing:.8,marginBottom:2,fontWeight:600,textTransform:"uppercase"}}>Titel</div><div style={{fontWeight:700,fontSize:14,color:"#fff"}}>{faktura.titel}</div></div>}
        </div>
        {faktura.note&&<div style={{background:"#cc000066",borderRadius:8,padding:"10px 12px",fontSize:13,color:"#ffdddd"}}>{faktura.note}</div>}
      </div>
      {faktura.linjer.filter(l=>!l.divers).length>0&&(
        <div style={{background:"#b30000",borderRadius:10,padding:"14px",marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:10}}>Basis dele</div>
          {faktura.linjer.filter(l=>!l.divers).map(l=>(
            <div key={l.yId} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #cc000088"}}>
              <span style={{fontSize:13,color:"#fff"}}>{l.navn}</span>
              <div style={{display:"flex",gap:12,alignItems:"center"}}>
                <span style={{fontSize:12,color:"#ffdddd"}}>{l.antal} stk × {fmt(l.pris)} kr</span>
                <span style={{fontWeight:700,color:"#4ade80",fontSize:13,minWidth:70,textAlign:"right"}}>{fmt(l.antal*l.pris)} kr</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {faktura.linjer.filter(l=>l.divers).length>0&&(
        <div style={{background:"#b30000",borderRadius:10,padding:"14px",marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:10}}>Diverse dele</div>
          <div style={{background:"#1a1a1a",borderRadius:8,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",padding:"7px 12px",background:"#222",fontSize:11,color:"#888",fontWeight:700,gap:8}}>
              <span>Beskrivelse</span><span>Stk. pris</span><span style={{textAlign:"right"}}>Total</span>
            </div>
            {faktura.linjer.filter(l=>l.divers).map(l=>(
              <div key={l.yId} style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",padding:"9px 12px",borderTop:"1px solid #2a2a2a",gap:8,alignItems:"center"}}>
                <span style={{fontSize:13,fontWeight:600}}>{l.antal>1?`${l.antal}× `:""}{l.navn}</span>
                <span style={{fontSize:13,color:"#ccc"}}>DKK {fmt(l.pris)}</span>
                <span style={{fontWeight:700,color:"#4ade80",fontSize:13,textAlign:"right"}}>{fmt(l.antal*l.pris)} kr</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontWeight:800,fontSize:16}}>TOTAL</span>
        <span style={{fontWeight:800,fontSize:24,color:"#4ade80"}}>{fmt(faktura.total)} kr</span>
      </div>
    </div>
  );
}

function YdelserView({ydelser,nyYdelse,setNyYdelse,editYdelse,setEditYdelse,onGem,onSave,onDel,lokationer,nyLok,setNyLok,editLok,setEditLok,onOpretLok,onGemLok,inp,btnRed,btnGhost,fmt,mcs=[],onBulkOpdater}) {
  const [bulkStatus,setBulkStatus]=React.useState(null); // null | {kører,done,total,opdateret,fejlet,log}

  const normApiDato = raw => {
    if(!raw) return "";
    return raw.split("+")[0].split("T")[0];
  };

  const kørbulk = async (kunManglende=false) => {
    const alle = mcs.filter(m => m.location && !["Solgte MC'er","MC til salg"].includes(m.location) && m.reg);
    const aktive = kunManglende ? alle.filter(m => !m.stel || !m.syn || !m.naesteSyn) : alle;
    const total = aktive.length;
    if(total===0){setBulkStatus({kører:false,done:0,total:0,opdateret:0,fejlet:0,log:[{reg:"—",status:"Ingen MC'er mangler opdatering",farve:"#4ade80"}]});return;}
    setBulkStatus({kører:true,done:0,total,opdateret:0,fejlet:0,log:[]});

    let opdateret=0, fejlet=0;
    const log=[];

    for(let i=0; i<aktive.length; i++) {
      const mc = aktive[i];
      try {
        // Hent MotorAPI og Synsbasen parallelt — Synsbasen er primær kilde
        const [motorRes, synsRes] = await Promise.allSettled([
          motorApi(mc.reg),
          synsbasenApi(mc.reg),
        ]);
        const motorData = motorRes.status === "fulfilled" ? motorRes.value : null;
        const sdata = synsRes.status === "fulfilled" ? synsRes.value : null;

        // Synsbasen felter
        const sb = sdata ? synsbasenFelter(sdata) : {};

        // MotorAPI felter som fallback
        const motorStel    = motorData?.vin || "";
        const motorFoerste = normApiDato(motorData?.first_registration || motorData?.first_registration_date || "");
        const motorSyn     = normApiDato(motorData?.mot_info?.date || "");

        // Brug Synsbasen hvis tilgængelig, ellers MotorAPI
        const opdateringer = {};
        const nyStel       = sb.stel       || motorStel;
        const nyFoerste    = sb.foersteReg || motorFoerste;
        const nySyn        = sb.syn        || motorSyn;
        const nyNaesteSyn  = sb.naesteSyn  || "";
        const nyBeskr      = sb.beskrivelse|| "";

        if(nyStel)      opdateringer.stel       = nyStel;
        if(nyFoerste)   opdateringer.foersteReg = nyFoerste;
        if(nySyn)       opdateringer.syn        = nySyn;
        if(nyNaesteSyn) opdateringer.naesteSyn  = nyNaesteSyn;
        // Opdater beskrivelse kun hvis Synsbasen har den og MC'en ingen har
        if(nyBeskr && !mc.beskrivelse) opdateringer.beskrivelse = nyBeskr;

        if(Object.keys(opdateringer).length === 0) {
          log.push({reg:mc.reg, status:"ingen data fra nogen API", farve:"#888"});
          fejlet++;
        } else {
          const ændringer = Object.entries(opdateringer)
            .filter(([k,v]) => String(mc[k]||"") !== String(v))
            .map(([k]) => ({stel:"Stel",foersteReg:"1.reg",syn:"Syn",naesteSyn:"Næste syn",beskrivelse:"Beskr."}[k]||k));

          const kilde = sdata && motorData ? "Synsbasen+Motor" : sdata ? "Synsbasen" : "MotorAPI";

          if(ændringer.length > 0) {
            await onBulkOpdater([{mc, data: opdateringer}]);
            log.push({reg:mc.reg, status:`✓ ${ændringer.join(", ")} (${kilde})`, farve:"#4ade80"});
            opdateret++;
          } else {
            log.push({reg:mc.reg, status:"ingen ændringer", farve:"#888"});
          }
        }
      } catch(e) {
        const err = e.message || "";
        log.push({reg:mc.reg, status:`fejl: ${err}`, farve:"#f87171"});
        fejlet++;
      }
      // Lille pause så vi ikke overbelaster API
      await new Promise(r=>setTimeout(r,400));
      setBulkStatus(p=>({...p,done:i+1,opdateret,fejlet,log:[...log]}));
    }
    setBulkStatus({kører:false,done:total,total,opdateret,fejlet,log});
  };
  const cur=editYdelse||nyYdelse;
  const set=editYdelse?setEditYdelse:setNyYdelse;
  return (
    <div style={{paddingBottom:20}}>
      <h1 style={{margin:"0 0 18px",fontSize:22,fontWeight:700,color:"#fff"}}>Administration</h1>

      {/* ── BULK OPDATERING FRA MOTORREGISTRET ── */}
      <div style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",padding:16,marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:bulkStatus?12:0}}>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:"#fff",marginBottom:2}}>🔄 Bulk opdater fra motorregistret</div>
            <div style={{fontSize:12,color:"#888"}}>Henter stelnum, 1. indregistrering og sidst syn for alle aktive MC'er. API er sandhed.</div>
          </div>
          <div style={{display:"flex",gap:8,flexShrink:0,marginLeft:16}}>
            <button onClick={()=>kørbulk(false)} disabled={bulkStatus?.kører}
              style={{...btnRed,padding:"10px 18px",fontSize:13,opacity:bulkStatus?.kører?0.6:1,whiteSpace:"nowrap"}}>
              {bulkStatus?.kører?`Kører... ${bulkStatus.done}/${bulkStatus.total}`:"Opdater alle"}
            </button>
            <button onClick={()=>kørbulk(true)} disabled={bulkStatus?.kører}
              style={{...btnGhost,padding:"10px 14px",fontSize:12,opacity:bulkStatus?.kører?0.6:1,whiteSpace:"nowrap"}}>
              Kun manglende
            </button>
          </div>
        </div>

        {bulkStatus&&(
          <div>
            {/* Progress bar */}
            <div style={{background:"#111",borderRadius:4,height:8,overflow:"hidden",marginBottom:10}}>
              <div style={{height:"100%",borderRadius:4,background:"#cc0000",width:`${Math.round(bulkStatus.done/bulkStatus.total*100)}%`,transition:"width 0.3s"}}/>
            </div>
            {/* Statistik */}
            <div style={{display:"flex",gap:16,marginBottom:10,fontSize:12}}>
              <span style={{color:"#4ade80"}}>✓ {bulkStatus.opdateret} opdateret</span>
              <span style={{color:"#888"}}>{bulkStatus.done-bulkStatus.opdateret-bulkStatus.fejlet} uændrede</span>
              {bulkStatus.fejlet>0&&<span style={{color:"#f87171"}}>✗ {bulkStatus.fejlet} fejl</span>}
              {!bulkStatus.kører&&<span style={{color:"#60a5fa",marginLeft:"auto"}}>Færdig — {bulkStatus.total} MC'er behandlet</span>}
            </div>
            {/* Log */}
            <div style={{maxHeight:200,overflowY:"auto",background:"#111",borderRadius:6,padding:"8px 10px"}}>
              {[...bulkStatus.log].reverse().map((l,i)=>(
                <div key={i} style={{fontSize:11,fontFamily:"monospace",color:l.farve,padding:"2px 0",borderBottom:"1px solid #1a1a1a"}}>
                  <span style={{color:"#555",marginRight:8}}>{l.reg}</span>{l.status}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── LOKATIONER ── */}
      <div style={{marginBottom:20}}>
        <div style={{fontWeight:700,fontSize:15,color:"#fff",marginBottom:10}}>📍 Lokationer</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
          {/* Opret / Rediger */}
          <div style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",overflow:"hidden"}}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #2a2a2a",fontWeight:700,fontSize:14}}>
              {editLok?"Rediger lokation":"Opret ny lokation"}
            </div>
            <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <label style={{display:"block",fontSize:11,color:"#777",marginBottom:3,fontWeight:600,textTransform:"uppercase"}}>Navn</label>
                <input value={editLok?editLok.navn:nyLok.navn}
                  onChange={e=>editLok?setEditLok(p=>({...p,navn:e.target.value})):setNyLok(p=>({...p,navn:e.target.value}))}
                  placeholder="fx Horsens" style={inp}/>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,color:"#777",marginBottom:3,fontWeight:600,textTransform:"uppercase"}}>Transport pris (kr)</label>
                <input type="number" value={editLok?editLok.transport:nyLok.transport}
                  onChange={e=>editLok?setEditLok(p=>({...p,transport:Number(e.target.value)})):setNyLok(p=>({...p,transport:Number(e.target.value)}))}
                  placeholder="0" style={inp}/>
                <div style={{fontSize:11,color:"#555",marginTop:3}}>0 = ingen transport</div>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,color:"#777",marginBottom:3,fontWeight:600,textTransform:"uppercase"}}>e-conomic dimension nr.</label>
                <input type="number" value={editLok?editLok.dimension:nyLok.dimension}
                  onChange={e=>editLok?setEditLok(p=>({...p,dimension:e.target.value})):setNyLok(p=>({...p,dimension:e.target.value}))}
                  placeholder="fx 18" style={inp}/>
                <div style={{fontSize:11,color:"#555",marginTop:3}}>Afdelingsnummer i e-conomic</div>
              </div>
              <div style={{display:"flex",gap:8,marginTop:4}}>
                <button onClick={editLok?onGemLok:onOpretLok}
                  style={{...btnRed,flex:1,justifyContent:"center",padding:"11px"}}>
                  {editLok?"GEM":"OPRET"}
                </button>
                {editLok&&<button onClick={()=>setEditLok(null)} style={{...btnGhost,padding:"11px 14px"}}>Annuller</button>}
              </div>
            </div>
          </div>
          {/* Liste */}
          <div style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",overflow:"hidden"}}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #2a2a2a",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:700,fontSize:14}}>Alle lokationer</span>
              <span style={{color:"#777",fontSize:12}}>{lokationer.length} stk</span>
            </div>
            <div style={{display:"flex",flexDirection:"column"}}>
              {lokationer.map((l,i)=>(
                <div key={l.navn} style={{display:"flex",alignItems:"center",padding:"10px 12px",borderBottom:"1px solid #222",background:i%2===0?"#1a1a1a":"#1e1e1e",gap:10}}>
                  <span style={{flex:1,fontSize:13,fontWeight:500,color:"#fff"}}>📍 {l.navn}</span>
                  <span style={{fontSize:12,color:l.transport>0?"#4ade80":"#555",fontWeight:600,minWidth:60,textAlign:"right"}}>
                    {l.transport>0?`${l.transport.toLocaleString("da-DK")} kr`:"Ingen"}
                  </span>
                  <button className="tap" onClick={()=>setEditLok({idx:i,navn:l.navn,transport:l.transport||0})}
                    style={{...btnGhost,padding:"4px 10px",fontSize:12}}>✏️</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── YDELSER ── */}
      <div style={{fontWeight:700,fontSize:15,color:"#fff",marginBottom:10}}>🔧 Ydelser & Varer</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
        <div style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid #2a2a2a",fontWeight:700,fontSize:14}}>{editYdelse?"Rediger Ydelse":"Opret ny Ydelse / Vare"}</div>
          <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
            {[{key:"nr",l:"Nummer"},{key:"navn",l:"Navn"},{key:"pris",l:"Pris (kr)",type:"number"}].map(f=>(
              <div key={f.key}>
                <label style={{display:"block",fontSize:11,color:"#777",marginBottom:3,fontWeight:600,textTransform:"uppercase"}}>{f.l}</label>
                <input type={f.type||"text"} value={cur[f.key]} onChange={e=>set(p=>({...p,[f.key]:e.target.value}))} style={inp} readOnly={!!editYdelse&&f.key==="nr"}/>
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <button onClick={editYdelse?onSave:onGem} style={{...btnRed,flex:1,justifyContent:"center",padding:"11px"}}>{editYdelse?"GEM":"OPRET"}</button>
              {editYdelse&&<button onClick={()=>setEditYdelse(null)} style={{...btnGhost,padding:"11px 14px"}}>Annuller</button>}
            </div>
          </div>
        </div>
        <div style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:"1px solid #2a2a2a",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontWeight:700,fontSize:14}}>Ydelser & Varer</span>
            <span style={{color:"#777",fontSize:12}}>{ydelser.length} stk</span>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:280}}>
              <thead><tr style={{background:"#222"}}>
                {["Nr","Navn","Pris",""].map(h=>(
                  <th key={h} style={{padding:"9px 12px",textAlign:h==="Pris"?"right":"left",fontSize:11,letterSpacing:.8,color:"#777",fontWeight:700,textTransform:"uppercase"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {ydelser.map((y,i)=>(
                  <tr key={y.id} style={{background:i%2===0?"#1a1a1a":"#1e1e1e",borderBottom:"1px solid #222"}}>
                    <td style={{padding:"10px 12px",color:"#777",fontSize:12,fontFamily:"monospace"}}>{y.nr}</td>
                    <td style={{padding:"10px 12px",fontWeight:600,fontSize:13}}>{y.navn}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:"#4ade80",fontSize:13}}>{fmt(y.pris)} kr</td>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                        <button className="tap" onClick={()=>setEditYdelse({...y})} style={{...btnGhost,padding:"4px 10px",fontSize:12}}>✏️</button>
                        <button className="tap" onClick={()=>onDel(y.id)} style={{background:"#3b1a1a",border:"1px solid #cc000033",color:"#f87171",borderRadius:6,padding:"4px 10px",fontWeight:600,fontSize:12,cursor:"pointer"}}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
