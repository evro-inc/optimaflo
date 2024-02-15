'use client';
import Link from 'next/link';

import { usePathname } from 'next/navigation';
import { buttonVariants } from '@/src/components/ui/button';

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './subnav-accordion';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { cn } from '@/src/utils/utils';
import { Accordion } from './subnav-accordion';
import {
  selectIsSidebarOpen,
  toggleSidebar,
} from '@/src/redux/sidebarSlice';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectAccordionOpenItems,
  toggleAccordionItem,
} from '@/src/redux/globalSlice';

export function SideNav({ items, setOpen, className }) {
  const path = usePathname();
  const isOpen = useSelector(selectIsSidebarOpen);
  const openItems = useSelector(selectAccordionOpenItems);
  const dispatch = useDispatch();

  const handleAccordionChange = (itemId) => {
    dispatch(toggleAccordionItem(itemId));
  };

  const openMinimizedSideBar = () => {
    dispatch(toggleSidebar());
  };

  return (
    <nav className="space-y-2">
      {items.map((item) =>
        item.isChidren ? (
          <Accordion
            type="single"
            collapsible
            className="space-y-2"
            key={item.title}
            value={openItems[item.title] ? item.title : ''}
            onValueChange={() => handleAccordionChange(item.title)}
          >
            <AccordionItem value={item.title} className="border-none">
              <AccordionTrigger
                className={cn(
                  buttonVariants({ variant: 'ghost' }),
                  'group relative flex h-12 justify-between px-4 py-2 text-base duration-200 hover:bg-muted hover:no-underline'
                )}
              >
                <div>
                  {!isOpen && (
                    <item.icon
                      className={cn('h-5 w-5', item.color)}
                      onClick={openMinimizedSideBar}
                    />
                  )}
                  {isOpen && (
                    <item.icon className={cn('h-5 w-5', item.color)} />
                  )}
                </div>
                <div
                  className={cn(
                    'absolute left-12 text-base duration-200',
                    !isOpen && className
                  )}
                >
                  {item.title}
                </div>

                {isOpen && (
                  <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                )}
              </AccordionTrigger>
              {isOpen && (
                <AccordionContent className="ml-4 mt-2 space-y-4 pb-1">
                  {item.children?.map((child) => (
                    <Link
                      key={child.title}
                      href={child.href}
                      onClick={() => {
                        if (setOpen) setOpen(false);
                      }}
                      className={cn(
                        buttonVariants({ variant: 'ghost' }),
                        'group flex h-12 justify-start gap-x-3',
                        path === child.href &&
                          'bg-muted font-bold hover:bg-muted'
                      )}
                    >
                      <item.icon className={cn('h-5 w-5', child.color)} />
                      <div
                        className={cn(
                          'text-base duration-200',
                          !isOpen && className
                        )}
                      >
                        {child.title}
                      </div>
                    </Link>
                  ))}
                </AccordionContent>
              )}
            </AccordionItem>
          </Accordion>
        ) : (
          <Link
            key={item.title}
            href={item.href}
            onClick={() => {
              if (setOpen) setOpen(false);
            }}
            className={cn(
              buttonVariants({ variant: 'ghost' }),
              'group relative flex h-12 justify-start',
              path === item.href && 'bg-muted font-bold hover:bg-muted'
            )}
          >
            <item.icon className={cn('h-5 w-5', item.color)} />
            <span
              className={cn(
                'absolute left-12 text-base duration-200',
                !isOpen && className
              )}
            >
              {item.title}
            </span>
          </Link>
        )
      )}
    </nav>
  );
}
