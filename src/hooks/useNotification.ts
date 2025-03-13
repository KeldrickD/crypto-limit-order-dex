import { useCallback } from 'react';

export const useNotification = () => {
  const showError = useCallback((message: string) => {
    // In a real app, this would show a toast or notification
    console.error(message);
  }, []);

  const showSuccess = useCallback((message: string) => {
    // In a real app, this would show a toast or notification
    console.log(message);
  }, []);

  return {
    showError,
    showSuccess
  };
}; 