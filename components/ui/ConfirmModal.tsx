'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, Info, CheckCircle2, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  khmerTitle?: string;
  message: string;
  badgeText?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
  isAlertOnly?: boolean; // if true, only shows an "OK / Got it" button
}

export default function ConfirmModal({
  isOpen,
  title,
  khmerTitle,
  message,
  badgeText,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
  isAlertOnly = false,
}: ConfirmModalProps) {
  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: Trash2,
          iconBg: 'bg-red-100 text-red-600 ring-8 ring-red-50',
          btnBg: 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/30',
          badgeBg: 'bg-red-50 text-red-700 border-red-200',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconBg: 'bg-amber-100 text-amber-600 ring-8 ring-amber-50',
          btnBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/30',
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      case 'success':
        return {
          icon: CheckCircle2,
          iconBg: 'bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50',
          btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30',
          badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      default:
        return {
          icon: Info,
          iconBg: 'bg-blue-100 text-blue-600 ring-8 ring-blue-50',
          btnBg: 'bg-slate-900 hover:bg-black text-white shadow-sm',
          badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
        };
    }
  };

  const style = getVariantStyles();
  const IconComponent = style.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150 max-h-[90dvh] overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar with subtle icon */}
        <div className="p-6 pb-4 flex items-start space-x-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform ${style.iconBg}`}
          >
            <IconComponent className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {title}
              </h3>
              <button
                onClick={onCancel}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 -mr-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {khmerTitle && (
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-khmer mt-0.5">
                {khmerTitle}
              </p>
            )}

            {badgeText && (
              <div className="mt-2">
                <span
                  className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded-md border ${style.badgeBg}`}
                >
                  {badgeText}
                </span>
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-2.5">
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
          {!isAlertOnly && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition active:scale-95 shadow-2xs"
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className={`px-4 py-2 text-xs font-bold rounded-xl transition active:scale-95 flex items-center space-x-1.5 ${style.btnBg}`}
          >
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
