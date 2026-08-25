const SUPPORTED_LANGUAGES = new Set(['en', 'es']);

const SCENARIOS = Object.freeze([
  {
    id: 'greenfield-supercell',
    title: {
      en: 'Supercell structure · Iowa',
      es: 'Estructura de supercélula · Iowa'
    },
    summary: {
      en: 'Archived composite radar near Greenfield, Iowa. Follow the hook-shaped reflectivity appendage and inflow-side structure through five frames.',
      es: 'Radar compuesto archivado cerca de Greenfield, Iowa. Sigue el apéndice de reflectividad en forma de gancho y la estructura del lado de entrada durante cinco cuadros.'
    },
    period: ['2024-05-21T20:30:00Z', '2024-05-21T20:50:00Z'],
    center: [41.31, -94.52],
    zoom: 8,
    annotations: [
      {
        title: { en: 'Hook-shaped appendage', es: 'Apéndice en forma de gancho' },
        detail: {
          en: 'Look for precipitation wrapping around the storm’s southwest flank. Reflectivity shape alone does not confirm a tornado.',
          es: 'Busca precipitación envolviendo el flanco suroeste de la tormenta. La forma de reflectividad por sí sola no confirma un tornado.'
        },
        kind: 'point',
        geometry: { type: 'Point', coordinates: [-94.52, 41.31] }
      },
      {
        title: { en: 'Inflow-side notch', es: 'Muesca del lado de entrada' },
        detail: {
          en: 'Compare the lower-reflectivity inflow side with the denser core as the frames advance.',
          es: 'Compara el lado de entrada de menor reflectividad con el núcleo más denso a medida que avanzan los cuadros.'
        },
        kind: 'line',
        geometry: { type: 'LineString', coordinates: [[-94.74, 41.22], [-94.55, 41.33]] }
      },
      {
        title: { en: 'Study area—not a warning', es: 'Área de estudio; no es una alerta' },
        detail: {
          en: 'Use any archived official warning polygon as context. This dashed box only bounds the lesson area.',
          es: 'Usa cualquier polígono de alerta oficial archivado como contexto. Este cuadro discontinuo solo delimita el área de la lección.'
        },
        kind: 'area',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-94.86, 41.08], [-94.18, 41.08], [-94.18, 41.55], [-94.86, 41.55], [-94.86, 41.08]]]
        }
      }
    ]
  },
  {
    id: 'iowa-derecho',
    title: {
      en: 'Bow echo · Iowa derecho',
      es: 'Eco en arco · derecho de Iowa'
    },
    summary: {
      en: 'Archived composite radar over central and eastern Iowa. Trace the bowed convective line and its faster-moving apex.',
      es: 'Radar compuesto archivado sobre el centro y este de Iowa. Sigue la línea convectiva arqueada y su vértice de movimiento más rápido.'
    },
    period: ['2020-08-10T17:00:00Z', '2020-08-10T17:25:00Z'],
    center: [42.02, -92.1],
    zoom: 7,
    annotations: [
      {
        title: { en: 'Bowing convective line', es: 'Línea convectiva arqueada' },
        detail: {
          en: 'A forward-bulging line can focus damaging straight-line winds near and behind the apex.',
          es: 'Una línea que sobresale hacia delante puede concentrar vientos dañinos en línea recta cerca y detrás del vértice.'
        },
        kind: 'line',
        geometry: { type: 'LineString', coordinates: [[-93.25, 42.55], [-92.55, 42.25], [-91.75, 41.95], [-91.05, 41.62]] }
      },
      {
        title: { en: 'Leading-line apex', es: 'Vértice de la línea principal' },
        detail: {
          en: 'Step the replay and compare the apex displacement with the line ends; motion matters as much as shape.',
          es: 'Avanza la repetición y compara el desplazamiento del vértice con los extremos de la línea; el movimiento importa tanto como la forma.'
        },
        kind: 'point',
        geometry: { type: 'Point', coordinates: [-92.1, 42.03] }
      },
      {
        title: { en: 'Trailing precipitation', es: 'Precipitación posterior' },
        detail: {
          en: 'Broader precipitation behind the leading edge can hide the line shape at national-composite scale.',
          es: 'La precipitación más amplia detrás del borde delantero puede ocultar la forma de la línea a escala del compuesto nacional.'
        },
        kind: 'area',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-93.5, 41.7], [-92.7, 41.55], [-92.2, 42.35], [-93.0, 42.6], [-93.5, 41.7]]]
        }
      }
    ]
  },
  {
    id: 'ida-eyewall',
    title: {
      en: 'Tropical eyewall · Hurricane Ida',
      es: 'Pared del ojo tropical · Huracán Ida'
    },
    summary: {
      en: 'Archived composite radar over southeast Louisiana. Compare the eye, eyewall, and outer rainband structure.',
      es: 'Radar compuesto archivado sobre el sureste de Luisiana. Compara la estructura del ojo, la pared del ojo y las bandas exteriores.'
    },
    period: ['2021-08-29T16:30:00Z', '2021-08-29T17:00:00Z'],
    center: [29.15, -90.25],
    zoom: 7,
    annotations: [
      {
        title: { en: 'Eye', es: 'Ojo' },
        detail: {
          en: 'The lower-reflectivity center is surrounded by stronger echoes; a quiet-looking eye does not imply safe conditions.',
          es: 'El centro de menor reflectividad está rodeado por ecos más intensos; un ojo aparentemente tranquilo no implica condiciones seguras.'
        },
        kind: 'point',
        geometry: { type: 'Point', coordinates: [-90.25, 29.15] }
      },
      {
        title: { en: 'Eyewall arc', es: 'Arco de la pared del ojo' },
        detail: {
          en: 'The strongest reflectivity ring marks deep convection around the eye, not a direct measurement of surface wind.',
          es: 'El anillo de reflectividad más intensa marca convección profunda alrededor del ojo, no una medición directa del viento en superficie.'
        },
        kind: 'line',
        geometry: { type: 'LineString', coordinates: [[-90.5, 29.05], [-90.38, 29.34], [-90.08, 29.4], [-89.96, 29.17]] }
      },
      {
        title: { en: 'Outer rainband', es: 'Banda de lluvia exterior' },
        detail: {
          en: 'Outer bands can contain intense rain and embedded rotation far from the center; inspect official alerts separately.',
          es: 'Las bandas exteriores pueden contener lluvia intensa y rotación lejos del centro; consulta por separado las alertas oficiales.'
        },
        kind: 'line',
        geometry: { type: 'LineString', coordinates: [[-89.8, 29.8], [-89.45, 29.45], [-89.35, 29.0]] }
      }
    ]
  }
]);

function languageCode(language) {
  return SUPPORTED_LANGUAGES.has(language) ? language : 'en';
}

function localized(value, language) {
  const code = languageCode(language);
  return String(value?.[code] || value?.en || '').slice(0, 500);
}

function cloneGeometry(geometry) {
  return JSON.parse(JSON.stringify(geometry));
}

function localizeScenario(raw, language) {
  return {
    id: raw.id,
    title: localized(raw.title, language),
    summary: localized(raw.summary, language),
    start: raw.period[0],
    end: raw.period[1],
    center: [...raw.center],
    zoom: raw.zoom,
    annotations: raw.annotations.map((annotation, index) => ({
      index: index + 1,
      title: localized(annotation.title, language),
      detail: localized(annotation.detail, language),
      kind: annotation.kind,
      geometry: cloneGeometry(annotation.geometry)
    }))
  };
}

export function trainingScenarioCatalog(language = 'en') {
  return SCENARIOS.map(scenario => localizeScenario(scenario, language));
}

export function getTrainingScenario(id, language = 'en') {
  const scenario = SCENARIOS.find(candidate => candidate.id === id);
  return scenario ? localizeScenario(scenario, language) : null;
}

export function trainingFeatureCollection(scenario) {
  if (!scenario || !Array.isArray(scenario.annotations)) {
    return { type: 'FeatureCollection', features: [] };
  }
  return {
    type: 'FeatureCollection',
    features: scenario.annotations.slice(0, 8).map(annotation => ({
      type: 'Feature',
      properties: {
        trainingIndex: annotation.index,
        title: String(annotation.title || '').slice(0, 160),
        detail: String(annotation.detail || '').slice(0, 500),
        kind: ['point', 'line', 'area'].includes(annotation.kind) ? annotation.kind : 'point'
      },
      geometry: cloneGeometry(annotation.geometry)
    }))
  };
}
