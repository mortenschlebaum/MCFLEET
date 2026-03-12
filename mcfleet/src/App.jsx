import React, { useState, useMemo } from "react";

const LOCATIONS = ["Kolding","KTA Kolding","Århus MC","Hobro","Herning","Viborg","Randers","Horsens","Odense","Lager / Depot"];
const today = new Date();
const todayStr = today.toISOString().split("T")[0];
const addDays = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x.toISOString().split("T")[0]; };
const fmtDato = d => {
  if(!d) return "";
  const [y,m,day]=d.split("-");
  return `${day}-${m}-${y}`;
};
const fmt = n => Number(n).toLocaleString("da-DK",{minimumFractionDigits:2,maximumFractionDigits:2});

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

const synStatus = d => {
  const diff=Math.floor((new Date(d)-today)/86400000);
  return diff<0?"overskredet":diff<=30?"snart":"ok";
};
const SC={ok:"#22c55e",snart:"#f59e0b",overskredet:"#ef4444"};
const SL={ok:"Syn OK",snart:"Syn snart",overskredet:"Syn overskredet"};

let fakNr=1000;
const nextFakNr=()=>`FAK-${++fakNr}`;

const kmColor = km => km>30000?"#ef4444":km>15000?"#f59e0b":"#22c55e";

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
  return (
    <div style={{minHeight:"100dvh",background:"#111",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{width:"100%",maxWidth:380}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:8}}>🏍</div>
          <div style={{fontSize:22,fontWeight:800,color:"#fff",letterSpacing:1}}>MCFLEET</div>
          <div style={{width:40,height:3,background:"#cc0000",borderRadius:2,margin:"10px auto 4px"}}/>
          <div style={{fontSize:13,color:"#888"}}>Lisbeth's Køreskole</div>
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
function BrugerAdmin({brugere,setBrugere,notify}) {
  const [ny,setNy]=useState({brugernavn:"",adgangskode:"",navn:"",rolle:"bruger"});
  const [rediger,setRediger]=useState(null);
  const [visKode,setVisKode]=useState({});

  const opret=()=>{
    if(!ny.brugernavn||!ny.adgangskode||!ny.navn){notify("Udfyld alle felter",true);return;}
    if(brugere.find(b=>b.brugernavn===ny.brugernavn)){notify("Brugernavn er taget",true);return;}
    setBrugere(p=>[...p,{...ny,id:Date.now()}]);
    setNy({brugernavn:"",adgangskode:"",navn:"",rolle:"bruger"});
    notify("Bruger oprettet ✓");
  };
  const gem=()=>{
    setBrugere(p=>p.map(b=>b.id===rediger.id?rediger:b));
    setRediger(null); notify("Bruger opdateret ✓");
  };
  const slet=(id)=>{
    if(brugere.filter(b=>b.rolle==="admin").length===1&&brugere.find(b=>b.id===id)?.rolle==="admin"){notify("Kan ikke slette den eneste admin",true);return;}
    setBrugere(p=>p.filter(b=>b.id!==id)); notify("Bruger slettet");
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
  const [brugere,setBrugere]=useState(INIT_USERS);
  const [bruger,setBruger]=useState(null);
  const [loginFejl,setLoginFejl]=useState("");

  // ── App state (hooks must all be declared before any return) ──
  const [mcs,setMcs]=useState(INIT_MC);
  const [ydelser,setYdelser]=useState(INIT_YDELSER);
  const [fakturaer,setFakturaer]=useState([]);
  const [nav,setNav]=useState("oversigt");
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [note,setNote]=useState(null);
  const [search,setSearch]=useState("");
  const [filterLoc,setFilterLoc]=useState("Alle");
  const [mcModal,setMcModal]=useState(null);
  const [editMc,setEditMc]=useState(null);
  const [nyFak,setNyFak]=useState(null);
  const [fakDetail,setFakDetail]=useState(null);
  const [moveModal,setMoveModal]=useState(null);
  const [nyYdelse,setNyYdelse]=useState({nr:"",navn:"",pris:""});
  const [editYdelse,setEditYdelse]=useState(null);
  const [editFakId,setEditFakId]=useState(null);
  const [opgaver,setOpgaver]=useState([]);
  const [visOpgaveForm,setVisOpgaveForm]=useState(false);
  const [synModal,setSynModal]=useState(false);

  const login=(brugernavn,adgangskode)=>{
    const b=brugere.find(b=>b.brugernavn===brugernavn&&b.adgangskode===adgangskode);
    if(b){setBruger(b);setLoginFejl("");}
    else setLoginFejl("Forkert brugernavn eller adgangskode");
  };
  const logout=()=>{setBruger(null);setLoginFejl("");};

  const isAdmin=bruger?.rolle==="admin";

  const notify=(msg,err)=>{setNote({msg,err});setTimeout(()=>setNote(null),2600);};

  const byLoc=useMemo(()=>{
    const m={}; LOCATIONS.forEach(l=>{m[l]=[];});
    mcs.forEach(mc=>{
      if(m[mc.location]) m[mc.location].push(mc);
      else { m[mc.location]=[]; m[mc.location].push(mc); } // ukend lokation - vis alligevel
    });
    return m;
  },[mcs]);

  const filteredByLoc=useMemo(()=>{
    const q=search.toLowerCase();
    const out={};
    const alleLocs=[...new Set([...LOCATIONS,...Object.keys(byLoc)])];
    alleLocs.forEach(loc=>{
      let list=byLoc[loc]||[];
      if(filterLoc!=="Alle"&&filterLoc!==loc){out[loc]=[];return;}
      if(q) list=list.filter(mc=>mc.reg.toLowerCase().includes(q)||mc.stel.toLowerCase().includes(q)||(mc.gps||"").toLowerCase().includes(q)||String(mc.mcNr).includes(q)||(mc.beskrivelse||"").toLowerCase().includes(q));
      out[loc]=list;
    });
    return out;
  },[byLoc,search,filterLoc]);

  const stats=useMemo(()=>({
    total:mcs.length,
    ov:mcs.filter(m=>synStatus(m.syn)==="overskredet").length,
    fakTotal:fakturaer.reduce((s,f)=>s+f.total,0),
  }),[mcs,fakturaer]);

  const goNav=(id)=>{setNav(id);setMcModal(null);setNyFak(null);setFakDetail(null);setEditMc(null);setSidebarOpen(false);};
  const saveMc=()=>{
    const {_erNy,...rest}=editMc;
    const nyKm=Number(rest.km)||0;
    const opdateret={...rest,km:nyKm,mcNr:Number(rest.mcNr)||0};
    setMcs(p=>{
      const findes=p.some(m=>m.id===opdateret.id);
      if(findes){
        const gammel=p.find(m=>m.id===opdateret.id);
        const gammelKm=gammel?.km??0;
        // Tilføj km-log entry hvis km er ændret
        let kmLog=[...(gammel?.kmLog||[])];
        if(nyKm!==gammelKm){
          const diff=kmLog.length===0?null:nyKm-gammelKm;
          kmLog.push({dato:todayStr,km:nyKm,diff});
        }
        return p.map(m=>m.id===opdateret.id?{...m,...opdateret,kmLog}:m);
      }
      // Ny MC — opret med start-log
      return [...p,{...opdateret,
        lokationsLog:[{lokation:opdateret.location,fra:todayStr,til:null}],
        kmLog:nyKm>0?[{dato:todayStr,km:nyKm,diff:null}]:[],
      }];
    });
    notify(_erNy?"MC oprettet ✓":"MC opdateret ✓");
    setEditMc(null);
    if(mcModal&&!_erNy) setMcModal({...opdateret});
  };
  const onFotoUpload=(mcId,dataUrl)=>{setMcs(p=>p.map(m=>m.id===mcId?{...m,foto:dataUrl}:m));notify("Billede uploadet ✓");};;
  const doMove=(loc)=>{
    // Brug == (løs) for at undgå type-mismatch mellem number og string
    // eslint-disable-next-line eqeqeq
    const mc=mcs.find(m=>m.id==moveModal);
    if(!mc){notify(`Fejl: MC ikke fundet (id=${moveModal})`,true);setMoveModal(null);return;}
    if(mc.location===loc){notify("MC er allerede på denne lokation",true);return;}
    setMcs(p=>p.map(m=>{
      // eslint-disable-next-line eqeqeq
      if(m.id!=moveModal) return m;
      const log=[...(m.lokationsLog||[])];
      if(log.length>0&&log[log.length-1].til===null){
        log[log.length-1]={...log[log.length-1],til:todayStr};
      }
      log.push({lokation:loc,fra:todayStr,til:null});
      return {...m,location:loc,lokationsLog:log};
    }));
    notify(`Flyttet til ${loc} ✓`);
    setMoveModal(null);
  };

  const addLinje=(yId)=>{const y=ydelser.find(y=>y.id===yId);if(!y)return;setNyFak(f=>{const e=f.linjer.find(l=>l.yId===yId);if(e)return{...f,linjer:f.linjer.map(l=>l.yId===yId?{...l,antal:l.antal+1}:l)};return{...f,linjer:[...f.linjer,{yId,nr:y.nr,navn:y.navn,pris:y.pris,antal:1}]};});};
  const removeLinje=(yId)=>setNyFak(f=>({...f,linjer:f.linjer.filter(l=>l.yId!==yId)}));
  const setAntal=(yId,v)=>setNyFak(f=>({...f,linjer:f.linjer.map(l=>l.yId===yId?{...l,antal:Math.max(1,Number(v))}:l)}));
  const setPrisL=(yId,v)=>setNyFak(f=>({...f,linjer:f.linjer.map(l=>l.yId===yId?{...l,pris:Number(v)}:l)}));
  const fakTotal=(linjer)=>linjer.reduce((s,l)=>s+l.antal*l.pris,0);
  const gemFak=()=>{
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
      notify("Faktura opdateret ✓");
    } else {
      const f={id:nextFakNr(),mcId:nyFak.mcId,mcReg:mc.reg,dato:nyFak.dato,note:nyFak.note||"",titel:nyFak.titel||"",linjer:nyFak.linjer,total};
      setFakturaer(p=>[f,...p]);
      setNyFak(null); setEditFakId(null);
      setFakDetail(f);
      notify(`${f.id} oprettet ✓`);
    }
  };
  const startRedigerFak=(f)=>{setNyFak({mcId:f.mcId,linjer:[...f.linjer],dato:f.dato,note:f.note||"",titel:f.titel||""});setEditFakId(f.id);setFakDetail(null);};

  const gemYdelse=()=>{if(!nyYdelse.nr||!nyYdelse.navn||!nyYdelse.pris){notify("Udfyld alle felter",true);return;}if(ydelser.find(y=>y.nr===nyYdelse.nr)){notify("Nummer findes allerede",true);return;}setYdelser(p=>[...p,{id:nyYdelse.nr,...nyYdelse,pris:Number(nyYdelse.pris)}]);setNyYdelse({nr:"",navn:"",pris:""});notify("Ydelse oprettet");};
  const saveYdelse=()=>{setYdelser(p=>p.map(y=>y.id===editYdelse.id?{...editYdelse,pris:Number(editYdelse.pris)}:y));setEditYdelse(null);notify("Opdateret");};
  const delYdelse=(id)=>{setYdelser(p=>p.filter(y=>y.id!==id));notify("Slettet");};

  const navItems=[
    {id:"oversigt",icon:"🏍",label:"Oversigt"},
    {id:"opgaver",icon:"📋",label:"Opgaver"},
    {id:"fakturaer",icon:"🧾",label:"Fakturaer"},
    {id:"administration",icon:"⚙️",label:"Administration"},
    ...(isAdmin?[{id:"brugere",icon:"👥",label:"Brugere"}]:[]),
  ];

  const showingSubpage = mcModal||editMc||nyFak||fakDetail;

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
          <div style={{fontSize:15,fontWeight:700}}>Lisbeth's Køreskole</div>
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
          <button onClick={logout} title="Log ud" style={{background:"none",border:"none",color:"#666",cursor:"pointer",fontSize:18,padding:"4px",lineHeight:1}} className="tap">⏻</button>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",marginLeft:0,height:"100dvh",overflow:"hidden"}}>

        {/* Top bar (mobile) */}
        <div className="mobile-only" style={{background:"#161616",borderBottom:"1px solid #2a2a2a",padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <button onClick={()=>setSidebarOpen(true)} style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer",padding:"2px 6px",lineHeight:1}}>☰</button>
          <span style={{fontWeight:700,fontSize:15,flex:1}}>Lisbeth's Køreskole</span>
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
                    <div style={{background:"#a80000",borderRadius:6,padding:"5px 12px",fontSize:12,color:"#ffdddd",fontWeight:600}}>{stats.total} MC'er</div>
                  </div>
                </div>

                {/* Search row */}
                <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
                  <div style={{position:"relative",flex:"1 1 180px",minWidth:0}}>
                    <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"#666",fontSize:13}}>🔍</span>
                    <input placeholder="Søg reg. nr., beskrivelse..." value={search} onChange={e=>setSearch(e.target.value)}
                      style={{...inp,paddingLeft:34,background:"#1e1e1e",border:"1px solid #333",borderRadius:8,height:40,fontSize:13}}/>
                  </div>
                  <select value={filterLoc} onChange={e=>setFilterLoc(e.target.value)}
                    style={{...inp,width:"auto",flex:"0 0 auto",height:40,background:"#1e1e1e",border:"1px solid #333",fontSize:13,padding:"0 12px"}}>
                    <option value="Alle">Alle</option>
                    {LOCATIONS.map(l=><option key={l}>{l}</option>)}
                  </select>
                  <button style={{...btnRed,height:40,padding:"0 14px",fontSize:13}} onClick={()=>{const n={id:Date.now()+(Math.random()*1000|0),mcNr:"",reg:"",stel:"",gps:"",syn:todayStr,km:0,location:LOCATIONS[0],beskrivelse:"",_erNy:true};setEditMc(n);}}>+ MC</button>
                </div>

                {/* Groups */}
                <div style={{display:"flex",flexDirection:"column",gap:20}}>
                  {[...new Set([...LOCATIONS,...Object.keys(filteredByLoc)])].map(loc=>{
                    const list=filteredByLoc[loc]||[];
                    if(!list.length&&(search||filterLoc!=="Alle")) return null;
                    return (
                      <div key={loc}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                          <h2 style={{margin:0,fontSize:16,fontWeight:700,color:"#fff"}}>{loc} — {list.length}</h2>
                        </div>
                        {list.length===0?(
                          <div style={{background:"#1a1a1a44",borderRadius:8,padding:"14px 16px",color:"#ffffff88",fontSize:13}}>Ingen MC'er</div>
                        ):(
                          <div className="mobile-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
                            {list.map(mc=>{
                              const st=synStatus(mc.syn);
                              return (
                                <div key={mc.id} className="mc-card tap" onClick={()=>setMcModal(mc)}
                                  style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",cursor:"pointer",overflow:"hidden",position:"relative",transition:"border-color 0.15s"}}>
                                  <div style={{position:"absolute",top:8,right:8,width:11,height:11,borderRadius:"50%",background:SC[st],boxShadow:`0 0 5px ${SC[st]}`}}/>
                                  <div style={{padding:"10px 10px 6px",fontSize:11,lineHeight:1.75,color:"#ccc"}}>
                                    <div><span style={{color:"#666"}}>MC Nr: </span><strong style={{color:"#fff"}}>{mc.mcNr}</strong></div>
                                    <div><span style={{color:"#666"}}>Reg.nr: </span><strong style={{color:"#fff"}}>{mc.reg}</strong></div>
                                    <div style={{fontSize:10,color:"#888"}}>{mc.gps}</div>
                                    <div style={{fontSize:10,color:"#aaa",fontWeight:600,marginTop:2}}>{mc.beskrivelse}</div>
                                  </div>
                                  <div style={{background:"#111",display:"flex",alignItems:"center",justifyContent:"center",padding:"4px 0"}}>
                                    <img src={mc.foto||MC_SVG} alt="" style={{width:"100%",maxWidth:150,height:70,objectFit:mc.foto?"cover":"contain",borderRadius:mc.foto?6:0}}/>
                                  </div>
                                  <div style={{background:"#111",padding:"5px 8px"}}>
                                    <div style={{background:"#222",borderRadius:4,height:16,overflow:"hidden",position:"relative"}}>
                                      <div style={{position:"absolute",inset:0,background:kmColor(mc.km),width:`${Math.min(100,(mc.km/40000)*100)}%`,borderRadius:4}}/>
                                      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",textShadow:"0 1px 2px #000"}}>
                                        {mc.km.toLocaleString("da-DK")} km
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
                  })}
                </div>
              </>
            )}

            {/* ── MC DETALJE ── */}
            {nav==="oversigt"&&mcModal&&!nyFak&&!fakDetail&&!editMc&&(()=>{
              const liveMc=mcs.find(m=>m.id===mcModal.id)||mcModal; // altid frisk fra state
              return <McDetalje mc={liveMc} fakturaer={fakturaer.filter(f=>f.mcId===liveMc.id)} onBack={()=>setMcModal(null)} onEdit={()=>setEditMc({...liveMc})} onNyFaktura={()=>setNyFak({mcId:liveMc.id,linjer:[],dato:todayStr,note:"",titel:""})} onVisFaktura={setFakDetail} onMove={()=>setMoveModal(liveMc.id)} onFotoUpload={onFotoUpload} SC={SC} SL={SL} synStatus={synStatus} fmt={fmt} inp={inp} btnRed={btnRed} btnGhost={btnGhost} MC_SVG={MC_SVG} kmColor={kmColor}/>;
            })()}

            {/* ── REDIGER MC ── */}
            {nav==="oversigt"&&editMc&&(
              <RedigerMc mc={editMc} setMc={setEditMc} onSave={saveMc} onCancel={()=>setEditMc(null)} locations={LOCATIONS} inp={inp} btnRed={btnRed} btnGhost={btnGhost}/>
            )}

            {/* ── NY FAKTURA ── */}
            {nav==="oversigt"&&nyFak&&!fakDetail&&(
              <NyFakturaView faktura={nyFak} setFaktura={setNyFak} mc={mcs.find(m=>m.id===nyFak.mcId)} ydelser={ydelser} addLinje={addLinje} removeLinje={removeLinje} setAntal={setAntal} setPrisL={setPrisL} fakTotal={fakTotal} onGem={gemFak} onCancel={()=>{setNyFak(null);setEditFakId(null);}} inp={inp} btnRed={btnRed} btnGhost={btnGhost} fmt={fmt} editMode={!!editFakId}/>
            )}

            {/* ── FAKTURA DETALJE ── */}
            {fakDetail&&(
              <FakturaDetalje faktura={fakDetail} onBack={()=>setFakDetail(null)} onRediger={startRedigerFak} fmt={fmt} btnGhost={btnGhost} btnRed={btnRed}/>
            )}

            {/* ── ALLE FAKTURAER ── */}
            {nav==="fakturaer"&&!fakDetail&&(
              <AlleFakturaer fakturaer={fakturaer} onVis={setFakDetail} fmt={fmt} inp={inp} btnGhost={btnGhost}/>
            )}

            {/* ── ADMINISTRATION ── */}
            {nav==="administration"&&(
              <YdelserView ydelser={ydelser} nyYdelse={nyYdelse} setNyYdelse={setNyYdelse} editYdelse={editYdelse} setEditYdelse={setEditYdelse} onGem={gemYdelse} onSave={saveYdelse} onDel={delYdelse} inp={inp} btnRed={btnRed} btnGhost={btnGhost} fmt={fmt}/>
            )}

            {/* ── OPGAVER ── */}
            {nav==="opgaver"&&(
              <OpgaverView opgaver={opgaver} setOpgaver={setOpgaver} locations={LOCATIONS} notify={notify} visForm={visOpgaveForm} setVisForm={setVisOpgaveForm} inp={inp} btnRed={btnRed} btnGhost={btnGhost} fmt={fmt}/>
            )}

            {/* ── BRUGERE (kun admin) ── */}
            {nav==="brugere"&&isAdmin&&(
              <BrugerAdmin brugere={brugere} setBrugere={setBrugere} notify={notify}/>
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
                <div style={{fontSize:13,color:"#888",marginTop:2}}>{mcs.filter(m=>synStatus(m.syn)==="overskredet").length} MC'er kræver syn</div>
              </div>
              <button onClick={()=>setSynModal(false)} style={{background:"none",border:"none",color:"#666",fontSize:22,cursor:"pointer",lineHeight:1,padding:"0 4px"}}>✕</button>
            </div>
            <div style={{overflowY:"auto",padding:"8px 0"}}>
              {mcs.filter(m=>synStatus(m.syn)==="overskredet").sort((a,b)=>a.syn.localeCompare(b.syn)).map(mc=>{
                const dage=Math.floor((new Date(mc.syn)-new Date())/86400000);
                return (
                  <div key={mc.id} onClick={()=>{setSynModal(false);setMcModal(mc);}}
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
                      <div style={{fontSize:11,color:"#777",marginTop:3}}>Syn: {fmtDato(mc.syn)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── FLYT MODAL ── */}}
      {moveModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:500}} onClick={()=>setMoveModal(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#1e1e1e",borderRadius:"16px 16px 0 0",padding:"20px 16px 32px",width:"100%",maxWidth:480,border:"1px solid #333"}}>
            <div style={{width:40,height:4,background:"#444",borderRadius:2,margin:"0 auto 18px"}}/>
            <h3 style={{margin:"0 0 4px",fontSize:17,fontWeight:700}}>Flyt MC</h3>
            <p style={{color:"#888",fontSize:13,margin:"0 0 16px"}}>Ny lokation for <strong style={{color:"#fff"}}>{mcs.find(m=>m.id==moveModal)?.reg}</strong></p>
            <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:300,overflowY:"auto"}}>
              {LOCATIONS.map(l=>{
                // eslint-disable-next-line eqeqeq
                const erNuvaerende=mcs.find(m=>m.id==moveModal)?.location===l;
                return (
                  <div key={l} className={erNuvaerende?"":"tap"} onClick={()=>!erNuvaerende&&doMove(l)}
                    style={{padding:"12px 14px",borderRadius:8,cursor:erNuvaerende?"default":"pointer",
                      background:erNuvaerende?"#1a3a1a":"#252525",
                      border:`1px solid ${erNuvaerende?"#22c55e55":"#333"}`,
                      fontSize:14,color:erNuvaerende?"#22c55e":"#ddd",fontWeight:erNuvaerende?700:500,
                      opacity:erNuvaerende?1:1}}>
                    {erNuvaerende?"✓":"📍"} {l}{erNuvaerende?" (nuværende)":""}
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

function McDetalje({mc,fakturaer,onBack,onEdit,onNyFaktura,onVisFaktura,onMove,onFotoUpload,SC,SL,synStatus,fmt,inp,btnRed,btnGhost,MC_SVG,kmColor}) {
  const st=synStatus(mc.syn);
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
        <button onClick={onEdit} style={{...btnGhost,fontSize:13,padding:"8px 14px"}}>✏️ Rediger</button>
        <button onClick={onNyFaktura} style={{...btnRed,fontSize:13,padding:"8px 14px"}}>🧾 Ny Faktura</button>
      </div>

      <div className="detail-grid" style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:16}}>
        {/* MC card */}
        <div style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",overflow:"hidden"}}>
          <div style={{background:"#111",position:"relative",cursor:"pointer"}}
            onClick={()=>document.getElementById(`foto-input-${mc.id}`).click()}
            title="Tryk for at skifte billede">
            <img src={mc.foto||MC_SVG} alt="" style={{width:"100%",height:160,objectFit:mc.foto?"cover":"contain",display:"block"}}/>
            <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.55)",padding:"6px 10px",display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
              <span style={{fontSize:12,color:"#ccc"}}>📷 {mc.foto?"Skift billede":"Upload billede"}</span>
            </div>
            <input id={`foto-input-${mc.id}`} type="file" accept="image/*" capture="environment" style={{display:"none"}}
              onChange={e=>{
                const file=e.target.files[0]; if(!file) return;
                const reader=new FileReader();
                reader.onload=ev=>onFotoUpload(mc.id, ev.target.result);
                reader.readAsDataURL(file);
                e.target.value="";
              }}/>
          </div>
          <div style={{padding:16,display:"flex",flexDirection:"column",gap:0}}>
            {[{l:"MC Nr",v:mc.mcNr},{l:"Reg.nr",v:mc.reg},{l:"Stelnummer",v:mc.stel},{l:"GPS Nr",v:mc.gps},{l:"Beskrivelse",v:mc.beskrivelse},{l:"Lokation",v:mc.location},{l:"Sidst syn",v:fmtDato(mc.syn)},{l:"Kilometertal",v:mc.km.toLocaleString("da-DK")+" km"}].map(r=>(
              <div key={r.l} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"8px 0",borderBottom:"1px solid #222"}}>
                <span style={{color:"#777",fontSize:13,flexShrink:0}}>{r.l}</span>
                <span style={{fontWeight:600,fontSize:13,color:"#fff",textAlign:"right",wordBreak:"break-all"}}>{r.v}</span>
              </div>
            ))}
            <div style={{background:"#222",borderRadius:4,height:18,overflow:"hidden",position:"relative",marginTop:10}}>
              <div style={{position:"absolute",inset:0,background:kmColor(mc.km),width:`${Math.min(100,(mc.km/40000)*100)}%`,borderRadius:4}}/>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",textShadow:"0 1px 3px #000"}}>
                {mc.km.toLocaleString("da-DK")} km
              </div>
            </div>
          </div>
        </div>

        {/* Fakturaer */}
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
                      <td style={{padding:"10px 14px",fontSize:13,color:"#ccc"}}>{fmtDato(f.dato)}</td>
                      <td style={{padding:"10px 14px",fontWeight:700,color:"#4ade80",fontSize:13}}>{fmt(f.total)} kr</td>
                      <td style={{padding:"10px 14px"}}><span style={{color:"#888",fontSize:12}}>›</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function QrScanner({onResult,onClose}) {
  // Mount scanner into a div OUTSIDE React tree to avoid unmount conflicts
  const portalRef=React.useRef(null);
  const scannerRef=React.useRef(null);
  const doneRef=React.useRef(false);
  const [status,setStatus]=useState("Indlæser...");
  const [result,setResult]=useState(null);

  React.useEffect(()=>{
    // Create a div outside React and append to body
    const portal=document.createElement("div");
    portal.id="qr-portal-root";
    portal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,0.97);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px;font-family:system-ui,sans-serif;";
    document.body.appendChild(portal);
    portalRef.current=portal;

    // Scanner container div
    const scanDiv=document.createElement("div");
    scanDiv.id="qr-scan-area";
    scanDiv.style.cssText="width:100%;max-width:340px;border-radius:12px;overflow:hidden;background:#111;min-height:280px;box-shadow:0 0 0 2px #444;";
    portal.appendChild(scanDiv);

    // Status text
    const statusEl=document.createElement("div");
    statusEl.style.cssText="color:#aaa;font-size:13px;text-align:center;max-width:300px;word-break:break-all;";
    statusEl.textContent="Indlæser scanner...";
    portal.appendChild(statusEl);

    // Cancel button
    const btn=document.createElement("button");
    btn.textContent="Annuller";
    btn.style.cssText="background:#cc0000;border:none;color:#fff;border-radius:8px;padding:12px 32px;font-size:15px;cursor:pointer;font-weight:700;";
    btn.onclick=()=>{ cleanup(); onClose(); };
    portal.appendChild(btn);

    function cleanup(){
      doneRef.current=true;
      if(scannerRef.current){
        try{ scannerRef.current.stop().catch(()=>{}); } catch(e){}
        try{ scannerRef.current.clear(); } catch(e){}
        scannerRef.current=null;
      }
      if(portal.parentNode) portal.parentNode.removeChild(portal);
    }

    function startScanner(){
      try{
        const sc=new window.Html5Qrcode("qr-scan-area",{verbose:false});
        scannerRef.current=sc;
        sc.start(
          {facingMode:"environment"},
          {fps:8, qrbox:{width:220,height:220}},
          (decoded)=>{
            if(doneRef.current) return;
            doneRef.current=true;
            statusEl.style.color="#22c55e";
            statusEl.textContent="✓ "+decoded;
            scanDiv.style.boxShadow="0 0 0 4px #22c55e";
            // Stop scanner, then call onResult after cleanup
            try{ sc.stop().catch(()=>{}); } catch(e){}
            setTimeout(()=>{
              cleanup();
              onResult(decoded);
            }, 700);
          },
          ()=>{}
        )
        .then(()=>{ statusEl.textContent="Hold QR-koden inden for rammen"; })
        .catch(e=>{ statusEl.textContent="❌ "+String(e).slice(0,80); });
      } catch(e){
        statusEl.textContent="❌ "+String(e).slice(0,80);
      }
    }

    if(window.Html5Qrcode){
      startScanner();
    } else {
      statusEl.textContent="Henter scanner-bibliotek...";
      const s=document.createElement("script");
      s.src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
      s.onload=startScanner;
      s.onerror=()=>{ statusEl.textContent="❌ Netværksfejl - prøv igen"; };
      document.head.appendChild(s);
    }

    return ()=>{ cleanup(); };
  },[]);

  // This component renders nothing — UI is in the portal outside React
  return null;
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
        <h1 style={{margin:0,fontSize:20,fontWeight:700,color:"#fff"}}>{mc.reg||"Ny MC"}</h1>
      </div>
      <div style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",padding:"18px 16px",display:"flex",flexDirection:"column",gap:14}}>
        {[{key:"reg",l:"Registreringsnummer"},{key:"stel",l:"Stelnummer"},{key:"beskrivelse",l:"Beskrivelse"},{key:"syn",l:"Sidst syn (dato)",type:"date"},{key:"km",l:"Kilometertal",type:"number"}].map(f=>(
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

      {/* Dato row */}
      <div style={{marginBottom:14,maxWidth:220}}>
        <label style={{display:"block",fontSize:11,color:"#ffdddd",marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>Dato</label>
        <input type="date" value={faktura.dato} onChange={e=>setFaktura(p=>({...p,dato:e.target.value}))} style={{...inp,background:"#b30000",border:"1px solid #ff4444",color:"#fff"}}/>
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
function OpgaverView({opgaver,setOpgaver,locations,notify,visForm,setVisForm,inp,btnRed,btnGhost}) {
  const [search,setSearch]=useState("");
  const [filterLoc,setFilterLoc]=useState("Alle");
  const [filterStatus,setFilterStatus]=useState("aktive");
  const [form,setForm]=useState({titel:"",beskrivelse:"",lokation:locations[0],senestUdfoert:new Date().toISOString().split("T")[0]});

  const tilfoej=()=>{
    if(!form.titel.trim()){notify("Skriv en titel",true);return;}
    const ny={id:Date.now(),titel:form.titel.trim(),beskrivelse:form.beskrivelse.trim(),lokation:form.lokation,senestUdfoert:form.senestUdfoert,oprettet:new Date().toISOString().split("T")[0],udfoert:false,udfoertDato:null};
    setOpgaver(p=>[ny,...p]);
    setForm({titel:"",beskrivelse:"",lokation:locations[0],senestUdfoert:new Date().toISOString().split("T")[0]});
    setVisForm(false);
    notify("Opgave oprettet ✓");
  };

  const markerUdfoert=(id)=>{
    setOpgaver(p=>p.map(o=>o.id===id?{...o,udfoert:true,udfoertDato:new Date().toISOString().split("T")[0]}:o));
    notify("Opgave markeret som udført ✓");
  };

  const slet=(id)=>{
    setOpgaver(p=>p.filter(o=>o.id!==id));
    notify("Opgave slettet");
  };

  const genaktiver=(id)=>{
    setOpgaver(p=>p.map(o=>o.id===id?{...o,udfoert:false,udfoertDato:null}:o));
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
          {locations.map(l=><option key={l}>{l}</option>)}
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
                  {o.beskrivelse&&<div style={{fontSize:13,color:"#aaa",lineHeight:1.5,marginBottom:10}}>{o.beskrivelse}</div>}
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


function AlleFakturaer({fakturaer,onVis,fmt,inp,btnGhost}) {
  const [search,setSearch]=useState("");
  const fil=fakturaer.filter(f=>!search||f.id.toLowerCase().includes(search.toLowerCase())||f.mcReg.toLowerCase().includes(search.toLowerCase()));
  const total=fakturaer.reduce((s,f)=>s+f.total,0);
  return (
    <div style={{paddingBottom:20}}>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
        <h1 style={{margin:0,fontSize:22,fontWeight:700,color:"#fff"}}>Fakturaer</h1>
        <div style={{marginLeft:"auto",background:"#1a3a2a",borderRadius:8,padding:"7px 14px",border:"1px solid #22c55e33"}}>
          <span style={{color:"#888",fontSize:11}}>TOTAL: </span>
          <span style={{fontWeight:800,color:"#4ade80",fontSize:16}}>{fmt(total)} kr</span>
        </div>
      </div>
      <input placeholder="🔍  Søg..." value={search} onChange={e=>setSearch(e.target.value)} style={{...inp,maxWidth:320,marginBottom:14,background:"#1e1e1e",border:"1px solid #333"}}/>
      <div style={{background:"#1a1a1a",borderRadius:10,border:"1px solid #2a2a2a",overflow:"hidden"}}>
        {fil.length===0?(
          <div style={{padding:40,textAlign:"center",color:"#555",fontSize:14}}>{fakturaer.length===0?"Ingen fakturaer — opret fra en MC":"Ingen resultater"}</div>
        ):(
          <div>
            <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed"}}>
              <colgroup><col style={{width:"22%"}}/><col style={{width:"26%"}}/><col style={{width:"26%"}}/><col style={{width:"20%"}}/><col style={{width:"6%"}}/></colgroup>
              <thead><tr style={{background:"#222"}}>
                {["Faktura nr","MC Reg.nr","Dato","Total",""].map(h=>(
                  <th key={h} style={{padding:"9px 10px",textAlign:"left",fontSize:10,letterSpacing:.5,color:"#777",fontWeight:700,textTransform:"uppercase",overflow:"hidden"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {fil.map((f,i)=>(
                  <tr key={f.id} className="tap" style={{background:i%2===0?"#1a1a1a":"#1e1e1e",borderBottom:"1px solid #222",cursor:"pointer"}} onClick={()=>onVis(f)}>
                    <td style={{padding:"10px 10px",fontWeight:700,color:"#f87171",fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.id}</td>
                    <td style={{padding:"10px 10px",fontWeight:600,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.mcReg}</td>
                    <td style={{padding:"10px 10px",fontSize:12,color:"#ccc",whiteSpace:"nowrap"}}>{fmtDato(f.dato)}</td>
                    <td style={{padding:"10px 10px",fontWeight:700,color:"#4ade80",fontSize:12,whiteSpace:"nowrap"}}>{fmt(f.total)} kr</td>
                    <td style={{padding:"10px 6px",color:"#888",textAlign:"center"}}>›</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FakturaDetalje({faktura,onBack,onRediger,fmt,btnGhost,btnRed}) {
  return (
    <div style={{paddingBottom:20}}>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
        <button onClick={onBack} style={{...btnGhost,fontSize:13,padding:"8px 14px"}}>← Tilbage</button>
        <h1 style={{margin:0,fontSize:18,fontWeight:700,color:"#fff",flex:1,minWidth:0}}>{faktura.id} — {faktura.mcReg}</h1>
        <button onClick={()=>onRediger(faktura)} style={{...btnRed,fontSize:13,padding:"8px 16px"}}>✏️ Rediger</button>
      </div>
      <div style={{background:"#b30000",borderRadius:10,padding:"16px 14px",marginBottom:12}}>
        <div style={{display:"flex",gap:20,flexWrap:"wrap",marginBottom:faktura.note?12:0}}>
          {[{l:"Faktura nr",v:faktura.id},{l:"MC",v:faktura.mcReg},{l:"Dato",v:fmtDato(faktura.dato)}].map(r=>(
            <div key={r.l}><div style={{fontSize:11,color:"#ffdddd",letterSpacing:.8,marginBottom:2,fontWeight:600,textTransform:"uppercase"}}>{r.l}</div><div style={{fontWeight:700,fontSize:14,color:"#fff"}}>{r.v}</div></div>
          ))}
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

function YdelserView({ydelser,nyYdelse,setNyYdelse,editYdelse,setEditYdelse,onGem,onSave,onDel,inp,btnRed,btnGhost,fmt}) {
  const cur=editYdelse||nyYdelse;
  const set=editYdelse?setEditYdelse:setNyYdelse;
  return (
    <div style={{paddingBottom:20}}>
      <h1 style={{margin:"0 0 18px",fontSize:22,fontWeight:700,color:"#fff"}}>Administration</h1>
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
