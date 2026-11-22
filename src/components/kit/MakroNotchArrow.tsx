const MakroNotchArrow = () => (
  <div aria-hidden="true" className="absolute bottom-0 right-0 size-[60px] rounded-tl-[20px] bg-background">
    <div className="absolute bottom-full right-0 size-[16px] bg-[radial-gradient(circle_at_0_0,transparent_15.5px,var(--background)_16px)]" />
    <div className="absolute bottom-0 right-full size-[16px] bg-[radial-gradient(circle_at_0_0,transparent_15.5px,var(--background)_16px)]" />
    <div className="absolute bottom-[4px] right-[4px] flex size-[44px] items-center justify-center rounded-[12px] bg-accent text-accent-foreground transition-colors duration-500 ease-[cubic-bezier(0.44,0,0.56,1)] group-hover:bg-deep group-hover:text-accent">
      <svg viewBox="0 0 24 24" className="size-[20px]" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h16M13 5l7 7-7 7" />
      </svg>
    </div>
  </div>
);

export default MakroNotchArrow;
