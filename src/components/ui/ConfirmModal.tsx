"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, HelpCircle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Ya, Hapus Data",
  cancelText = "Batal",
  variant = "danger",
  loading = false,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 selection:bg-rose-500 selection:text-white">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative z-10 space-y-6 overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={loading}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon Header */}
            <div className="flex items-center gap-4">
              {variant === "danger" && (
                <div className="w-14 h-14 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-inner">
                  <Trash2 className="w-7 h-7" />
                </div>
              )}
              {variant === "warning" && (
                <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-inner">
                  <AlertTriangle className="w-7 h-7" />
                </div>
              )}
              {variant === "info" && (
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0 shadow-inner">
                  <HelpCircle className="w-7 h-7" />
                </div>
              )}

              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Konfirmasi Tindakan
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
                  {title}
                </h3>
              </div>
            </div>

            {/* Message Body */}
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {message}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all disabled:opacity-50"
              >
                {cancelText}
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                  variant === "danger"
                    ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25"
                    : variant === "warning"
                    ? "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/25"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25"
                }`}
              >
                {loading ? "Memproses..." : confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
