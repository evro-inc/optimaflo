import { PersonIcon, MixIcon, BarChartIcon, Component1Icon } from '@radix-ui/react-icons';

export const NavItems = [
  {
    title: 'Profile',
    icon: PersonIcon,
    href: '/profile',
    color: 'text-green-500',
  },
  {
    title: 'Google Tag Manager',
    icon: Component1Icon,
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
    icon: BarChartIcon,
    href: '/dashboard/ga',
    color: 'text-orange-500',
    isChidren: true,
    children: [
      {
        title: 'Accounts',
        icon: BarChartIcon,
        color: 'text-pink-500',
        href: '/dashboard/ga/accounts',
      },
      {
        title: 'Properties',
        icon: BarChartIcon,
        color: 'text-pink-500',
        href: '/dashboard/ga/properties',
      },
      {
        title: 'Links',
        icon: BarChartIcon,
        color: 'text-pink-500',
        href: '/dashboard/ga/links',
      },
    ],
  },
];
