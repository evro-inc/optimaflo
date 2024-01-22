import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/src/components/ui/sheet';
import { SideNav } from './side-nav';
import { NavItems } from './NavItems';
import { HamburgerMenuIcon } from '@radix-ui/react-icons';

export const MobileSidebar = () => {
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <div className="flex items-center justify-center gap-2">
            <HamburgerMenuIcon className="h-6 w-6" />
            <h1 className="text-lg font-semibold pl-2">OptimaFlo</h1>
          </div>
        </SheetTrigger>
        <SheetContent side="left" className="w-72">
          <div className="px-1 py-6 pt-16">
            <SideNav items={NavItems} setOpen={setOpen} className={undefined} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
