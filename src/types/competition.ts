export type Jornada = 'manana' | 'tarde';
export type Categoria = 'zumo_rc' | 'zumo_autonomo' | 'futbol_rc' | 'velocitas' | 'rally' | 'barcos';
export type ArbitroId = 'arb1' | 'arb2' | 'arb3' | 'arb4' | 'arb5' | 'arb6';

export interface Equipo {
  equipo_id: string;
  equipo_nombre: string;
}

export interface BaseResult {
  jornada: Jornada;
  categoria: Categoria;
  arbitro_id: ArbitroId;
  equipo_id: string;
}

export interface PuntosResult extends BaseResult {
  puntos: number;
}

export interface FutbolResult extends BaseResult {
  victorias: number;
  empates: number;
  derrotas: number;
  goles_favor: number;
  goles_contra: number;
}

export interface VelocitasResult extends BaseResult {
  tiempo_s: number;
}

export type CompetitionResult = PuntosResult | FutbolResult | VelocitasResult;

export interface RosterMessage {
  jornada: Jornada;
  categoria: Categoria;
  equipos: Equipo[];
}

export interface TeamData {
  equipo: Equipo;
  puntos?: number;
  victorias?: number;
  empates?: number;
  derrotas?: number;
  goles_favor?: number;
  goles_contra?: number;
  tiempo_s?: number;
  pts_calculados?: number;
  diferencia_gol?: number;
  position?: number;
}

export interface CategoryData {
  [key: string]: TeamData;
}

export interface CompetitionData {
  [key: string]: CategoryData; // jornada_categoria key
}

export const CATEGORIAS: { [key in Categoria]: string } = {
  zumo_rc: 'Zumo RC',
  zumo_autonomo: 'Zumo Autónomo',
  futbol_rc: 'Fútbol RC',
  velocitas: 'Velocitas',
  rally: 'Rally',
  barcos: 'Barcos'
};

export const JORNADAS: { [key in Jornada]: string } = {
  manana: 'Mañana',
  tarde: 'Tarde'
};

export const PARALLEL_CATEGORIES: Categoria[] = ['zumo_rc', 'zumo_autonomo', 'futbol_rc', 'velocitas'];
export const SEQUENTIAL_CATEGORIES: Categoria[] = ['rally', 'barcos'];

export const CONFIG = {
  FUTBOL_WIN_POINTS: 3,
  FUTBOL_DRAW_POINTS: 1,
  FUTBOL_LOSS_POINTS: 0,
  ORDEN_VELOCITAS: 'desc' as const
};