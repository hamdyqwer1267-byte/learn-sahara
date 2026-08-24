// السطر 1: استيراد React
import React, { useEffect, useState } from 'react';

// السطر 4: المكون الذي يعرض الاسم ورقم الهاتف يتحرك ببطء شفاف على الشاشة
export const DynamicWatermark = ({ studentName = 'طالب إيجابي', studentPhone = '01000000000' }) => {
  const [position, setPosition] = useState({ top: 20, left: 20 });

  // السطر 8: تغيير موقع النص كل 4 ثوانٍ ببطء شديد
  useEffect(() => {
    const updatePosition = () => {
      const randomTop = Math.floor(Math.random() * 80) + 10;
      const randomLeft = Math.floor(Math.random() * 80) + 10;
      setPosition({ top: randomTop, left: randomLeft });
    };
    const interval = setInterval(updatePosition, 4000);
    return () => clearInterval(interval);
  }, []);

  // السطر 19: تنسيق العناصر وتحديد اللون الأحمر الشفاف غير القابل للتحديد
  return (
    <div
      style={{
        position: 'fixed',
        top: `${position.top}%`,
        left: `${position.left}%`,
        transition: 'top 3.5s ease-in-out, left 3.5s ease-in-out',
        pointerEvents: 'none',
        zIndex: 99999,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        opacity: 0.22,
      }}
      className="flex flex-col items-center justify-center font-bold text-red-600 text-sm md:text-base tracking-widest pointer-events-none select-none"
      dir="ltr"
    >
      <span>{studentName}</span>
      <span>{studentPhone}</span>
    </div>
  );
};
