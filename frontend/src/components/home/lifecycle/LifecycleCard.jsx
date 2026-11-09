import { useState, useCallback, memo } from 'react';
import StageIllustration from './StageIllustrations';

/**
 * Interactive Lifecycle Stage Card for EcoRevive's 9-Stage Plantation Workflow.
 *
 * Supports hover (pointer), focus (keyboard navigation with visible focus rings),
 * and tap/click (mobile touch devices) with smooth reversible micro-animations.
 */
function LifecycleCard({ stage }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const active = isHovered || isFocused || isActive;
  const Icon = stage.icon;

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsActive((prev) => !prev);
    }
  }, []);

  const handleClick = useCallback(() => {
    setIsActive((prev) => !prev);
  }, []);

  return (
    <article
      tabIndex={0}
      role="article"
      data-testid={`lifecycle-card-${stage.num}`}
      aria-label={`Stage ${stage.num}: ${stage.title} — ${stage.tag}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
        setIsActive(false);
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`group relative p-5 rounded-2xl bg-white border transition-all duration-300 flex flex-col justify-between space-y-4 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:border-forest-600 ${
        active
          ? 'border-forest-500 shadow-card ring-1 ring-forest-500/20'
          : 'border-warm-400 hover:border-forest-400 shadow-subtle hover:shadow-card'
      }`}
    >
      <div className="space-y-3.5">
        {/* Stage Header: Numeric Badge & Functional Category Tag */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-forest-700 bg-forest-50 px-2 py-0.5 rounded border border-forest-200 transition-colors group-hover:bg-forest-100 group-hover:border-forest-300">
            {stage.num}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-charcoal-500 font-semibold">
            {stage.tag}
          </span>
        </div>

        {/* Stage Heading with Botanical Icon */}
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${
              active
                ? 'bg-forest-900 text-white'
                : 'bg-warm-200 text-forest-900 group-hover:bg-forest-900 group-hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-charcoal-900 text-base tracking-tight font-serif">
            {stage.title}
          </h3>
        </div>

        {/* Exact Stage Description Text */}
        <p className="text-xs text-charcoal-600 leading-relaxed min-h-[48px]">
          {stage.desc}
        </p>

        {/* Dedicated Interactive Micro-Illustration Canvas */}
        <div
          className={`relative w-full h-28 rounded-xl border p-2 overflow-hidden flex items-center justify-center transition-all duration-300 ${
            active
              ? 'bg-warm-100/90 border-forest-300 shadow-inner'
              : 'bg-warm-100/60 border-warm-300/80 group-hover:bg-warm-100/80 group-hover:border-warm-400'
          }`}
        >
          <StageIllustration num={stage.num} active={active} />
        </div>
      </div>

      {/* Stage Group Footer (e.g. Phase 1: Planning) */}
      <div className="pt-2 border-t border-warm-300/80 flex items-center justify-between text-[11px] text-charcoal-500 font-mono">
        <span>{stage.stageGroup}</span>
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] transition-colors ${
            active ? 'text-forest-700 font-semibold' : 'text-charcoal-400 group-hover:text-forest-600'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              active ? 'bg-forest-600 scale-125' : 'bg-charcoal-300 group-hover:bg-forest-500'
            }`}
          />
          <span className="uppercase tracking-wider">{active ? 'Inspecting' : 'Explore'}</span>
        </span>
      </div>
    </article>
  );
}

export default memo(LifecycleCard);

