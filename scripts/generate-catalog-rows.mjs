import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLANTAS_PATH = path.join(__dirname, '..', 'index.html');

/**
 * Catálogo tomado del índice de un libro de jardinería (plantas de interior,
 * herbáceas perennes, bulbosas, gramíneas, enredaderas y cubresuelos,
 * arbustos y árboles). Cada planta define su luz preferida en la escala que
 * corresponde a su categoría: Alta/Media/Baja para interior, o
 * Directa/Indirecta/Sombra para exterior. El campo "Sol" se deriva de la luz.
 * El campo "Clima" indica la franja térmica que la planta tolera mejor:
 * Frío / Templado / Cálido.
 */
const CATEGORIES = [
  {
    label: 'Plantas de interior',
    plants: [
      // Las 5 primeras preservan id/imagen/riego exactos de las filas ya cargadas en el catálogo.
      ['Azalea', 'Ericáceas', 'Indirecta', 'Franco', 'Fácil', 'Cada 7 días', 'Templado', { id: 'azalea::ericaceas::exterior', imagen: 'https://images.unsplash.com/photo-1653245690893-720376e521cb?auto=format&fit=crop&w=1400&q=80' }],
      ['Rafis', 'Arecáceas', 'Media', 'Franco', 'Medio', 'Cada 7 días', 'Templado', { id: 'rafis::arecaceas::interior', imagen: 'https://images.unsplash.com/photo-1648806098714-d20de45d4226?auto=format&fit=crop&w=1400&q=80' }],
      ['Palo de Agua', 'Asparagáceas', 'Media', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido', { id: 'palo de agua::asparagaceas::interior', imagen: 'https://images.unsplash.com/photo-1612363066736-a4a933de2cab?auto=format&fit=crop&w=1400&q=80' }],
      ['Kentia', 'Arecáceas', 'Media', 'Franco', 'Medio', 'Cada 7 días', 'Templado', { id: 'kentia::arecaceas::interior', imagen: 'https://images.unsplash.com/photo-1768692857070-e57811d9ccaa?auto=format&fit=crop&w=1400&q=80' }],
      ['Ficus Benjamina', 'Moráceas', 'Alta', 'Arenoso', 'Medio', 'Cada 10 días', 'Cálido', { id: 'ficus benjamina::moraceas::interior', imagen: 'https://images.unsplash.com/photo-1596547609713-821db6524310?auto=format&fit=crop&w=1400&q=80' }],
      ['Cordiline', "Cordyline fruticosa 'Rubra'", 'Media', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Begonia', 'Begonia x tuberhybrida', 'Media', 'Franco', 'Medio', 'Cada 7 días', 'Templado'],
      ['Bromelia', 'Aechmea fasciata', 'Media', 'Franco', 'Fácil', 'Cada 14 días', 'Cálido'],
      ['Orquídea', 'Phalaenopsis sp.', 'Media', 'Franco', 'Exigente', 'Cada 10 días', 'Cálido'],
      ['Violeta africana', 'Saintpaulia ionantha', 'Media', 'Franco', 'Exigente', 'Cada 7 días', 'Cálido'],
      ['Aglaonema', 'Aglaonema commutatum', 'Baja', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Aspidistra', 'Aspidistra elatior', 'Baja', 'Franco', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Culandrillo', 'Adiantum raddianum', 'Media', 'Franco', 'Exigente', 'Cada 5 días', 'Templado'],
      ['Chamaedorea', 'Chamaedorea elegans', 'Media', 'Franco', 'Fácil', 'Cada 7 días', 'Cálido'],
      ['Difenbaquia', "Dieffenbachia seguine 'Tropic Snow'", 'Media', 'Franco', 'Medio', 'Cada 7 días', 'Cálido'],
      ['Nido de ave', 'Asplenium nidus', 'Baja', 'Franco', 'Medio', 'Cada 7 días', 'Cálido'],
      ['Maranta', "Maranta leuconeura 'Kerchoveana'", 'Baja', 'Franco', 'Medio', 'Cada 5 días', 'Cálido'],
      ['Peperomia', 'Peperomia caperata', 'Media', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Sansevieria', "Sansevieria trifasciata 'Laurentii'", 'Baja', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Scheflera', 'Schefflera arboricola', 'Media', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Spatifilum', 'Spathiphyllum wallisii', 'Baja', 'Franco', 'Fácil', 'Cada 7 días', 'Cálido'],
      ['Cissus', 'Cissus alata', 'Media', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Filodendro', 'Philodendron hederaceum var. oxycardium', 'Baja', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Potus', 'Epipremnum sp. = Scindapsus aureus', 'Baja', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Singonium', 'Syngonium podophyllum', 'Media', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Helecho', 'Nephrolepis exaltata', 'Media', 'Franco', 'Medio', 'Cada 5 días', 'Templado'],
    ],
  },
  {
    label: 'Herbáceas perennes',
    plants: [
      ['Anémona', 'Anemone x hybrida', 'Indirecta', 'Franco', 'Medio', 'Cada 7 días', 'Templado'],
      ['Gaura', 'Gaura lindheimeri', 'Directa', 'Arenoso', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Margaritón', 'Leucanthemum x superbum', 'Directa', 'Franco', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Saponaria', 'Saponaria officinalis', 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Verbena', 'Verbena hybrida', 'Directa', 'Arenoso', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Agapanto', 'Agapanthus praecox', 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Lirio lousiana', 'Iris x louisiana', 'Directa', 'Arcilloso', 'Medio', 'Cada 7 días', 'Templado'],
      ['Salvia', 'Salvia leucantha', 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Cálido'],
      ['Tulbagia', 'Tulbaghia violacea', 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Verónica', 'Veronica spicata', 'Directa', 'Franco', 'Fácil', 'Cada 10 días', 'Frío'],
      ['Achilea', 'Achillea filipendulina', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Bulbine', 'Bulbine frutescens', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Coreopsis', 'Coreopsis grandiflora', 'Directa', 'Franco', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Hemerocalis', 'Hemerocallis sp.', 'Directa', 'Franco', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Tritoma', 'Kniphofia uvaria', 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Alstroemeria', 'Alstroemeria psittacina', 'Indirecta', 'Franco', 'Medio', 'Cada 10 días', 'Cálido'],
      ['Gallardia', 'Gaillardia aristata', 'Directa', 'Arenoso', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Monarda', 'Monarda didyma', 'Indirecta', 'Franco', 'Medio', 'Cada 7 días', 'Frío'],
      ['Salvia roja', "Salvia microphylla 'Neurepia'", 'Directa', 'Franco', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Fisostegia', 'Physostegia virginiana', 'Indirecta', 'Franco', 'Fácil', 'Cada 7 días', 'Templado'],
      ['Penstemon', "Penstemon 'Garnet'", 'Directa', 'Franco', 'Medio', 'Cada 10 días', 'Templado'],
      ['Poligono', 'Persicaria amplexicaulis', 'Indirecta', 'Arcilloso', 'Fácil', 'Cada 7 días', 'Frío'],
      ['Oenotera', 'Oenothera speciosa', 'Directa', 'Arenoso', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Echinacea', 'Echinacea purpurea', 'Directa', 'Franco', 'Fácil', 'Cada 10 días', 'Frío'],
      ['Sedum', 'Sedum spectabile', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Frío'],
      ['Valeriana', 'Centranthus ruber', 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Templado'],
    ],
  },
  {
    label: 'Bulbosas',
    plants: [
      ['Anémona', 'Anemone coronaria', 'Indirecta', 'Franco', 'Medio', 'Cada 10 días', 'Templado'],
      ['Fresia', 'Freesia refracta', 'Directa', 'Arenoso', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Narciso', 'Narcissus pseudonarcissus', 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Frío'],
      ['Tulipán', 'Tulipa sp.', 'Directa', 'Franco', 'Medio', 'Cada 10 días', 'Frío'],
      ['Achira', 'Canna sp.', 'Directa', 'Arcilloso', 'Fácil', 'Cada 7 días', 'Cálido'],
      ['Azucena', 'Lilium candidum', 'Directa', 'Franco', 'Medio', 'Cada 10 días', 'Templado'],
      ['Montbretia', 'Crocosmia x crocosmiiflora', 'Directa', 'Franco', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Gladiolo', 'Gladiolus sp.', 'Directa', 'Franco', 'Medio', 'Cada 10 días', 'Templado'],
      ['Dalia', 'Dahlia sp.', 'Directa', 'Franco', 'Medio', 'Cada 7 días', 'Templado'],
      ['Vara de San José', 'Watsonia borbonica', 'Directa', 'Franco', 'Medio', 'Cada 10 días', 'Templado'],
    ],
  },
  {
    label: 'Gramíneas',
    plants: [
      ['Bambú', 'Pseudosasa japonica', 'Indirecta', 'Franco', 'Fácil', 'Cada 7 días', 'Templado'],
      ['Cortadera', 'Cortaderia selloana', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Paspalum', 'Paspalum haumanii', 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Cálido'],
      ['Sacharum', "Saccharum officinarum 'Rubrum'", 'Directa', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Miscantus', "Miscanthus sinensis 'Gracillimus'", 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Panicum', 'Panicum virgatum', 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Frío'],
      ['Penisetum rupeli', 'Pennisetum setaceum', 'Directa', 'Arenoso', 'Fácil', 'Cada 14 días', 'Cálido'],
      ['Pasto palmera', 'Setaria poiretiana', 'Indirecta', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Vetiveria', 'Chrysopogon zizanioides', 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Cálido'],
      ['Chasmantium', 'Chasmanthium latifolium', 'Indirecta', 'Franco', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Stipa', 'Nassella tenuissima', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Festuca gris', 'Festuca glauca', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Frío'],
      ['Carex', "Carex comans 'Bronze'", 'Indirecta', 'Franco', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Falaris variegada', "Phalaris arundinacea 'Picta'", 'Indirecta', 'Arcilloso', 'Fácil', 'Cada 7 días', 'Frío'],
      ['Colita de zorro', 'Pennisetum villosum', 'Directa', 'Arenoso', 'Fácil', 'Cada 14 días', 'Cálido'],
      ['Bambú enano', 'Pogonatherum paniceum', 'Indirecta', 'Franco', 'Medio', 'Cada 7 días', 'Cálido'],
    ],
  },
  {
    label: 'Enredaderas y cubresuelos',
    plants: [
      ['Glicina', 'Wisteria sinensis', 'Directa', 'Franco', 'Medio', 'Cada 10 días', 'Frío'],
      ['Jazmín marillo', "Jasminum humile 'Revolutum'", 'Directa', 'Franco', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Jazmín azórico', 'Jasminum azoricum', 'Directa', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Jazmín chino', 'Jasminum polyanthum', 'Directa', 'Franco', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Jazmín de leche', 'Trachelospermum jasminoides', 'Indirecta', 'Franco', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Jazmín del país', 'Jasminum officinale', 'Directa', 'Franco', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Madreselva', "Lonicera periclymenum 'Belgica'", 'Indirecta', 'Franco', 'Fácil', 'Cada 10 días', 'Frío'],
      ['Rosa banksiana', "Rosa banksiae 'Lutea'", 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Ampelopsis', 'Parthenocissus tricuspidata', 'Indirecta', 'Franco', 'Fácil', 'Cada 14 días', 'Frío'],
      ['Bignonia azul', 'Thunbergia grandiflora', 'Directa', 'Franco', 'Medio', 'Cada 10 días', 'Cálido'],
      ['Bignonia blanca', 'Pandorea jasminoides', 'Directa', 'Franco', 'Medio', 'Cada 10 días', 'Cálido'],
      ['Bignonia rosada', 'Podranea ricasoliana', 'Directa', 'Franco', 'Medio', 'Cada 10 días', 'Cálido'],
      ['Hardenbergia', 'Hardenbergia violacea', 'Indirecta', 'Franco', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Jazmín del cielo', 'Plumbago auriculata', 'Directa', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Santa Rita', 'Bougainvillea glabra', 'Directa', 'Arenoso', 'Fácil', 'Cada 14 días', 'Cálido'],
      ['Trompeta de Virginia', 'Campsis radicans', 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Ajuga', 'Ajuga reptans', 'Indirecta', 'Franco', 'Fácil', 'Cada 7 días', 'Frío'],
      ['Erigeron', 'Erigeron karvinskianus', 'Directa', 'Arenoso', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Liriope', "Liriope muscari 'Variegata'", 'Indirecta', 'Franco', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Plectranthus', 'Plectranthus ciliatus', 'Indirecta', 'Franco', 'Fácil', 'Cada 7 días', 'Cálido'],
      ['Vinca', 'Vinca major', 'Indirecta', 'Franco', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Violeta', 'Viola odorata', 'Indirecta', 'Franco', 'Fácil', 'Cada 7 días', 'Frío'],
      ['Hiedra', 'Hedera helix', 'Sombra', 'Franco', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Lamium', 'Lamium galeobdolon subsp. Argentatum', 'Sombra', 'Franco', 'Fácil', 'Cada 7 días', 'Frío'],
      ['Menta variegada', "Mentha suaveolens 'Variegata'", 'Indirecta', 'Franco', 'Fácil', 'Cada 7 días', 'Templado'],
      ['Pasto inglés', 'Ophiopogon japonicus', 'Sombra', 'Franco', 'Fácil', 'Cada 10 días', 'Templado'],
    ],
  },
  {
    label: 'Arbustos',
    plants: [
      ['Berberis', "Berberis thunbergii 'Atropurpurea'", 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Frío'],
      ['Eugenia', "Syzygium paniculatum 'Variegatum'", 'Directa', 'Franco', 'Medio', 'Cada 10 días', 'Cálido'],
      ['Ligustrina variegada', "Ligustrum sinense 'Variegatum'", 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Nandina', 'Nandina domestica', 'Indirecta', 'Franco', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Pitosporum', "Pittosporum eugenioides 'Variegatum'", 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Westringia', 'Westringia fruticosa', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Abelia', 'Abelia x grandiflora', 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Budleja', 'Buddleja davidii', 'Directa', 'Franco', 'Fácil', 'Cada 10 días', 'Frío'],
      ['Corona de novia', 'Spiraea cantoniensis', 'Directa', 'Franco', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Duranta', 'Duranta erecta', 'Directa', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Abutilon', 'Abutilon x hybridum', 'Indirecta', 'Franco', 'Medio', 'Cada 7 días', 'Templado'],
      ['Hortensia', 'Hydrangea macrophylla', 'Indirecta', 'Arcilloso', 'Medio', 'Cada 5 días', 'Templado'],
    ],
  },
  {
    label: 'Árboles',
    plants: [
      ['Roble de los pantanos', 'Quercus palustris', 'Directa', 'Arcilloso', 'Fácil', 'Cada 21 días', 'Frío'],
      ['Fresno americano', 'Fraxinus americana', 'Directa', 'Franco', 'Fácil', 'Cada 21 días', 'Frío'],
      ['Ciprés calvo', 'Taxodium distichum', 'Directa', 'Arcilloso', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Liquidámbar', 'Liquidambar styraciflua', 'Directa', 'Franco', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Ginkgo', 'Ginkgo biloba', 'Directa', 'Franco', 'Fácil', 'Cada 21 días', 'Frío'],
      ['Magnolia', 'Magnolia grandiflora', 'Directa', 'Franco', 'Medio', 'Cada 14 días', 'Templado'],
      ['Roble sedoso', 'Grevillea robusta', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Aguaribay', 'Schinus molle', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Braquiquito', 'Brachychiton populneus', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Falso alcanfor', 'Cinnamomum glanduliferum', 'Directa', 'Franco', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Ceibo', 'Erythrina cristi-galli', 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Cálido'],
      ['Catalpa', 'Catalpa bignonioides', 'Directa', 'Franco', 'Fácil', 'Cada 21 días', 'Frío'],
      ['Tilo', 'Tilia x viridis ssp moltkei', 'Directa', 'Franco', 'Fácil', 'Cada 21 días', 'Frío'],
      ['Lapacho', 'Handroanthus impetiginosus', 'Directa', 'Franco', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Jacarandá', 'Jacaranda mimosifolia', 'Directa', 'Franco', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Aromo', 'Acacia dealbata', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Acacia de Constantinopla', 'Albizia julibrissin', 'Directa', 'Franco', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Caqui', 'Diospyros kaki', 'Directa', 'Franco', 'Medio', 'Cada 14 días', 'Templado'],
      ['Crespón', 'Lagerstroemia indica', 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Arce japonés', 'Acer palmatum', 'Indirecta', 'Franco', 'Medio', 'Cada 10 días', 'Frío'],
      ['Acacia bola', "Robinia pseudoacacia 'Umbraculifera'", 'Directa', 'Franco', 'Fácil', 'Cada 21 días', 'Frío'],
      ['Rhus', 'Rhus typhina', 'Directa', 'Franco', 'Fácil', 'Cada 21 días', 'Frío'],
      ['Álamo piramidal', "Populus nigra 'Itálica'", 'Directa', 'Arcilloso', 'Fácil', 'Cada 14 días', 'Frío'],
      ['Leylandi', 'x Cupressocyparis leylandii', 'Directa', 'Franco', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Sauce llorón', 'Salix babylonica', 'Directa', 'Arcilloso', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Plátano', 'Platanus acerifolia', 'Directa', 'Franco', 'Fácil', 'Cada 21 días', 'Templado'],
    ],
  },
];

const RIEGOS = ['Cada 5 días', 'Cada 7 días', 'Cada 10 días', 'Cada 14 días', 'Cada 21 días', 'Cada 30 días'];

/** Placeholder confiable (siempre carga), distinto por planta según su slug */
function imagenParaSlug(slug) {
  return `https://picsum.photos/seed/${slug}/1400/1400`;
}

function riegosEstacionales(riegoBase) {
  const idx = RIEGOS.indexOf(riegoBase);
  const clamp = (i) => RIEGOS[Math.max(0, Math.min(RIEGOS.length - 1, i))];
  return {
    verano: clamp(idx - 1),
    primavera: riegoBase,
    otoño: riegoBase,
    invierno: clamp(idx + 1),
  };
}

function solParaLuz(luz) {
  if (luz === 'Alta' || luz === 'Directa') return 'Sol';
  if (luz === 'Baja' || luz === 'Sombra') return 'Sombra';
  return 'Media sombra';
}

function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function buildRow([name, species, luz, suelo, cuidado, riegoBase, clima, overrides], categoria) {
  const riegos = riegosEstacionales(riegoBase);
  const sol = solParaLuz(luz);
  const slug = slugify(`${name}-${species}`);
  const imagen = overrides?.imagen ?? imagenParaSlug(slug);
  const id = overrides?.id ?? `${name}::${species}::${slug}`.toLowerCase();

  return {
    name,
    species,
    luz,
    suelo,
    cuidado,
    riego: riegoBase,
    riegos,
    clima,
    sol,
    categoria,
    imagen,
    id,
  };
}

function rowHtml(row) {
  const riegosAttr = escapeAttr(JSON.stringify(row.riegos));
  const addAttrs = `data-id="${escapeAttr(row.id)}" data-nombre="${escapeAttr(row.name)}" data-especie="${escapeAttr(row.species)}" data-riego="${escapeAttr(row.riego)}" data-riegos="${riegosAttr}" data-clima="${escapeAttr(row.clima)}" data-luz="${escapeAttr(row.luz)}" data-ubicacion="${escapeAttr(row.sol)}" data-suelo="${escapeAttr(row.suelo)}" data-cuidado="${escapeAttr(row.cuidado)}" data-imagen="${escapeAttr(row.imagen)}" data-galeria="${escapeAttr(JSON.stringify([row.imagen]))}"`;

  return `<div class="catalog-entry" data-riego="${escapeAttr(row.riego)}" data-riegos="${riegosAttr}" data-clima="${escapeAttr(row.clima)}" data-luz="${escapeAttr(row.luz)}" data-ubicacion="${escapeAttr(row.sol)}" data-suelo="${escapeAttr(row.suelo)}" data-cuidado="${escapeAttr(row.cuidado)}">
  <figure class="catalog-tile">
    <div class="catalog-tile-head">
      <figcaption class="catalog-tile-name">${escapeAttr(row.name)}</figcaption>
      <button type="button" class="catalog-add catalog-add--tile" ${addAttrs} title="Agregar a Colección" aria-label="Agregar a Colección">(+)</button>
    </div>
    <div class="catalog-tile-media">
      <img src="${escapeAttr(row.imagen)}" alt="${escapeAttr(row.name)}" loading="lazy" width="300" height="300" />
    </div>
  </figure>
  <article class="catalog-spotlight">
    <div class="catalog-spotlight-side">
      <div class="catalog-spotlight-top">
        <span class="catalog-spotlight-name">${escapeAttr(row.name)}</span>
        <button type="button" class="catalog-add catalog-add--spotlight" ${addAttrs} title="Agregar a Colección" aria-label="Agregar a Colección">(+)</button>
      </div>
      <p class="catalog-spotlight-bottom">${escapeAttr(row.species)} · ${escapeAttr(row.sol)}</p>
    </div>
    <figure class="catalog-spotlight-media">
      <img src="${escapeAttr(row.imagen)}" alt="${escapeAttr(row.name)}" loading="lazy" width="480" height="640" />
    </figure>
  </article>
  <div class="catalog-row" role="button" tabindex="0" aria-expanded="false">
    <span>${row.name}</span>
    <span>${row.species}</span>
    <span>${row.sol}</span>
    <span>${row.luz}</span>
    <span class="catalog-riego">${row.riego}</span>
    <span>${row.clima}</span>
    <span>${row.suelo}</span>
    <span>${row.cuidado}</span>
    <span class="catalog-cell--action"><button type="button" class="catalog-add" ${addAttrs} title="Agregar a Colección" aria-label="Agregar a Colección">(Agregar)</button></span>
  </div>
  <div class="catalog-accordion" hidden>
    <dl class="catalog-detail">
      <div class="catalog-detail-row"><dt>Especie</dt><dd>${escapeAttr(row.species)}</dd></div>
      <div class="catalog-detail-row"><dt>Sol</dt><dd>${escapeAttr(row.sol)}</dd></div>
      <div class="catalog-detail-row"><dt>Luminosidad</dt><dd>${escapeAttr(row.luz)}</dd></div>
      <div class="catalog-detail-row"><dt>Riego</dt><dd class="catalog-riego">${escapeAttr(row.riego)}</dd></div>
      <div class="catalog-detail-row"><dt>Clima</dt><dd>${escapeAttr(row.clima)}</dd></div>
      <div class="catalog-detail-row"><dt>Suelo</dt><dd>${escapeAttr(row.suelo)}</dd></div>
      <div class="catalog-detail-row"><dt>Cuidado</dt><dd>${escapeAttr(row.cuidado)}</dd></div>
    </dl>
    <div class="catalog-gallery">
    <figure class="catalog-gallery-item">
      <img src="${escapeAttr(row.imagen)}" alt="${escapeAttr(row.name)} 1/1" loading="lazy" width="200" height="150" />
      <figcaption>1/1</figcaption>
    </figure>
    </div>
  </div>
</div>`;
}

/**
 * Cada categoría abre con su nombre, la línea, y su propia fila de títulos de
 * columna. El toggle de estación se repite con ella, por eso usa clases y no
 * `id`: con siete categorías, un `id` quedaría duplicado siete veces.
 */
function headerHtml() {
  return `<div class="catalog-row is-header" role="row">
  <span>Nombre</span>
  <span>Especie</span>
  <span>Sol</span>
  <span>Luminosidad</span>
  <button type="button" class="catalog-riego-toggle" data-estacion="verano" aria-label="Riego en verano. Clic para cambiar estación">
    Riego <span class="riego-estacion-label">(verano)</span>
  </button>
  <span>Clima</span>
  <span>Suelo</span>
  <span>Cuidado</span>
  <span class="catalog-cell--action">Colección</span>
</div>`;
}

function categoryHtml(label, cantidad) {
  return `<div class="catalog-category" role="row"><span class="catalog-category-label">${escapeAttr(label)}</span><span class="catalog-category-count">(${cantidad})</span></div>`;
}

const START_MARKER = '<!-- catalog-rows:start -->';
const END_MARKER = '<!-- catalog-rows:end -->';
const CATEGORIAS_PATH = path.join(__dirname, '..', 'js/utils/catalog-categorias-data.js');

const collator = new Intl.Collator('es', { sensitivity: 'base' });

function main() {
  const blocks = [];

  // Cada categoría se envuelve en su propio elemento para que el atenuado por
  // hover quede acotado a ella: `.catalog-group:hover` no puede alcanzar a las
  // plantas de las otras categorías. Con el DOM plano no había forma de
  // expresarlo en CSS, porque no existe un selector de "hermanos hasta el
  // próximo encabezado".
  for (const { label, plants } of CATEGORIES) {
    const sorted = [...plants].sort((a, b) => collator.compare(a[0], b[0]));
    blocks.push({ categoryHeader: label, rows: sorted.map((p) => buildRow(p, label)) });
  }

  // El título de la categoría queda FUERA de `.catalog-group-table`: el atenuado
  // por hover se dispara con la tabla, no con el título, que es enorme y ocupa
  // media pantalla.
  const html = blocks
    .map(
      (b) => `<section class="catalog-group">
${categoryHtml(b.categoryHeader, b.rows.length)}
<div class="catalog-group-table">
${headerHtml()}
${b.rows.map(rowHtml).join('\n')}
</div>
</section>`
    )
    .join('\n');

  const plantas = fs.readFileSync(PLANTAS_PATH, 'utf8');
  const startIdx = plantas.indexOf(START_MARKER);
  const endIdx = plantas.indexOf(END_MARKER);

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    console.error('No se encontraron marcadores catalog-rows en index.html');
    process.exit(1);
  }

  const before = plantas.slice(0, startIdx + START_MARKER.length);
  const after = plantas.slice(endIdx);
  const replaced = `${before}\n${html}\n${after}`;

  fs.writeFileSync(PLANTAS_PATH, replaced, 'utf8');

  const totalRows = blocks.reduce((n, b) => n + b.rows.length, 0);
  console.log(`Generadas ${totalRows} filas en ${CATEGORIES.length} categorías, ordenadas alfabéticamente.`);
  writeCategoriasModule();
}

function writeCategoriasModule() {
  const map = {};
  for (const { label, plants } of CATEGORIES) {
    for (const plant of plants) {
      const row = buildRow(plant, label);
      map[`${row.name}::${row.species}`] = label;
      map[row.id] = label;
    }
  }
  const body = `export const CATEGORIA_POR_CLAVE = ${JSON.stringify(map, null, 2)};\n`;
  fs.writeFileSync(CATEGORIAS_PATH, body, 'utf8');
  console.log(`Índice de categorías escrito en ${path.relative(path.join(__dirname, '..'), CATEGORIAS_PATH)}.`);
}

if (process.argv.includes('--categorias-only')) {
  writeCategoriasModule();
} else {
  main();
}
