// السطر 1: استيراد المكتبات الأساسية
import { useEffect, useState, useRef, useCallback } from 'react';

// السطر 7: بداية الـ Hook لحظر أخذ اللقطات وفتح عناصر المعاينة (DevTools)
export const useSecurityAndProctoring = ({
  isExamActive = false,
  maxWarnings = 3,
  onForceSubmit,
  onTabSwitchAlert,
  sessionId,
  onSessionInvalidated,
}) => {
  const [warningsCount, setWarningsCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [adminMessageModal, setAdminMessageModal] = useState(null);
  const isTerminatedRef = useRef(false);

  // السطر 24: إلغاء كليك يمين وتحديد النصوص (Anti-Copy & Right-Click)
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleSelectStart = (e) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, []);

  // السطر 36: حظر زراير الكيبورد (F12, PrintScreen, Ctrl+Shift+I, Ctrl+U, Ctrl+P)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        navigator.clipboard?.writeText?.('');
        alert('تنبيه: أخذ لقطات الشاشة غير مسموح به لحماية المحتوى.');
      }
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'C', 'J', 'i', 'c', 'j'].includes(e.key)) ||
        (e.ctrlKey && ['U', 'u', 'S', 's', 'P', 'p'].includes(e.key))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  // السطر 60: كشف الخروج من الصفحة أو التنقل بين التبويبات (Tab-Switch Warning)
  const registerTabSwitch = useCallback(() => {
    if (!isExamActive || isTerminatedRef.current) return;
    setWarningsCount((prev) => {
      const updated = prev + 1;
      if (onTabSwitchAlert) onTabSwitchAlert({ warningNumber: updated, maxWarnings });
      if (updated >= maxWarnings) {
        isTerminatedRef.current = true;
        setShowWarningModal(false);
        if (onForceSubmit) onForceSubmit('EXCEEDED_TAB_SWITCH_LIMIT');
      } else {
        setShowWarningModal(true);
      }
      return updated;
    });
  }, [isExamActive, maxWarnings, onForceSubmit, onTabSwitchAlert]);

  // السطر 80: حماية وتتبع التنقل
  useEffect(() => {
    if (!isExamActive) return;
    const handleVisibilityChange = () => { if (document.hidden) registerTabSwitch(); };
    const handleWindowBlur = () => registerTabSwitch();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isExamActive, registerTabSwitch]);

  const dismissWarningModal = () => setShowWarningModal(false);

  // السطر 98: إرجاع البيانات لاستخدامها في المكونات
  return {
    warningsCount,
    showWarningModal,
    dismissWarningModal,
    adminMessageModal,
    setAdminMessageModal,
  };
};
