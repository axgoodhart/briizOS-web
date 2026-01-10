import {
  Music,
  Feather,
  Drama,
  BookOpen,
  Code2,
  Palette,
  Heart,
  Home,
  type LucideIcon,
} from 'lucide-react';
import type { Domain } from './types';

export type DomainConfig = {
  label: string;
  icon: LucideIcon;
  gradient: string;
  color: string;
  bgGradient: string;
};

export const DOMAINS: Record<Domain, DomainConfig> = {
  music: {
    label: 'Music',
    icon: Music,
    gradient: 'from-purple-500 to-pink-500',
    color: 'hsl(280, 70%, 50%)',
    bgGradient: 'linear-gradient(135deg, hsl(280, 70%, 50%), hsl(330, 80%, 55%))',
  },
  poetry: {
    label: 'Poetry',
    icon: Feather,
    gradient: 'from-amber-400 to-orange-500',
    color: 'hsl(35, 90%, 55%)',
    bgGradient: 'linear-gradient(135deg, hsl(45, 90%, 55%), hsl(25, 90%, 55%))',
  },
  theatre: {
    label: 'Theatre',
    icon: Drama,
    gradient: 'from-red-500 to-rose-500',
    color: 'hsl(350, 70%, 55%)',
    bgGradient: 'linear-gradient(135deg, hsl(0, 70%, 55%), hsl(340, 80%, 55%))',
  },
  theory: {
    label: 'Theory',
    icon: BookOpen,
    gradient: 'from-blue-400 to-indigo-500',
    color: 'hsl(220, 70%, 55%)',
    bgGradient: 'linear-gradient(135deg, hsl(210, 80%, 55%), hsl(240, 70%, 55%))',
  },
  coding: {
    label: 'Coding',
    icon: Code2,
    gradient: 'from-green-400 to-emerald-500',
    color: 'hsl(150, 70%, 45%)',
    bgGradient: 'linear-gradient(135deg, hsl(140, 70%, 45%), hsl(160, 70%, 40%))',
  },
  'visual-art': {
    label: 'Visual Art',
    icon: Palette,
    gradient: 'from-pink-400 to-violet-500',
    color: 'hsl(300, 70%, 55%)',
    bgGradient: 'linear-gradient(135deg, hsl(330, 70%, 60%), hsl(270, 70%, 55%))',
  },
  health: {
    label: 'Health',
    icon: Heart,
    gradient: 'from-teal-400 to-cyan-500',
    color: 'hsl(180, 70%, 45%)',
    bgGradient: 'linear-gradient(135deg, hsl(170, 70%, 45%), hsl(190, 70%, 50%))',
  },
  home: {
    label: 'Home',
    icon: Home,
    gradient: 'from-slate-400 to-gray-500',
    color: 'hsl(210, 20%, 55%)',
    bgGradient: 'linear-gradient(135deg, hsl(210, 15%, 50%), hsl(200, 10%, 45%))',
  },
};

export const DOMAIN_LIST = Object.entries(DOMAINS).map(([key, config]) => ({
  value: key as Domain,
  ...config,
}));

// Status configurations
export const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  active: {
    label: 'Active',
    color: 'hsl(165, 100%, 45%)',
    bgColor: 'hsla(165, 100%, 45%, 0.15)',
  },
  paused: {
    label: 'Paused',
    color: 'hsl(45, 90%, 55%)',
    bgColor: 'hsla(45, 90%, 55%, 0.15)',
  },
  done: {
    label: 'Done',
    color: 'hsl(210, 70%, 55%)',
    bgColor: 'hsla(210, 70%, 55%, 0.15)',
  },
  archived: {
    label: 'Archived',
    color: 'hsl(210, 10%, 50%)',
    bgColor: 'hsla(210, 10%, 50%, 0.15)',
  },
};
