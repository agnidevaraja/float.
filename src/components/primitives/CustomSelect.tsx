import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

interface CustomSelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: CustomSelectOption<T>[];
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

interface MenuCoords {
  top: number;
  left: number;
  width: number;
  openUpward: boolean;
  maxHeight: number;
}

export function CustomSelect<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  className = '',
  ariaLabel,
  disabled = false,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(() =>
    Math.max(
      0,
      options.findIndex((o) => o.value === value)
    )
  );
  const [coords, setCoords] = useState<MenuCoords | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = options.find((o) => o.value === value);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const estimatedHeight = Math.min(280, options.length * 40 + 16);
    const openUpward = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
    const maxHeight = Math.max(140, Math.min(280, openUpward ? spaceAbove : spaceBelow));

    setCoords({
      top: openUpward ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 180),
      openUpward,
      maxHeight,
    });
  }, [options.length]);

  const openMenu = useCallback(() => {
    if (disabled) return;
    const idx = options.findIndex((o) => o.value === value);
    setHighlightedIndex(idx >= 0 ? idx : 0);
    updatePosition();
    setIsOpen(true);
  }, [disabled, options, value, updatePosition]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    const handleScrollOrResize = () => updatePosition();
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        closeMenu();
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen, updatePosition, closeMenu]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openMenu();
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const chosen = options[highlightedIndex];
      if (chosen) {
        onChange(chosen.value);
        closeMenu();
        triggerRef.current?.focus();
      }
    } else if (e.key === 'Tab') {
      closeMenu();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
        onClick={() => (isOpen ? closeMenu() : openMenu())}
        onKeyDown={handleKeyDown}
        className={`w-full rounded-lg border px-3 py-2 text-xs font-sans text-left flex items-center justify-between gap-2 transition-all duration-150 ${
          isOpen
            ? 'border-[var(--accent-primary)] bg-[var(--bg-elevated)] text-[var(--text-primary)] ring-2 ring-[var(--accent-primary)]/20'
            : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--text-tertiary)]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      >
        <span className="truncate font-medium">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-[var(--accent-primary)]' : ''
          }`}
        />
      </button>

      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
              transform: coords.openUpward ? 'translateY(-100%)' : 'none',
            }}
            className="z-[9999] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-1.5 shadow-xl overflow-y-auto backdrop-blur-md"
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isHighlighted = idx === highlightedIndex;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => {
                    onChange(opt.value);
                    closeMenu();
                    triggerRef.current?.focus();
                  }}
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-xs font-sans flex items-center justify-between gap-2 transition-colors ${
                    isSelected
                      ? 'bg-[var(--accent-primary)]/12 text-[var(--accent-primary)] font-semibold'
                      : isHighlighted
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{opt.label}</div>
                    {opt.description && (
                      <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5 font-normal">
                        {opt.description}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
