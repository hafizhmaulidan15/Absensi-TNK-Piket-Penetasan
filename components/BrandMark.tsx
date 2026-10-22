export function BrandMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} role="img" aria-label="Logo Penetasan TNK 62">
      <rect width="40" height="40" rx="12" fill="#0b5a38" />
      <path
        d="M20 7c5.2 0 9.4 5.4 9.4 12.1S25.2 32 20 32s-9.4-6.1-9.4-12.9S14.8 7 20 7Z"
        fill="#f7f4ec"
      />
      <path
        d="M20.4 11.5c-2.2 2.6-1.3 4.6.4 6.3 1.5 1.6 2.8 3 .6 5.4-1.1 1.2-2.6 1.8-4.3 1.9"
        fill="none"
        stroke="#d89a16"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="15.6" cy="17.4" r="1.5" fill="#0b5a38" />
    </svg>
  );
}

export function EggIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M12 3c3.6 0 6.5 4.2 6.5 9s-2.9 9-6.5 9-6.5-4.2-6.5-9 2.9-9 6.5-9Z" />
    </svg>
  );
}

export function HatchIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20c0-6 3.6-10 8-10s8 4 8 10" />
      <path d="M9 20c0-3 1.4-5 3-5s3 2 3 5" />
      <path d="M12 3v4M9 4.5 12 3l3 1.5" />
    </svg>
  );
}
