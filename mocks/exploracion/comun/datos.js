/* Datos de los mocks de exploración. El plan, las series, los descansos, el top set y las reglas salen del generador real de la app
 * (núcleo v2, perfil de referencia oscar_cut_classic_5d). El historial ("última vez", sesiones pasadas) y las cargas sugeridas son
 * inventados para poder mostrar comparaciones y el récord. Este archivo no lo usa la app. */
window.MOCK_DATOS = {
 "origen": "Generado con el generador real (core-v2.7) sobre el perfil de referencia oscar_cut_classic_5d. El historial (\"última vez\") es inventado para el mock.",
 "perfil": {
  "nombre": "Oscar",
  "objetivo": "Definición",
  "division": "Classic Physique",
  "nivel": "Intermedio",
  "dias": 5,
  "pesoKg": 84,
  "unidad": "kg",
  "barra": 20,
  "discos": [
   25,
   20,
   15,
   10,
   5,
   2.5,
   1.25
  ]
 },
 "hoy": 0,
 "semana": [
  {
   "nombre": "Día 1 · Torso",
   "minutos": 51,
   "capacidad": 75,
   "series": 20,
   "ejercicios": 7,
   "grupos": [
    "Pecho",
    "Espalda",
    "Bíceps",
    "Hombros",
    "Pantorrillas"
   ],
   "topSet": "Press banca con barra"
  },
  {
   "nombre": "Día 2 · Pierna (sentadilla)",
   "minutos": 50,
   "capacidad": 75,
   "series": 19,
   "ejercicios": 5,
   "grupos": [
    "Cuádriceps",
    "Glúteos",
    "Isquiotibiales"
   ],
   "topSet": "Sentadilla trasera"
  },
  {
   "nombre": "Día 3 · Empuje",
   "minutos": 40,
   "capacidad": 75,
   "series": 16,
   "ejercicios": 6,
   "grupos": [
    "Pecho",
    "Hombros",
    "Tríceps",
    "Abdomen"
   ],
   "topSet": "Press banca con barra"
  },
  {
   "nombre": "Día 4 · Tirón",
   "minutos": 48,
   "capacidad": 75,
   "series": 17,
   "ejercicios": 5,
   "grupos": [
    "Espalda",
    "Abdomen",
    "Hombros"
   ],
   "topSet": "Dominadas"
  },
  {
   "nombre": "Día 5 · Pierna (bisagra)",
   "minutos": 52,
   "capacidad": 75,
   "series": 20,
   "ejercicios": 6,
   "grupos": [
    "Isquiotibiales",
    "Cuádriceps",
    "Glúteos",
    "Pantorrillas"
   ],
   "topSet": "Peso muerto rumano"
  }
 ],
 "sesiones": {
  "completa": {
   "nombre": "Día 1 · Torso",
   "minutos": 51,
   "capacidad": 75,
   "series": 20,
   "avisos": [],
   "ejercicios": [
    {
     "id": "chest.bench_press_barbell",
     "nombre": "Press banca con barra",
     "grupo": "Pecho",
     "tipo": "multiarticular",
     "barra": true,
     "unilateral": false,
     "minutos": 14,
     "evidencia": "probable",
     "evidenciaPorVerificar": false,
     "topSet": {
      "reps": [
       4,
       6
      ],
      "rir": [
       1,
       2
      ],
      "backoffs": 3,
      "reduccion": 10
     },
     "sets": [
      {
       "tipo": "top",
       "n": 1,
       "reps": "4-6",
       "descanso": "3 min",
       "descansoS": 180
      },
      {
       "tipo": "backoff",
       "n": 1,
       "reps": "6-10",
       "descanso": "2,5 min",
       "descansoS": 150
      },
      {
       "tipo": "backoff",
       "n": 2,
       "reps": "6-10",
       "descanso": "2,5 min",
       "descansoS": 150
      },
      {
       "tipo": "backoff",
       "n": 3,
       "reps": "6-10",
       "descanso": "2,5 min",
       "descansoS": 150
      }
     ],
     "ultima": {
      "fecha": "2026-11-09",
      "sets": [
       {
        "tipo": "top",
        "n": 1,
        "peso": 100,
        "reps": 5
       },
       {
        "tipo": "backoff",
        "n": 1,
        "peso": 90,
        "reps": 8
       },
       {
        "tipo": "backoff",
        "n": 2,
        "peso": 90,
        "reps": 8
       },
       {
        "tipo": "backoff",
        "n": 3,
        "peso": 90,
        "reps": 7
       }
      ]
     },
     "sugerido": [
      {
       "peso": 102.5,
       "reps": 5
      },
      {
       "peso": 90,
       "reps": 8
      },
      {
       "peso": 90,
       "reps": 8
      },
      {
       "peso": 90,
       "reps": 8
      }
     ]
    },
    {
     "id": "back.row_chest_supported_machine",
     "nombre": "Remo con apoyo de pecho en máquina",
     "grupo": "Espalda",
     "tipo": "multiarticular",
     "barra": false,
     "unilateral": false,
     "minutos": 7,
     "evidencia": "a_verificar",
     "evidenciaPorVerificar": true,
     "topSet": null,
     "sets": [
      {
       "tipo": "normal",
       "n": 1,
       "reps": "8-12",
       "descanso": "2,5 min",
       "descansoS": 150
      },
      {
       "tipo": "normal",
       "n": 2,
       "reps": "8-12",
       "descanso": "2,5 min",
       "descansoS": 150
      }
     ],
     "ultima": {
      "fecha": "2026-11-09",
      "sets": [
       {
        "tipo": "normal",
        "n": 1,
        "peso": 60,
        "reps": 10
       },
       {
        "tipo": "normal",
        "n": 2,
        "peso": 60,
        "reps": 9
       }
      ]
     },
     "sugerido": [
      {
       "peso": 60,
       "reps": 11
      },
      {
       "peso": 60,
       "reps": 10
      }
     ]
    },
    {
     "id": "back.pull_up",
     "nombre": "Dominadas",
     "grupo": "Espalda",
     "tipo": "multiarticular",
     "barra": false,
     "unilateral": false,
     "minutos": 7,
     "evidencia": "probable",
     "evidenciaPorVerificar": false,
     "topSet": null,
     "sets": [
      {
       "tipo": "normal",
       "n": 1,
       "reps": "6-10",
       "descanso": "2,5 min",
       "descansoS": 150
      },
      {
       "tipo": "normal",
       "n": 2,
       "reps": "6-10",
       "descanso": "2,5 min",
       "descansoS": 150
      }
     ],
     "ultima": {
      "fecha": "2026-11-09",
      "sets": [
       {
        "tipo": "normal",
        "n": 1,
        "peso": 10,
        "reps": 8
       },
       {
        "tipo": "normal",
        "n": 2,
        "peso": 10,
        "reps": 7
       }
      ]
     },
     "sugerido": [
      {
       "peso": 10,
       "reps": 8
      },
      {
       "peso": 10,
       "reps": 8
      }
     ]
    },
    {
     "id": "biceps.curl_barbell",
     "nombre": "Curl con barra",
     "grupo": "Bíceps",
     "tipo": "aislamiento",
     "barra": false,
     "unilateral": false,
     "minutos": 4,
     "evidencia": "verificado",
     "evidenciaPorVerificar": false,
     "topSet": null,
     "sets": [
      {
       "tipo": "normal",
       "n": 1,
       "reps": "8-12",
       "descanso": "75 s",
       "descansoS": 75
      },
      {
       "tipo": "normal",
       "n": 2,
       "reps": "8-12",
       "descanso": "75 s",
       "descansoS": 75
      }
     ],
     "ultima": {
      "fecha": "2026-11-09",
      "sets": [
       {
        "tipo": "normal",
        "n": 1,
        "peso": 35,
        "reps": 10
       },
       {
        "tipo": "normal",
        "n": 2,
        "peso": 35,
        "reps": 9
       }
      ]
     },
     "sugerido": [
      {
       "peso": 35,
       "reps": 11
      },
      {
       "peso": 35,
       "reps": 10
      }
     ]
    },
    {
     "id": "chest.fly_cable",
     "nombre": "Aperturas en polea",
     "grupo": "Pecho",
     "tipo": "aislamiento",
     "barra": false,
     "unilateral": false,
     "minutos": 4,
     "evidencia": "probable",
     "evidenciaPorVerificar": false,
     "topSet": null,
     "sets": [
      {
       "tipo": "normal",
       "n": 1,
       "reps": "10-15",
       "descanso": "75 s",
       "descansoS": 75
      },
      {
       "tipo": "normal",
       "n": 2,
       "reps": "10-15",
       "descanso": "75 s",
       "descansoS": 75
      }
     ],
     "ultima": {
      "fecha": "2026-11-09",
      "sets": [
       {
        "tipo": "normal",
        "n": 1,
        "peso": 17.5,
        "reps": 13
       },
       {
        "tipo": "normal",
        "n": 2,
        "peso": 17.5,
        "reps": 12
       }
      ]
     },
     "sugerido": [
      {
       "peso": 17.5,
       "reps": 14
      },
      {
       "peso": 17.5,
       "reps": 13
      }
     ]
    },
    {
     "id": "shoulders.lateral_raise_db",
     "nombre": "Elevaciones laterales con mancuerna",
     "grupo": "Hombros",
     "tipo": "aislamiento",
     "barra": false,
     "unilateral": false,
     "minutos": 6,
     "evidencia": "verificado",
     "evidenciaPorVerificar": false,
     "topSet": null,
     "sets": [
      {
       "tipo": "normal",
       "n": 1,
       "reps": "10-15",
       "descanso": "75 s",
       "descansoS": 75
      },
      {
       "tipo": "normal",
       "n": 2,
       "reps": "10-15",
       "descanso": "75 s",
       "descansoS": 75
      },
      {
       "tipo": "normal",
       "n": 3,
       "reps": "10-15",
       "descanso": "75 s",
       "descansoS": 75
      }
     ],
     "ultima": {
      "fecha": "2026-11-09",
      "sets": [
       {
        "tipo": "normal",
        "n": 1,
        "peso": 10,
        "reps": 14
       },
       {
        "tipo": "normal",
        "n": 2,
        "peso": 10,
        "reps": 13
       },
       {
        "tipo": "normal",
        "n": 3,
        "peso": 10,
        "reps": 12
       }
      ]
     },
     "sugerido": [
      {
       "peso": 10,
       "reps": 15
      },
      {
       "peso": 10,
       "reps": 13
      },
      {
       "peso": 10,
       "reps": 13
      }
     ]
    },
    {
     "id": "calves.calf_raise_seated",
     "nombre": "Elevación de talones sentado",
     "grupo": "Pantorrillas",
     "tipo": "aislamiento",
     "barra": false,
     "unilateral": false,
     "minutos": 10,
     "evidencia": "verificado",
     "evidenciaPorVerificar": false,
     "topSet": null,
     "sets": [
      {
       "tipo": "normal",
       "n": 1,
       "reps": "12-15",
       "descanso": "75 s",
       "descansoS": 75
      },
      {
       "tipo": "normal",
       "n": 2,
       "reps": "12-15",
       "descanso": "75 s",
       "descansoS": 75
      },
      {
       "tipo": "normal",
       "n": 3,
       "reps": "12-15",
       "descanso": "75 s",
       "descansoS": 75
      },
      {
       "tipo": "normal",
       "n": 4,
       "reps": "12-15",
       "descanso": "75 s",
       "descansoS": 75
      },
      {
       "tipo": "normal",
       "n": 5,
       "reps": "12-15",
       "descanso": "75 s",
       "descansoS": 75
      }
     ],
     "ultima": {
      "fecha": "2026-11-09",
      "sets": [
       {
        "tipo": "normal",
        "n": 1,
        "peso": 50,
        "reps": 15
       },
       {
        "tipo": "normal",
        "n": 2,
        "peso": 50,
        "reps": 15
       },
       {
        "tipo": "normal",
        "n": 3,
        "peso": 50,
        "reps": 14
       },
       {
        "tipo": "normal",
        "n": 4,
        "peso": 50,
        "reps": 13
       },
       {
        "tipo": "normal",
        "n": 5,
        "peso": 50,
        "reps": 12
       }
      ]
     },
     "sugerido": [
      {
       "peso": 50,
       "reps": 15
      },
      {
       "peso": 50,
       "reps": 15
      },
      {
       "peso": 50,
       "reps": 15
      },
      {
       "peso": 50,
       "reps": 13
      },
      {
       "peso": 50,
       "reps": 13
      }
     ]
    }
   ]
  },
  "corta30": {
   "nombre": "Día 1 · Torso",
   "minutos": 27,
   "capacidad": 30,
   "series": 8,
   "avisos": [],
   "ejercicios": [
    {
     "id": "chest.bench_press_barbell",
     "nombre": "Press banca con barra",
     "grupo": "Pecho",
     "tipo": "multiarticular",
     "barra": true,
     "unilateral": false,
     "minutos": 14,
     "evidencia": "probable",
     "evidenciaPorVerificar": false,
     "topSet": {
      "reps": [
       4,
       6
      ],
      "rir": [
       1,
       2
      ],
      "backoffs": 3,
      "reduccion": 10
     },
     "sets": [
      {
       "tipo": "top",
       "n": 1,
       "reps": "4-6",
       "descanso": "3 min",
       "descansoS": 180
      },
      {
       "tipo": "backoff",
       "n": 1,
       "reps": "6-10",
       "descanso": "2,5 min",
       "descansoS": 150
      },
      {
       "tipo": "backoff",
       "n": 2,
       "reps": "6-10",
       "descanso": "2,5 min",
       "descansoS": 150
      },
      {
       "tipo": "backoff",
       "n": 3,
       "reps": "6-10",
       "descanso": "2,5 min",
       "descansoS": 150
      }
     ],
     "ultima": {
      "fecha": "2026-11-09",
      "sets": [
       {
        "tipo": "top",
        "n": 1,
        "peso": 100,
        "reps": 5
       },
       {
        "tipo": "backoff",
        "n": 1,
        "peso": 90,
        "reps": 8
       },
       {
        "tipo": "backoff",
        "n": 2,
        "peso": 90,
        "reps": 8
       },
       {
        "tipo": "backoff",
        "n": 3,
        "peso": 90,
        "reps": 7
       }
      ]
     },
     "sugerido": [
      {
       "peso": 102.5,
       "reps": 5
      },
      {
       "peso": 90,
       "reps": 8
      },
      {
       "peso": 90,
       "reps": 8
      },
      {
       "peso": 90,
       "reps": 8
      }
     ]
    },
    {
     "id": "back.row_chest_supported_machine",
     "nombre": "Remo con apoyo de pecho en máquina",
     "grupo": "Espalda",
     "tipo": "multiarticular",
     "barra": false,
     "unilateral": false,
     "minutos": 7,
     "evidencia": "a_verificar",
     "evidenciaPorVerificar": true,
     "topSet": null,
     "sets": [
      {
       "tipo": "normal",
       "n": 1,
       "reps": "8-12",
       "descanso": "2,5 min",
       "descansoS": 150
      },
      {
       "tipo": "normal",
       "n": 2,
       "reps": "8-12",
       "descanso": "2,5 min",
       "descansoS": 150
      }
     ],
     "ultima": {
      "fecha": "2026-11-09",
      "sets": [
       {
        "tipo": "normal",
        "n": 1,
        "peso": 60,
        "reps": 10
       },
       {
        "tipo": "normal",
        "n": 2,
        "peso": 60,
        "reps": 9
       }
      ]
     },
     "sugerido": [
      {
       "peso": 60,
       "reps": 11
      },
      {
       "peso": 60,
       "reps": 10
      }
     ]
    },
    {
     "id": "back.pull_up",
     "nombre": "Dominadas",
     "grupo": "Espalda",
     "tipo": "multiarticular",
     "barra": false,
     "unilateral": false,
     "minutos": 7,
     "evidencia": "probable",
     "evidenciaPorVerificar": false,
     "topSet": null,
     "sets": [
      {
       "tipo": "normal",
       "n": 1,
       "reps": "6-10",
       "descanso": "2,5 min",
       "descansoS": 150
      },
      {
       "tipo": "normal",
       "n": 2,
       "reps": "6-10",
       "descanso": "2,5 min",
       "descansoS": 150
      }
     ],
     "ultima": {
      "fecha": "2026-11-09",
      "sets": [
       {
        "tipo": "normal",
        "n": 1,
        "peso": 10,
        "reps": 8
       },
       {
        "tipo": "normal",
        "n": 2,
        "peso": 10,
        "reps": 7
       }
      ]
     },
     "sugerido": [
      {
       "peso": 10,
       "reps": 8
      },
      {
       "peso": 10,
       "reps": 8
      }
     ]
    }
   ],
   "minutosPedidos": 30
  }
 },
 "reglas": [
  {
   "id": "DESCANSO_TOP_SET_S",
   "valor": 180,
   "unidad": "s",
   "nivel": "E4",
   "dec": "DEC-024",
   "fuente": "criterio de diseño"
  },
  {
   "id": "DESCANSO_BACKOFF_S",
   "valor": 150,
   "unidad": "s",
   "nivel": "E4",
   "dec": "DEC-024",
   "fuente": "criterio de diseño"
  },
  {
   "id": "DESCANSO_MULTIARTICULAR_S",
   "valor": 150,
   "unidad": "s",
   "nivel": "E4",
   "dec": "DEC-024",
   "fuente": "criterio de diseño"
  },
  {
   "id": "DESCANSO_AISLAMIENTO_S",
   "valor": 75,
   "unidad": "s",
   "nivel": "E4",
   "dec": "DEC-024",
   "fuente": "criterio de diseño"
  },
  {
   "id": "DESCANSO_PISO_RESPALDADO_S",
   "valor": 60,
   "unidad": "s",
   "nivel": "E2",
   "dec": "DEC-024",
   "fuente": "Singer et al. 2024, Front Sports Act Living 6:1429789 (PMID 39205815) y otras; leídas en resumen. E2 con salvedad: respalda un piso de 60 a 90 s, no los valores por tipo de ejercicio"
  },
  {
   "id": "DIVISOR_1RM_EPLEY",
   "valor": 30,
   "unidad": "repeticiones",
   "nivel": "E4",
   "dec": "DEC-015",
   "fuente": "criterio de diseño"
  },
  {
   "id": "TOP_SET_SOLO_EN_DEFINICION",
   "valor": true,
   "unidad": "regla",
   "nivel": "E4",
   "dec": "DEC-002",
   "fuente": "criterio de diseño"
  }
 ],
 "historial": [
  {
   "fecha": "2026-11-09",
   "nombre": "Día 1 · Torso",
   "minutos": 49,
   "hechas": 20,
   "total": 20
  },
  {
   "fecha": "2026-11-10",
   "nombre": "Día 2 · Pierna (sentadilla)",
   "minutos": 52,
   "hechas": 19,
   "total": 19
  },
  {
   "fecha": "2026-11-11",
   "nombre": "Día 3 · Empuje",
   "minutos": 38,
   "hechas": 16,
   "total": 16
  },
  {
   "fecha": "2026-11-13",
   "nombre": "Día 4 · Tirón",
   "minutos": 47,
   "hechas": 16,
   "total": 17
  },
  {
   "fecha": "2026-11-14",
   "nombre": "Día 5 · Pierna (bisagra)",
   "minutos": 55,
   "hechas": 20,
   "total": 20
  }
 ],
 "fechaHoy": "2026-11-16"
};
