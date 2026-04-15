import {
  Server,
  Shield,
  Network,
  Video,
  Phone,
  Boxes,
  Wifi,
  Printer,
  Camera,
  Monitor,
  Terminal,
  Database,
  HardDrive,
  Globe,
  Router,
  Cpu,
  Laptop,
  Tablet,
  Smartphone,
  Cloud,
} from 'lucide-react';

export const DEVICE_TYPE_MAP = {
  server: { label: 'Server', icon: Server, color: '#3b82f6' },
  firewall: { label: 'Firewall', icon: Shield, color: '#ef4444' },
  switch: { label: 'Switch', icon: Network, color: '#8b5cf6' },
  nvr: { label: 'NVR', icon: Video, color: '#f59e0b' },
  pbx: { label: 'PBX', icon: Phone, color: '#10b981' },
  esxi: { label: 'ESXi', icon: Boxes, color: '#6366f1' },
  router: { label: 'Router', icon: Wifi, color: '#14b8a6' },
  printer: { label: 'Printer', icon: Printer, color: '#f97316' },
  camera: { label: 'Camera', icon: Camera, color: '#ec4899' },
  windows: { label: 'Windows', icon: Monitor, color: '#0ea5e9' },
  linux: { label: 'Linux', icon: Terminal, color: '#22c55e' },
  database: { label: 'Database', icon: Database, color: '#a855f7' },
  storage: { label: 'Storage', icon: HardDrive, color: '#64748b' },
  web: { label: 'Web', icon: Globe, color: '#06b6d4' },
  access_point: { label: 'Access Point', icon: Router, color: '#84cc16' },
  hypervisor: { label: 'Hypervisor', icon: Cpu, color: '#e11d48' },
  laptop: { label: 'Laptop', icon: Laptop, color: '#0284c7' },
  tablet: { label: 'Tablet', icon: Tablet, color: '#7c3aed' },
  mobile: { label: 'Mobile', icon: Smartphone, color: '#059669' },
  cloud: { label: 'Cloud', icon: Cloud, color: '#0ea5e9' },
};

export function getDeviceIcon(deviceType) {
  return DEVICE_TYPE_MAP[deviceType] || DEVICE_TYPE_MAP.server;
}
