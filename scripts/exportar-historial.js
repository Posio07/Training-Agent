#!/usr/bin/env node
/* DEC-023 (Propuesto): exportación del historial completo (perfiles, medidas, sesiones y series) a JSON y CSV, para archivarlo
 * FUERA de la app antes de un reset de datos. Solo lee los archivos de entrada; escribe solo en la carpeta de salida.
 *
 *   node scripts/exportar-historial.js <entrada.json> [<otra.json> ...] [--salida <carpeta>]
 *
 * Entradas aceptadas (de cualquier combinación):
 *  - el volcado del almacenamiento de la app: en la consola del navegador, con la app abierta, `copy(localStorage.getItem('ifbb-agent:v1'))`
 *    y se pega en un archivo (objeto con `profiles`);
 *  - la exportación de un perfil que hace la app (botón Exportar), o una lista de perfiles.
 * No archiva la sesión en curso (`ifbb-agent:session:v1`): termina o descarta la sesión antes de exportar.
 * Salida (por defecto `./historial-<fecha>/`): historial.json, perfiles.csv, medidas.csv, sesiones.csv y series.csv.
 *
 * PRIVACIDAD (DEC-009): igual que la exportación de la app, los datos de salud y el dolor por serie NO entran. Se quitan con
 * `exportProfile` del motor y, además, el script comprueba que la salida no contenga ningún campo de salud ni de dolor. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const E = require(path.join(__dirname, '../ifbb-pro-agent/js/engine.js'));

const PRIVATE_KEYS = ['health', 'painFlags', 'pain', 'painNow', 'painSessions', 'injuryZones', 'injuryDiagnosed', 'healthSymptoms', 'diabetesType', 'healthDiabetesMed', 'clearanceDate'];

// Lista de perfiles de un objeto leído: volcado del almacenamiento, lista, o un perfil suelto.
function profilesOf(obj) {
  const list = Array.isArray(obj) ? obj : Array.isArray(obj && obj.profiles) ? obj.profiles : [obj];
  return list.filter(p => p && p.data && p.data.name);
}

// Un perfil sin salud ni dolor (misma función que el botón Exportar de la app, DEC-009).
function cleanProfile(p) {
  const c = E.exportProfile(p);
  return {
    id: c.id || null, nombre: c.data.name, creado: c.createdAt || null, actualizado: c.updatedAt || null,
    data: c.data, log: Array.isArray(c.log) ? c.log : [], workouts: Array.isArray(c.workouts) ? c.workouts : [], sessions: Array.isArray(c.sessions) ? c.sessions : [],
  };
}

// Falla si en la salida queda algún campo de salud o de dolor (DEC-009).
function assertNoPrivate(value, where = 'historial') {
  if (Array.isArray(value)) return value.forEach((v, i) => assertNoPrivate(v, `${where}[${i}]`));
  if (value && typeof value === 'object') {
    Object.keys(value).forEach(k => {
      if (PRIVATE_KEYS.includes(k)) throw new Error(`DEC-009: el campo "${k}" no puede salir del dispositivo (${where})`);
      assertNoPrivate(value[k], `${where}.${k}`);
    });
  }
}

const csvCell = v => {
  if (v == null) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
// Tabla -> CSV con las columnas que aparezcan en las filas (en orden de primera aparición), separador coma y BOM para Excel.
function toCsv(rows, firstCols = []) {
  const cols = [...firstCols];
  rows.forEach(r => Object.keys(r).forEach(k => { if (!cols.includes(k)) cols.push(k); }));
  return '﻿' + [cols.join(',')].concat(rows.map(r => cols.map(c => csvCell(r[c])).join(','))).join('\r\n') + '\r\n';
}

function build(inputs, now = new Date()) {
  const profiles = [];
  inputs.forEach(obj => profilesOf(obj).forEach(p => profiles.push(cleanProfile(p))));
  const historial = { formato: 1, exportadoEn: now.toISOString(), nota: 'Historial archivado por scripts/exportar-historial.js (DEC-023). Sin datos de salud ni dolor por serie (DEC-009).', perfiles: profiles };
  assertNoPrivate(historial);
  const pid = p => ({ perfilId: p.id, perfil: p.nombre });
  const tables = {
    'perfiles.csv': toCsv(profiles.map(p => Object.assign(pid(p), { creado: p.creado, actualizado: p.actualizado, series: p.workouts.length, sesiones: p.sessions.length, medidas: p.log.length }, p.data)), ['perfilId', 'perfil']),
    'medidas.csv': toCsv(profiles.flatMap(p => p.log.map(m => Object.assign(pid(p), m))), ['perfilId', 'perfil', 'date']),
    'sesiones.csv': toCsv(profiles.flatMap(p => p.sessions.map(s => Object.assign(pid(p), s))), ['perfilId', 'perfil', 'sessionId', 'date']),
    'series.csv': toCsv(profiles.flatMap(p => p.workouts.map(w => Object.assign(pid(p), w))), ['perfilId', 'perfil', 'date', 'sessionId', 'exercise', 'setType', 'setNumber', 'weight', 'reps']),
  };
  return { historial, tables };
}

function main(argv) {
  const files = [];
  let out = null;
  for (let i = 0; i < argv.length; i++) { if (argv[i] === '--salida') out = argv[++i]; else files.push(argv[i]); }
  if (!files.length) { console.error('Uso: node scripts/exportar-historial.js <entrada.json> [<otra.json> ...] [--salida <carpeta>]'); return 2; }
  const inputs = files.map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
  let built;
  try { built = build(inputs); } catch (e) { console.error(`No se exportó nada: ${e.message}`); return 1; }
  const { historial, tables } = built;
  if (!historial.perfiles.length) { console.error('Ninguna entrada trae perfiles con datos (data.name).'); return 1; }
  const dir = out || path.join(process.cwd(), `historial-${historial.exportadoEn.slice(0, 10)}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'historial.json'), JSON.stringify(historial, null, 2));
  Object.entries(tables).forEach(([name, text]) => fs.writeFileSync(path.join(dir, name), text));
  const n = k => historial.perfiles.reduce((a, p) => a + p[k].length, 0);
  console.log(`Exportado en ${dir}: ${historial.perfiles.length} perfiles, ${n('sessions')} sesiones, ${n('workouts')} series, ${n('log')} medidas.`);
  return 0;
}

module.exports = { profilesOf, cleanProfile, assertNoPrivate, toCsv, build, PRIVATE_KEYS };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
