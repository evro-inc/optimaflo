import { PersonIcon, MixIcon, DashboardIcon } from '@radix-ui/react-icons';

export const NavItems = [
  {
    title: 'Dashboard',
    icon: DashboardIcon,
    href: '/',
    color: 'text-sky-500',
  },
  {
    title: 'Profile',
    icon: PersonIcon,
    href: '/profile',
    color: 'text-green-500',
  },
  {
    title: 'Google Tag Manager',
    icon: MixIcon,
    href: '/dashboard/gtm',
    color: 'text-orange-500',
    isChidren: true,
    children: [
      {
        title: 'Accounts',
        icon: MixIcon,
        color: 'text-pink-500',
        href: '/dashboard/gtm/accounts',
      },
      {
        title: 'Containers',
        icon: MixIcon,
        color: 'text-pink-500',
        href: '/dashboard/gtm/containers',
      },
      {
        title: 'Workspaces',
        icon: MixIcon,
        color: 'text-pink-500',
        href: '/dashboard/gtm/workspaces',
      },
    ],
  },
  {
    title: 'Google Analytics 4',
    icon: MixIcon,
    href: '/dashboard/ga',
    color: 'text-orange-500',
    isChidren: true,
    children: [
      {
        title: 'Accounts',
        icon: MixIcon,
        color: 'text-pink-500',
        href: '/dashboard/gtm/accounts',
      },
    ],
  },
];
