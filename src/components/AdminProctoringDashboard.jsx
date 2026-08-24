// السطر 1: استيراد المكتبات
import React, { useState } from 'react';

// السطر 4: المكون الرئيسي للوحة تحكم الأدمن
export const AdminProctoringDashboard = () => {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('live');
  const [chatMessage, setChatMessage] = useState('');
  const [adminChatLog, setAdminChatLog] = useState([]);
  const [warningMessageInput, setWarningMessageInput] = useState('');

  // السطر 14: قائمة بيانات الطلاب الوهمية المحدثة فوراً
  const [students, setStudents] = useState([
    { id: 'std_1', name: 'أحمد محمد علي', phone: '01012345678', parentPhone: '01122334455', status: 'online', currentActivity: 'taking_exam', currentExamName: 'اختبار الفيزياء الفصلي', tabSwitchWarnings: 2, watchedVideosCount: 14, totalVideosCount: 18, quizAverage: '88%' },
    { id: 'std_2', name: 'سارة محمود خليل', phone: '01298765432', parentPhone: '01599887766', status: 'online', currentActivity: 'watching_video', currentVideoName: 'شرح القوانين الأساسية للميكانيكا', tabSwitchWarnings: 0, watchedVideosCount: 18, totalVideosCount: 18, quizAverage: '95%' },
  ]);

  // السطر 28: فتح شات واتساب الطالب أو ولي الأمر مباشرة
  const handleSendWhatsApp = (phoneNumber) => {
    const formattedPhone = phoneNumber.startsWith('0') ? `2${phoneNumber}` : phoneNumber;
    window.open(`https://wa.me/${formattedPhone}`, '_blank');
  };

  // السطر 34: خاصية "Log in as Student" للدخول باسم الطالب ومشاهدة حسابه
  const handleImpersonateStudent = (student) => {
    if (window.confirm(`هل أنت متأكد من الدخول كـ (تسجيل الدخول باسم) ${student.name}؟`)) {
      localStorage.setItem('impersonatedStudentId', student.id);
      window.location.href = `/student/dashboard?impersonate=${student.id}`;
    }
  };

  // السطر 42: إلغاء وإنهاء امتحان الطالب عن بعد (Remote Terminate)
  const handleRemoteTerminateExam = (studentId) => {
    if (window.confirm('هل أنت متأكد من إنهاء اختبار الطالب فوراً وتسليمه إجبارياً؟')) {
      setStudents((prev) =>
        prev.map((std) => (std.id === studentId ? { ...std, currentActivity: 'idle', tabSwitchWarnings: 3 } : std))
      );
      alert('تم إنهاء الاختبار بنجاح.');
    }
  };

  // السطر 55: عرض جدول المراقبة الحية باللغة العربية
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-4 md:p-8" dir="rtl">
      {/* جدول الطلاب وزر فتح الـ Drawer للشات والواتساب */}
      {/* (الكود بالكامل موجود بالرد السائل ومطابق بالتفصيل) */}
    </div>
  );
};
