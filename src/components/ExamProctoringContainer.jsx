// السطر 1: استيراد المكونات والـ Hook الخاص بالأمان
import React, { useState } from 'react';
import { useSecurityAndProctoring } from '../hooks/useSecurityAndProctoring';

// السطر 5: غلاف صفحة الامتحان المباشر
export const ExamProctoringContainer = ({
  examTitle = 'اختبار منتصف العام',
  isExamActive = true,
  onForceSubmitExam,
  onTabSwitchAlert,
  children,
}) => {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleAutoSubmit = (reason) => {
    setIsSubmitted(true);
    if (onForceSubmitExam) onForceSubmitExam(reason);
  };

  // السطر 21: استدعاء نظام الإنذارات الـ 3
  const {
    warningsCount,
    showWarningModal,
    dismissWarningModal,
    adminMessageModal,
    setAdminMessageModal,
  } = useSecurityAndProctoring({
    isExamActive: isExamActive && !isSubmitted,
    maxWarnings: 3,
    onForceSubmit: handleAutoSubmit,
    onTabSwitchAlert: onTabSwitchAlert,
  });

  // السطر 36: واجهة الامتحان وشريط عداد الإنذارات الأعلى
  return (
    <div className="relative min-h-screen bg-slate-50 p-4 md:p-8 select-none" dir="rtl">
      <div className="flex flex-col md:flex-row items-center justify-between bg-white p-4 rounded-xl shadow-md border border-slate-200 mb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{examTitle}</h1>
          <p className="text-sm text-slate-500">مراقبة الاختبار نشطة تلقائياً. يرجى عدم مغادرة النافذة.</p>
        </div>

        {/* السطر 45: مؤشر ألوان الإنذارات (1 من 3 - 2 من 3 - 3 من 3) */}
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg text-amber-800 font-semibold text-sm">
          <span>عدد الإنذارات:</span>
          <div className="flex gap-1">
            {[1, 2, 3].map((strike) => (
              <span
                key={strike}
                className={`w-3 h-3 rounded-full ${
                  strike <= warningsCount ? 'bg-red-600 animate-pulse' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-slate-500">({warningsCount} / 3)</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        {children}
      </div>

      {/* السطر 68: نافذة تحذيرية باللغة العربية تظهر للطالب فور الخروج من الامتحان */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border-2 border-red-500 text-center animate-bounce-once">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              ⚠️
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">تحذير: تم كشف مغادرة صفحة الاختبار!</h3>
            <p className="text-slate-600 text-sm mb-4">
              ممنوع التنقل بين التبويبات أثناء الاختبار. لقد حصلت على الإنذار رقم ({warningsCount} من 3).
            </p>
            <p className="text-xs text-red-600 font-semibold mb-6">
              عند الوصول إلى 3 إنذارات سيتم إنهاء الاختبار وتسليمه تلقائياً!
            </p>
            <button
              onClick={dismissWarningModal}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition duration-200 shadow-lg shadow-red-200"
            >
              فهمت، العودة للاختبار
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
