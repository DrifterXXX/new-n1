/**
 * Lucide 图标白名单注册表(ARCHITECTURE §8.3 锁定的 45 个)。
 * 唯一允许 import 'lucide-vue-next' 的地方 —— 业务组件一律经 AppIcon.vue。
 * 零 emoji: 任何功能图标都必须在此表内。
 */
import {
  ArrowLeft, ArrowRight, ArrowUp, Bookmark, BookOpen, Calendar, Check, CheckCircle,
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsLeft, ChevronsRight,
  Circle, CircleCheck, CircleX, Clock, Download, Dumbbell, Ellipsis, FileText, Flag,
  Gauge, Headphones, Info, Layers, LayoutDashboard, Loader, Moon, Pause, Pencil,
  Percent, Play, RefreshCw, RotateCcw, Search, Settings2, Sun, Target, Trash2,
  Upload, Volume2, VolumeX, X,
} from 'lucide-vue-next';
import type { Component } from 'vue';

export const ICONS = {
  // nav (7)
  'layout-dashboard': LayoutDashboard,
  dumbbell: Dumbbell,
  'book-open': BookOpen,
  headphones: Headphones,
  'file-text': FileText,
  'rotate-ccw': RotateCcw,
  target: Target,
  // audio (6)
  play: Play,
  pause: Pause,
  'volume-2': Volume2,
  'volume-x': VolumeX,
  gauge: Gauge,
  loader: Loader,
  // feedback (6)
  check: Check,
  'circle-check': CircleCheck,
  x: X,
  'circle-x': CircleX,
  circle: Circle,
  info: Info,
  // action (16)
  bookmark: Bookmark,
  search: Search,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'arrow-right': ArrowRight,
  'arrow-left': ArrowLeft,
  'refresh-cw': RefreshCw,
  'trash-2': Trash2,
  ellipsis: Ellipsis,
  sun: Sun,
  moon: Moon,
  'settings-2': Settings2,
  pencil: Pencil,
  'arrow-up': ArrowUp,
  download: Download,
  upload: Upload,
  // pager (4)
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevrons-left': ChevronsLeft,
  'chevrons-right': ChevronsRight,
  // dashboard metric (3)
  'check-circle': CheckCircle,
  layers: Layers,
  percent: Percent,
  // strategy (3)
  calendar: Calendar,
  clock: Clock,
  flag: Flag,
} satisfies Record<string, Component>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];
