// MOBILE: Bottom navigation for small screens
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, CalendarDays, Coffee, Camera, MessageSquare } from 'lucide-react';

const items = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/booking', label: 'Booking', icon: Calendar },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/snacks', label: 'Snacks', icon: Coffee },
  { to: '/gallery', label: 'Gallery', icon: Camera },
  { to: '/support', label: 'Support', icon: MessageSquare },
];

export function MobileBottomNav() {
  return (
    <nav
      // MOBILE: Fixed bottom nav with safe area handling
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-t border-border/60"
      role="navigation"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-6">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end
              className={({ isActive }) =>
                [
                  'flex flex-col items-center justify-center gap-1 py-2.5',
                  'text-xs',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                ].join(' ')
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="leading-none">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      {/* MOBILE: Safe area padding */}
      <div className="h-[calc(env(safe-area-inset-bottom))]" />
    </nav>
  );
}

export default MobileBottomNav;

