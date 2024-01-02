'use client';
import React, { useState } from 'react';
import { Separator } from '@/src/components/ui/separator';
import { Button } from '@/src/components/ui/button';
import { ChevronRightIcon } from '@radix-ui/react-icons';
import { cn } from '@/src/lib/utils';
import { SideNav } from './side-nav';
import { NavItems } from './NavItems';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectIsSidebarOpen,
  toggleSidebar,
} from '@/src/app/redux/sidebarSlice';

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const dispatch = useDispatch();
  const isOpen = useSelector(selectIsSidebarOpen);
  const [swith, setSwitch] = useState(false);

  const handleToggle = () => {
    setSwitch(true);
    dispatch(toggleSidebar()); // Dispatch the toggleSidebar action
    setTimeout(() => setSwitch(false), 500);
  };

  return (
    <nav
      className={cn(
        `relative hidden h-screen border-r pt-16 md:block`,
        swith && 'duration-500',
        isOpen ? 'w-72' : 'w-[78px]',
        className
      )}
    >
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="mt-3 space-y-1">
            <SideNav
              className="text-background opacity-0 transition-all duration-300 group-hover:z-50 group-hover:ml-4 group-hover:rounded group-hover:bg-foreground group-hover:p-2 group-hover:opacity-100"
              items={NavItems}
              setOpen={() => {}}
            />
          </div>
        </div>
      </div>
      <div className="mt-30 absolute bottom-5 w-full space-y-2 px-3">
        <Separator />
        <Button
          onClick={handleToggle}
          className={cn('h-10 w-full bg-foreground', isOpen && 'rotate-180')}
        >
          <ChevronRightIcon className="h-5 w-5 text-background" />
        </Button>
      </div>
    </nav>
  );
}
