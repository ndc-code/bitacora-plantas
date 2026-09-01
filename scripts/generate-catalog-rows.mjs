import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLANTAS_PATH = path.join(__dirname, '..', 'index.html');

/**
 * Catálogo tomado del índice de un libro de jardinería (plantas de interior,
 * suculentas, cactus, herbáceas perennes, bulbosas, gramíneas, enredaderas y
 * cubresuelos, arbustos y árboles). Cada planta define su luz preferida en la escala que
 * corresponde a su categoría: Alta/Media/Baja para interior, o
 * Directa/Indirecta/Sombra para exterior. El campo "Sol" se deriva de la luz.
 * El campo "Clima" indica la franja térmica que la planta tolera mejor:
 * Frío / Templado / Cálido.
 */
export const CATEGORIES = [
  {
    // "Índice de especies" del libro de plantas de interior. El libro numera las
    // especies (se conservan sólo las listadas); nombre = género, especie = la
    // entrada exacta del índice (binomio, cultivar o "<género> sp.").
    label: 'Plantas de interior',
    plants: [
      ['Aeschynanthus', 'Aeschynanthus sp.', 'Media', 'Franco', 'Medio', 'Cada 7 días', 'Cálido'],
      ['Aglaonema', 'Aglaonema commutatum', 'Baja', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Alocasia', "Alocasia 'Amazónica'", 'Media', 'Franco', 'Exigente', 'Cada 5 días', 'Cálido'],
      ['Anthurium', 'Anthurium andraeanum', 'Media', 'Franco', 'Medio', 'Cada 7 días', 'Cálido'],
      ['Aphelandra', 'Aphelandra squarrosa', 'Media', 'Franco', 'Exigente', 'Cada 5 días', 'Cálido'],
      ['Asplenium', 'Asplenium nidus', 'Baja', 'Franco', 'Medio', 'Cada 7 días', 'Cálido'],
      ['Begonia', 'Begonia sp.', 'Media', 'Franco', 'Medio', 'Cada 7 días', 'Templado'],
      ['Bromelias', 'Bromeliaceae', 'Media', 'Franco', 'Fácil', 'Cada 14 días', 'Cálido'],
      ['Caladium', 'Caladium bicolor', 'Media', 'Franco', 'Exigente', 'Cada 7 días', 'Cálido'],
      ['Calathea', 'Calathea makoyana', 'Baja', 'Franco', 'Exigente', 'Cada 5 días', 'Cálido'],
      ['Chamaedorea', 'Chamaedorea elegans', 'Media', 'Franco', 'Fácil', 'Cada 7 días', 'Cálido'],
      ['Cissus', 'Cissus alata', 'Media', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Clerodendrum', 'Clerodendrum thomsoniae', 'Alta', 'Franco', 'Medio', 'Cada 7 días', 'Cálido'],
      ['Codiaeum', 'Codiaeum variegatum', 'Alta', 'Franco', 'Medio', 'Cada 7 días', 'Cálido'],
      ['Columnea', 'Columnea microphylla', 'Media', 'Franco', 'Medio', 'Cada 7 días', 'Cálido'],
      ['Cordyline', 'Cordyline fruticosa', 'Media', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Ctenanthe', 'Ctenanthe sp.', 'Baja', 'Franco', 'Exigente', 'Cada 5 días', 'Cálido'],
      ['Dieffenbachia', 'Dieffenbachia seguine', 'Media', 'Franco', 'Medio', 'Cada 7 días', 'Cálido'],
      ['Dracaena', 'Dracaena fragrans', 'Media', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido', { id: 'palo de agua::asparagaceas::interior' }],
      ['Epipremnum', 'Epipremnum aureum', 'Baja', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Episcia', 'Episcia cupreata', 'Media', 'Franco', 'Medio', 'Cada 7 días', 'Cálido'],
      ['Farfugium', 'Farfugium japonicum', 'Media', 'Franco', 'Medio', 'Cada 7 días', 'Templado'],
      ['Ficus elástica', 'Ficus elastica', 'Alta', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Ficus pandurata', 'Ficus lyrata', 'Alta', 'Franco', 'Medio', 'Cada 10 días', 'Cálido'],
      ['Fittonia', 'Fittonia albivenis', 'Baja', 'Franco', 'Exigente', 'Cada 5 días', 'Cálido'],
      ['Gynura', 'Gynura aurantiaca', 'Alta', 'Franco', 'Fácil', 'Cada 7 días', 'Cálido'],
      ['Hemigraphis', 'Hemigraphis colorata', 'Media', 'Franco', 'Fácil', 'Cada 7 días', 'Cálido'],
      ['Helechos', 'Nephrolepis exaltata', 'Media', 'Franco', 'Medio', 'Cada 5 días', 'Templado'],
      ['Kentia', 'Howea forsteriana', 'Media', 'Franco', 'Medio', 'Cada 7 días', 'Templado', { id: 'kentia::arecaceas::interior' }],
      ['Maranta', 'Maranta leuconeura', 'Baja', 'Franco', 'Medio', 'Cada 5 días', 'Cálido'],
      ['Monstera adansonii', 'Monstera adansonii', 'Media', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Monstera deliciosa', 'Monstera deliciosa', 'Media', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Oxalis', 'Oxalis triangularis', 'Media', 'Franco', 'Fácil', 'Cada 7 días', 'Templado'],
      ['Pilea', 'Pilea peperomioides', 'Media', 'Franco', 'Fácil', 'Cada 7 días', 'Templado'],
      ['Peperomia', 'Peperomia sp.', 'Media', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Philodendron', 'Philodendron sp.', 'Baja', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Rafis', 'Rhapis excelsa', 'Media', 'Franco', 'Medio', 'Cada 7 días', 'Templado', { id: 'rafis::arecaceas::interior' }],
      ['Rohdea', 'Rohdea japonica', 'Baja', 'Franco', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Saintpaulia', 'Saintpaulia ionantha', 'Media', 'Franco', 'Exigente', 'Cada 7 días', 'Cálido'],
      ['Schefflera', 'Schefflera arboricola', 'Media', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Sansevieria', 'Sansevieria trifasciata', 'Baja', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Sinningia', 'Sinningia speciosa', 'Media', 'Franco', 'Exigente', 'Cada 7 días', 'Cálido'],
      ['Spathiphyllum', 'Spathiphyllum wallisii', 'Baja', 'Franco', 'Fácil', 'Cada 7 días', 'Cálido'],
      ['Stromanthe', 'Stromanthe thalia', 'Media', 'Franco', 'Exigente', 'Cada 5 días', 'Cálido'],
      ['Syngonium', 'Syngonium podophyllum', 'Media', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Tradescantia', 'Tradescantia spathacea', 'Alta', 'Franco', 'Fácil', 'Cada 7 días', 'Cálido'],
      ['Zamioculcas', 'Zamioculcas zamiifolia', 'Baja', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
    ],
  },
  {
    // "Suculentas no cactáceas" + "Familia aizoáceas" del índice del libro.
    // El libro lista géneros; la especie queda como "<Género> sp." salvo los
    // pocos casos en que el índice ya trae binomio.
    label: 'Suculentas',
    plants: [
      ['Adenium', 'Adenium sp.', 'Directa', 'Arenoso', 'Medio', 'Cada 14 días', 'Cálido'],
      ['Adromischus', 'Adromischus sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Aeonium', 'Aeonium sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Aichryson', 'Aichryson sp.', 'Indirecta', 'Franco', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Agave', 'Agave sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Aloe', 'Aloe sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Anacampseros', 'Anacampseros sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Avonia', 'Avonia sp.', 'Directa', 'Arenoso', 'Medio', 'Cada 21 días', 'Cálido'],
      ['Bowiea', 'Bowiea sp.', 'Indirecta', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Caralluma', 'Caralluma sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Ceropegia', 'Ceropegia sp.', 'Indirecta', 'Arenoso', 'Fácil', 'Cada 14 días', 'Cálido'],
      ['Cissus', 'Cissus sp.', 'Indirecta', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Cotyledon', 'Cotyledon sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Crassula', 'Crassula sp.', 'Indirecta', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Cremnosedum', 'Cremnosedum sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Cyphostemma', 'Cyphostemma sp.', 'Directa', 'Arenoso', 'Medio', 'Cada 21 días', 'Cálido'],
      ['Deuterocohnia', 'Deuterocohnia sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Dioscorea', 'Dioscorea sp.', 'Indirecta', 'Franco', 'Medio', 'Cada 14 días', 'Cálido'],
      ['Dyckia', 'Dyckia sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Templado'],
      ['Fockea', 'Fockea sp.', 'Directa', 'Arenoso', 'Medio', 'Cada 21 días', 'Cálido'],
      ['Echeveria', 'Echeveria sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Euphorbia', 'Euphorbia sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Gasteria', 'Gasteria sp.', 'Indirecta', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Graptopetalum', 'Graptopetalum sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Haemanthus', 'Haemanthus sp.', 'Indirecta', 'Franco', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Hesperaloe', 'Hesperaloe sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Templado'],
      ['Haworthia', 'Haworthia sp.', 'Indirecta', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Hoodia', 'Hoodia sp.', 'Directa', 'Arenoso', 'Medio', 'Cada 21 días', 'Cálido'],
      ['Hoya', 'Hoya sp.', 'Indirecta', 'Franco', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Huernia', 'Huernia sp.', 'Indirecta', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Jatropha', 'Jatropha sp.', 'Directa', 'Arenoso', 'Medio', 'Cada 14 días', 'Cálido'],
      ['Kalanchoe', 'Kalanchoe sp.', 'Indirecta', 'Arenoso', 'Fácil', 'Cada 14 días', 'Cálido'],
      ['Ledebouria', 'Ledebouria sp.', 'Indirecta', 'Franco', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Lenophyllum', 'Lenophyllum sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Manfreda', 'Manfreda sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Monadenium', 'Monadenium sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Monanthes', 'Monanthes sp.', 'Indirecta', 'Franco', 'Medio', 'Cada 10 días', 'Templado'],
      ['Nolina', 'Nolina sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Templado'],
      ['Othonna', 'Othonna sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Oxalis', 'Oxalis sp.', 'Indirecta', 'Franco', 'Fácil', 'Cada 7 días', 'Templado'],
      ['Pachyphytum', 'Pachyphytum sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Pachypodium', 'Pachypodium sp.', 'Directa', 'Arenoso', 'Medio', 'Cada 14 días', 'Cálido'],
      ['Pelargonium', 'Pelargonium sp.', 'Directa', 'Franco', 'Fácil', 'Cada 10 días', 'Templado'],
      ['Plumeria', 'Plumeria sp.', 'Directa', 'Franco', 'Medio', 'Cada 14 días', 'Cálido'],
      ['Portulaca', 'Portulaca sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 10 días', 'Cálido'],
      ['Portulacaria', 'Portulacaria sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Sansevieria', 'Sansevieria sp.', 'Sombra', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Sempervivum', 'Sempervivum sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Frío'],
      ['Sedum', 'Sedum sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Senecio', 'Senecio sp.', 'Indirecta', 'Arenoso', 'Fácil', 'Cada 14 días', 'Cálido'],
      ['Sinningia', 'Sinningia sp.', 'Indirecta', 'Franco', 'Medio', 'Cada 7 días', 'Cálido'],
      ['Stapelia', 'Stapelia sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Synadenium', 'Synadenium sp.', 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Cálido'],
      ['Talinum', 'Talinum sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 14 días', 'Cálido'],
      ['Tillandsia', 'Tillandsia sp.', 'Indirecta', 'Arenoso', 'Medio', 'Cada 7 días', 'Cálido'],
      ['Villadia', 'Villadia sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Xerosicyos', 'Xerosicyos sp.', 'Indirecta', 'Arenoso', 'Fácil', 'Cada 14 días', 'Cálido'],
      ['Aptenia', 'Aptenia sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Lampranthus', 'Lampranthus sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Delosperma', 'Delosperma sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 14 días', 'Frío'],
      ['Oscularia', 'Oscularia sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Faucaria', 'Faucaria sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Glottiphyllum', 'Glottiphyllum sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Titanopsis', 'Titanopsis sp.', 'Directa', 'Arenoso', 'Exigente', 'Cada 30 días', 'Cálido'],
      ['Trichodiadema', 'Trichodiadema sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Conophytum', 'Conophytum sp.', 'Directa', 'Arenoso', 'Exigente', 'Cada 30 días', 'Cálido'],
      ['Fenestraria', 'Fenestraria sp.', 'Directa', 'Arenoso', 'Exigente', 'Cada 30 días', 'Cálido'],
      ['Frithia', 'Frithia sp.', 'Directa', 'Arenoso', 'Exigente', 'Cada 30 días', 'Cálido'],
      ['Lithops', 'Lithops sp.', 'Directa', 'Arenoso', 'Exigente', 'Cada 30 días', 'Cálido'],
      ['Pleiospilos', 'Pleiospilos sp.', 'Directa', 'Arenoso', 'Exigente', 'Cada 30 días', 'Cálido'],
    ],
  },
  {
    // "Suculentas cactáceas" del índice del libro. Género + "sp." salvo los
    // binomios que el índice ya trae. Por defecto: sol directo, sustrato
    // arenoso, riego muy espaciado, clima cálido.
    label: 'Cactus',
    plants: [
      ['Acanthocalycium', 'Acanthocalycium sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Aporocactus', 'Aporocactus sp.', 'Indirecta', 'Franco', 'Fácil', 'Cada 14 días', 'Templado'],
      ['Ariocarpus', 'Ariocarpus sp.', 'Directa', 'Arenoso', 'Exigente', 'Cada 30 días', 'Cálido'],
      ['Astrophytum', 'Astrophytum sp.', 'Directa', 'Arenoso', 'Medio', 'Cada 30 días', 'Cálido'],
      ['Austrocactus', 'Austrocactus sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Frío'],
      ['Aztekium', 'Aztekium sp.', 'Directa', 'Arenoso', 'Exigente', 'Cada 30 días', 'Cálido'],
      ['Blossfeldia', 'Blossfeldia liliputana', 'Directa', 'Arenoso', 'Exigente', 'Cada 30 días', 'Cálido'],
      ['Carnegiea', 'Carnegiea sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Cereus', 'Cereus sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Cleistocactus', 'Cleistocactus sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Cochemiea', 'Cochemiea sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Copiapoa', 'Copiapoa sp.', 'Directa', 'Arenoso', 'Medio', 'Cada 30 días', 'Cálido'],
      ['Coryphantha', 'Coryphantha sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Cumarinia', 'Cumarinia sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Denmoza', 'Denmoza sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Discocactus', 'Discocactus sp.', 'Directa', 'Arenoso', 'Medio', 'Cada 21 días', 'Cálido'],
      ['Echinocactus', 'Echinocactus sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Echinocereus', 'Echinocereus sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Echinofossulocactus', 'Echinofossulocactus sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Echinopsis', 'Echinopsis sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Epithelantha', 'Epithelantha sp.', 'Directa', 'Arenoso', 'Medio', 'Cada 30 días', 'Cálido'],
      ['Eriosyce', 'Eriosyce sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Escobaria', 'Escobaria sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Templado'],
      ['Espostoa', 'Espostoa sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Ferocactus', 'Ferocactus sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Frailea', 'Frailea sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Gymnocalycium', 'Gymnocalycium sp.', 'Indirecta', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Haageocereus', 'Haageocereus sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Harrisia', 'Harrisia sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Leuchtenbergia', 'Leuchtenbergia sp.', 'Directa', 'Arenoso', 'Medio', 'Cada 30 días', 'Cálido'],
      ['Lophophora', 'Lophophora sp.', 'Directa', 'Arenoso', 'Exigente', 'Cada 30 días', 'Cálido'],
      ['Lobivia', 'Lobivia sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Maihueniopsis', 'Maihueniopsis sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Frío'],
      ['Matucana', 'Matucana sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Mammillaria', 'Mammillaria sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Cálido'],
      ['Melocactus', 'Melocactus sp.', 'Directa', 'Arenoso', 'Medio', 'Cada 21 días', 'Cálido'],
      ['Monvillea', 'Monvillea sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Myrtillocactus', 'Myrtillocactus geometrizans', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Obregonia', 'Obregonia sp.', 'Directa', 'Arenoso', 'Exigente', 'Cada 30 días', 'Cálido'],
      ['Notocactus', 'Notocactus sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Opuntia', 'Opuntia sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Oreocereus', 'Oreocereus sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Parodia', 'Parodia sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Peniocereus', 'Peniocereus sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Pereskia', 'Pereskia sp.', 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Cálido'],
      ['Pyrrhocactus', 'Pyrrhocactus sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Quiabentia', 'Quiabentia sp.', 'Directa', 'Franco', 'Fácil', 'Cada 14 días', 'Cálido'],
      ['Rebutia', 'Rebutia sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Sclerocactus', 'Sclerocactus sp.', 'Directa', 'Arenoso', 'Exigente', 'Cada 30 días', 'Frío'],
      ['Stenocereus', 'Stenocereus sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Stetsonia', 'Stetsonia coryne', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Strombocactus', 'Strombocactus sp.', 'Directa', 'Arenoso', 'Exigente', 'Cada 30 días', 'Cálido'],
      ['Thelocactus', 'Thelocactus sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Tephrocactus', 'Tephrocactus sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 21 días', 'Templado'],
      ['Trichocereus', 'Trichocereus sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
      ['Turbinicarpus', 'Turbinicarpus sp.', 'Directa', 'Arenoso', 'Medio', 'Cada 30 días', 'Cálido'],
      ['Uebelmannia', 'Uebelmannia sp.', 'Directa', 'Arenoso', 'Medio', 'Cada 21 días', 'Cálido'],
      ['Weingartia', 'Weingartia sp.', 'Directa', 'Arenoso', 'Fácil', 'Cada 30 días', 'Cálido'],
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

/**
 * Géneros de Suculentas con especies ornamentales bien diferenciadas. Cuando un
 * `row.name` figura acá, la galería de la ficha (la que se abre en la vista 1)
 * muestra una foto por especie con su nombre de pie, en vez de una sola con
 * "1/1". Cada entrada es `[texto del pie, término para buscar/descargar la foto]`;
 * si es un string, sirve para las dos cosas. La clave es el `name` de la fila.
 */
export const VARIEDADES = {
  Haworthia: [
    ['Haworthia fasciata', 'Haworthiopsis fasciata'],
    ['Haworthia attenuata', 'Haworthiopsis attenuata'],
    ['Haworthia cooperi', 'Haworthia cooperi'],
    ['Haworthia cymbiformis', 'Haworthia cymbiformis'],
    ['Haworthia limifolia', 'Haworthiopsis limifolia'],
    ['Haworthia retusa', 'Haworthia retusa'],
    ['Haworthia truncata', 'Haworthia truncata'],
    ['Haworthia margaritifera', 'Haworthiopsis pumila'],
  ],
  Echeveria: [
    'Echeveria elegans',
    'Echeveria agavoides',
    'Echeveria pulvinata',
    'Echeveria setosa',
    'Echeveria derenbergii',
    'Echeveria lilacina',
  ],
  Aloe: [
    'Aloe vera',
    'Aloe arborescens',
    ['Aloe aristata', 'Aristaloe aristata'],
    ['Aloe variegata', 'Gonialoe variegata'],
    'Aloe ferox',
    'Aloe polyphylla',
  ],
  Gasteria: ['Gasteria bicolor', 'Gasteria batesiana', 'Gasteria glomerata', 'Gasteria carinata'],
  Sedum: [
    'Sedum morganianum',
    'Sedum rubrotinctum',
    'Sedum dasyphyllum',
    'Sedum nussbaumerianum',
    'Sedum adolphii',
  ],
  Kalanchoe: [
    'Kalanchoe blossfeldiana',
    'Kalanchoe tomentosa',
    'Kalanchoe daigremontiana',
    'Kalanchoe thyrsiflora',
    'Kalanchoe beharensis',
  ],
  Sempervivum: [
    'Sempervivum tectorum',
    'Sempervivum arachnoideum',
    'Sempervivum calcareum',
    'Sempervivum montanum',
  ],
  Crassula: [
    'Crassula ovata',
    'Crassula perforata',
    'Crassula muscosa',
    'Crassula capitella',
    'Crassula arborescens',
  ],
  Agave: [
    'Agave americana',
    'Agave attenuata',
    'Agave victoriae-reginae',
    'Agave parryi',
    'Agave filifera',
  ],
  Aeonium: ['Aeonium arboreum', 'Aeonium haworthii', 'Aeonium tabuliforme', 'Aeonium canariense'],
  Graptopetalum: [
    'Graptopetalum paraguayense',
    'Graptopetalum amethystinum',
    'Graptopetalum bellum',
  ],
  Cotyledon: ['Cotyledon orbiculata', 'Cotyledon tomentosa'],
  Senecio: [
    'Senecio rowleyanus',
    'Senecio radicans',
    'Senecio haworthii',
    ['Senecio serpens', 'Curio repens'],
  ],
  Euphorbia: [
    'Euphorbia tirucalli',
    'Euphorbia milii',
    'Euphorbia trigona',
    'Euphorbia obesa',
    'Euphorbia ingens',
  ],
  Lithops: [
    'Lithops lesliei',
    'Lithops aucampiae',
    'Lithops karasmontana',
    'Lithops optica',
    'Lithops salicola',
  ],
  Sansevieria: [
    'Sansevieria trifasciata',
    ['Sansevieria cylindrica', 'Dracaena angolensis'],
    ['Sansevieria masoniana', 'Dracaena masoniana'],
    'Sansevieria zeylanica',
  ],
  Pachyphytum: ['Pachyphytum oviferum', 'Pachyphytum compactum', 'Pachyphytum hookeri'],
  Adromischus: ['Adromischus cristatus', 'Adromischus maculatus', 'Adromischus marianiae'],
  Portulacaria: ['Portulacaria afra'],
};

const RIEGOS = ['Cada 5 días', 'Cada 7 días', 'Cada 10 días', 'Cada 14 días', 'Cada 21 días', 'Cada 30 días'];

/**
 * Foto local de la planta, descargada y recortada a cuadrado por
 * `scripts/fetch-plant-images.mjs`. La ruta es relativa a la raíz del sitio,
 * donde viven index.html / planta.html / coleccion.html.
 */
function imagenParaSlug(slug) {
  return `assets/img/plantas/${slug}.jpg`;
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

  // Galería de la ficha: una foto por variedad con su nombre, o una sola
  // (pie = la especie) cuando el género no tiene lista de variedades. Cuando
  // sí tiene, cada variedad lleva su propio id para agregarse suelta a la
  // Colección (p. ej. "Haworthia fasciata" y no el género entero).
  const defs = VARIEDADES[name];
  const tieneVariedades = Boolean(defs);
  const variedades = defs
    ? defs
        .map((v) => {
          const [caption, query] = Array.isArray(v) ? v : [v, v];
          const vslug = slugify(query);
          return {
            caption,
            especie: query,
            imagen: imagenParaSlug(vslug),
            id: `${caption}::${query}::${vslug}`.toLowerCase(),
          };
        })
        .sort((a, b) => a.caption.localeCompare(b.caption, 'es', { sensitivity: 'base' }))
    : [{ caption: species, especie: species, imagen, id }];
  const galeria = variedades.map((v) => v.imagen);

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
    galeria,
    variedades,
    tieneVariedades,
    id,
  };
}

function rowHtml(row) {
  const riegosAttr = escapeAttr(JSON.stringify(row.riegos));
  const addAttrs = `data-id="${escapeAttr(row.id)}" data-nombre="${escapeAttr(row.name)}" data-especie="${escapeAttr(row.species)}" data-riego="${escapeAttr(row.riego)}" data-riegos="${riegosAttr}" data-clima="${escapeAttr(row.clima)}" data-luz="${escapeAttr(row.luz)}" data-ubicacion="${escapeAttr(row.sol)}" data-suelo="${escapeAttr(row.suelo)}" data-cuidado="${escapeAttr(row.cuidado)}" data-imagen="${escapeAttr(row.imagen)}" data-galeria="${escapeAttr(JSON.stringify(row.galeria))}"`;

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
  <div class="catalog-accordion">
    <div class="catalog-accordion-inner">
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
${row.variedades
  .map((v) => {
    const btn = row.tieneVariedades
      ? `<button type="button" class="catalog-add catalog-add--variedad" data-id="${escapeAttr(v.id)}" data-nombre="${escapeAttr(v.caption)}" data-especie="${escapeAttr(v.especie)}" data-riego="${escapeAttr(row.riego)}" data-riegos="${riegosAttr}" data-clima="${escapeAttr(row.clima)}" data-luz="${escapeAttr(row.luz)}" data-ubicacion="${escapeAttr(row.sol)}" data-suelo="${escapeAttr(row.suelo)}" data-cuidado="${escapeAttr(row.cuidado)}" data-imagen="${escapeAttr(v.imagen)}" data-galeria="${escapeAttr(JSON.stringify([v.imagen]))}" title="Agregar ${escapeAttr(v.caption)} a Colección" aria-label="Agregar ${escapeAttr(v.caption)} a Colección">+</button>
        `
      : '';
    return `      <figure class="catalog-gallery-item">
        ${btn}<img src="${escapeAttr(v.imagen)}" alt="${escapeAttr(v.caption)}" loading="lazy" height="150" />
        <figcaption>${escapeAttr(v.caption)}</figcaption>
      </figure>`;
  })
  .join('\n')}
      </div>
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
  // Los bloques se emiten en orden alfabético de categoría (colación española,
  // sin distinguir acentos ni mayúsculas). CATEGORIES conserva el orden temático
  // del libro, que sólo lo usa writeCategoriasModule().
  const categoriasOrdenadas = [...CATEGORIES].sort((a, b) => collator.compare(a.label, b.label));
  for (const { label, plants } of categoriasOrdenadas) {
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

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  if (process.argv.includes('--categorias-only')) {
    writeCategoriasModule();
  } else {
    main();
  }
}
