import { Link } from 'react-router-dom';
import { MobileNav } from './MobileNav';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';
import logo from '@/assets/logo.png';

export function MobileHeader() {
  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <MobileNav />
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={logo} alt="Green Bull" className="h-8 w-8 object-contain" />
          <span className="font-display text-lg font-bold text-foreground">Green Bull</span>
        </Link>
      </div>
      <NotificationsDropdown />
    </div>
  );
}
