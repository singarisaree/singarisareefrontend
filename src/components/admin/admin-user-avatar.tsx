import { cn } from '@/lib/utils';

interface AdminUserAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export function AdminUserAvatar({ name, size = 'sm', className }: AdminUserAvatarProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-[#0f172a] font-semibold text-white',
        sizeMap[size],
        className,
      )}
      aria-hidden
    >
      {getInitials(name)}
    </div>
  );
}

export { getInitials };
