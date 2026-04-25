/**
 * @file useToast.ts
 * @description Hook for enqueuing toast messages from any component within `ToastProvider`.
 * @module Context
 */
import { useContext } from 'react';
import { ToastContext } from './ToastContext';

export function useToast() {
  return useContext(ToastContext);
}
