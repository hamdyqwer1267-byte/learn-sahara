// السطر 1: استيراد React
import React from 'react';

// السطر 4: كارت الفيديو المحمي بتاريخ النشر
export const ScheduledContentCard = ({ item, onSelectLesson }) => {
  const now = new Date();
  const releaseDate = new Date(item.releaseDate);
  const isReleased = now >= releaseDate; // هل حان وقت العرض؟

  // السطر 10: تنسيق التاريخ باللغة العربية
  const formattedReleaseDate = releaseDate.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // السطر 19: إظهار شارة "سيتوفر قريباً" وتجميل الزر إذا لم يحين الموعد
  return (
    <div
      className={`relative p-5 rounded-2xl border transition duration-200 ${
        isReleased
          ? 'bg-white border-slate-200 hover:border-indigo-500 shadow-sm hover:shadow-md cursor-pointer'
          : 'bg-slate-50 border-slate-200 opacity-80 cursor-not-allowed'
      }`}
      onClick={() => isReleased && onSelectLesson && onSelectLesson(item)}
      dir="rtl"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${isReleased ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
            {isReleased ? '▶' : '🔒'}
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-base">{item.title}</h4>
            <span className="text-xs text-slate-500">{item.duration || 'مادة تعليمية'}</span>
          </div>
        </div>

        {!isReleased ? (
          <div className="flex flex-col items-end">
            <span className="bg-amber-100 text-amber-800 font-extrabold text-xs px-3 py-1 rounded-full border border-amber-200">
              سيتوفر قريباً
            </span>
            <span className="text-[11px] text-slate-400 mt-1">موعد النشر: {formattedReleaseDate}</span>
          </div>
        ) : (
          <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-3 py-1 rounded-full">متاح الآن</span>
        )}
      </div>
    </div>
  );
};
